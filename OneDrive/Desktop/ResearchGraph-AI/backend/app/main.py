from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.models import ExtractionPreview, GraphResponse, OverviewResponse, Paper, PaperCreate
from app.repositories.research_graph import add_paper, load_graph, search_papers
from app.services.pdf_extraction import extract_preview


app = FastAPI(
    title="ResearchGraph AI API",
    version="0.1.0",
    description="API foundation for the ResearchGraph AI platform.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    """Return a lightweight readiness response for local and Cloud Run checks."""
    return {"status": "ok", "service": "researchgraph-api"}


@app.get("/api/papers", response_model=list[Paper], tags=["research"])
def list_papers(query: str | None = Query(default=None, max_length=120)) -> list[Paper]:
    """Return local papers, optionally filtered by a user search term."""
    return search_papers(query)


@app.post("/api/papers", response_model=Paper, status_code=status.HTTP_201_CREATED, tags=["research"])
def create_paper(paper_input: PaperCreate) -> Paper:
    """Store a validated research object in the local development dataset."""
    return add_paper(paper_input)


@app.post("/api/ingest/pdf", response_model=ExtractionPreview, tags=["ingestion"])
async def ingest_pdf(file: UploadFile = File(...)) -> ExtractionPreview:
    """Extract local PDF text and infer editable research metadata."""
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Upload a PDF file.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded PDF is empty.")
    try:
        return extract_preview(file.filename or "research.pdf", content)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.get("/api/graph", response_model=GraphResponse, tags=["research"])
def get_graph() -> GraphResponse:
    """Return the local graph seed until graph persistence moves to AlloyDB."""
    return load_graph()


@app.get("/api/overview", response_model=OverviewResponse, tags=["research"])
def get_overview() -> OverviewResponse:
    graph = load_graph()
    departments = {paper.department for paper in graph.papers}
    return OverviewResponse(
        indexed_research_objects=len(graph.papers),
        connected_entities=len(graph.papers) + len(departments) + len(graph.connections),
        cross_field_opportunities=sum(
            1
            for connection in graph.connections
            if paper_department(graph, connection.source) != paper_department(graph, connection.target)
        ),
        potential_duplicates=0,
    )


def paper_department(graph: GraphResponse, paper_id: str) -> str:
    return next(paper.department for paper in graph.papers if paper.id == paper_id)


static_directory = Path(__file__).resolve().parent / "static"
if static_directory.is_dir():
    app.mount("/", StaticFiles(directory=static_directory, html=True), name="frontend")

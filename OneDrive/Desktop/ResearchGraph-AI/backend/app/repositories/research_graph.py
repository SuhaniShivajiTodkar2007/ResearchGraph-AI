import json
import os
from functools import lru_cache
from pathlib import Path

from app.models import GraphResponse, Paper, PaperCreate


DATA_FILE = Path(
    os.environ.get(
        "RESEARCHGRAPH_DATA_FILE",
        Path(__file__).resolve().parents[3] / "data" / "research_graph.json",
    )
)


@lru_cache
def load_graph() -> GraphResponse:
    """Load deterministic local seed data until AlloyDB is introduced."""
    with DATA_FILE.open(encoding="utf-8") as source:
        return GraphResponse.model_validate(json.load(source))


def search_papers(query: str | None = None) -> list[Paper]:
    papers = load_graph().papers
    if not query:
        return papers

    search_text = query.lower().strip()
    return [
        paper
        for paper in papers
        if search_text in " ".join(
            [paper.title, paper.department, paper.summary, *paper.authors, *paper.tags]
        ).lower()
    ]


def add_paper(paper_input: PaperCreate) -> Paper:
    """Append a local development paper and clear the in-process read cache."""
    graph = load_graph()
    existing_ids = {paper.id for paper in graph.papers}
    next_number = max((int(paper_id.split("-")[1]) for paper_id in existing_ids), default=1000) + 1
    paper = Paper(id=f"P-{next_number}", **paper_input.model_dump())

    with DATA_FILE.open(encoding="utf-8") as source:
        raw_graph = json.load(source)
    raw_graph["papers"].append(paper.model_dump())
    with DATA_FILE.open("w", encoding="utf-8") as destination:
        json.dump(raw_graph, destination, indent=2)
        destination.write("\n")

    load_graph.cache_clear()
    return paper

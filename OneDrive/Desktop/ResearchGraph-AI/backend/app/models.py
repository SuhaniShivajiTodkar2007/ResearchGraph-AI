from pydantic import BaseModel, Field


class Paper(BaseModel):
    id: str
    title: str
    department: str
    authors: list[str]
    year: int = Field(ge=1900)
    citations: int = Field(ge=0)
    tags: list[str]
    summary: str


class PaperCreate(BaseModel):
    title: str = Field(min_length=5, max_length=240)
    department: str = Field(min_length=2, max_length=120)
    authors: list[str] = Field(min_length=1)
    year: int = Field(ge=1900, le=2100)
    citations: int = Field(default=0, ge=0)
    tags: list[str] = Field(min_length=1)
    summary: str = Field(min_length=20, max_length=2000)


class ExtractionPreview(BaseModel):
    source_filename: str
    extracted_characters: int
    paper: PaperCreate


class Connection(BaseModel):
    source: str
    target: str
    label: str
    weight: int = Field(ge=1)


class Insight(BaseModel):
    title: str
    copy: str


class GraphResponse(BaseModel):
    papers: list[Paper]
    connections: list[Connection]
    insights: list[Insight]


class OverviewResponse(BaseModel):
    indexed_research_objects: int
    connected_entities: int
    cross_field_opportunities: int
    potential_duplicates: int

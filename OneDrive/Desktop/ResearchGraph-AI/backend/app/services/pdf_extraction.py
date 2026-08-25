"""Local PDF extraction for development; Vertex AI enrichment comes later."""

import re
from io import BytesIO

from pypdf import PdfReader

from app.models import ExtractionPreview, PaperCreate


TOPIC_KEYWORDS = {
    "Climate AI": ("climate", "drought", "flood", "weather"),
    "Healthcare": ("health", "clinical", "patient", "hospital"),
    "Machine learning": ("machine learning", "neural", "model", "algorithm"),
    "Privacy": ("privacy", "federated", "secure", "confidential"),
    "Knowledge graphs": ("knowledge graph", "ontology", "provenance"),
    "Accessibility": ("accessibility", "accessible", "disability", "inclusive"),
}


def extract_preview(filename: str, content: bytes) -> ExtractionPreview:
    reader = PdfReader(BytesIO(content))
    text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    if not text:
        raise ValueError("No readable text was found in this PDF.")

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    title = next((line for line in lines if 8 <= len(line) <= 180), filename.rsplit(".", 1)[0])
    author_line = next((line for line in lines[:25] if re.search(r"(?:authors?|by)\s*:", line, re.I)), "")
    authors = _authors_from_line(author_line) or ["Unspecified author"]
    lowered = text.lower()
    tags = [topic for topic, keywords in TOPIC_KEYWORDS.items() if any(word in lowered for word in keywords)]
    tags = tags[:3] or ["General research"]
    department = _department_for(tags)
    summary = _summary(text, title)

    return ExtractionPreview(
        source_filename=filename,
        extracted_characters=len(text),
        paper=PaperCreate(
            title=title,
            department=department,
            authors=authors,
            year=2026,
            tags=tags,
            summary=summary,
        ),
    )


def _authors_from_line(line: str) -> list[str]:
    if not line:
        return []
    value = re.split(r"(?:authors?|by)\s*:", line, maxsplit=1, flags=re.I)[-1]
    return [part.strip() for part in re.split(r",|;|\band\b", value) if len(part.strip()) > 2][:6]


def _department_for(tags: list[str]) -> str:
    if "Healthcare" in tags:
        return "Health Sciences"
    if "Climate AI" in tags:
        return "Earth Systems"
    if "Accessibility" in tags:
        return "Design"
    if "Knowledge graphs" in tags:
        return "Information Science"
    return "Computer Science" if "Machine learning" in tags else "Interdisciplinary Research"


def _summary(text: str, title: str) -> str:
    text_without_title = text.replace(title, "", 1).strip()
    sentences = re.split(r"(?<=[.!?])\s+", text_without_title)
    summary = " ".join(sentence.strip() for sentence in sentences if len(sentence.strip()) > 30)[:900]
    return summary if len(summary) >= 20 else "Local PDF text was extracted and is ready for researcher review."

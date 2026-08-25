import { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

function IngestResearch({ refreshWorkspace }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const extractPdf = async (event) => {
    event.preventDefault();
    if (!file) return;
    setStatus("extracting"); setMessage("");
    const body = new FormData(); body.append("file", file);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ingest/pdf`, { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail ?? "Extraction failed.");
      setPreview(payload);
      setForm({ ...payload.paper, authors: payload.paper.authors.join(", "), tags: payload.paper.tags.join(", ") });
      setStatus("review");
    } catch (error) { setStatus("error"); setMessage(error.message); }
  };

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const savePaper = async (event) => {
    event.preventDefault();
    setStatus("saving"); setMessage("");
    const payload = { ...form, year: Number(form.year), citations: 0, authors: form.authors.split(",").map((value) => value.trim()).filter(Boolean), tags: form.tags.split(",").map((value) => value.trim()).filter(Boolean) };
    try {
      const response = await fetch(`${API_BASE_URL}/api/papers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const paper = await response.json();
      if (!response.ok) throw new Error("Could not add the extracted paper.");
      await refreshWorkspace(); setStatus("saved"); setMessage(`${paper.id} was added to the local graph.`);
    } catch (error) { setStatus("error"); setMessage(error.message); }
  };

  return <>
    <section className="hero compact"><div><h2>Ingest a research PDF</h2><p>Upload a text-based PDF to extract local text and create an editable research record. No document leaves your machine.</p></div></section>
    <form className="upload-form panel" onSubmit={extractPdf}><label><span className="form-label">Research PDF</span><input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /></label><button className="primary-button" type="submit" disabled={!file || status === "extracting"}>{status === "extracting" ? "Extracting..." : "Extract PDF"}</button></form>
    {status === "error" && <div className="api-notice">{message}</div>}
    {preview && <><div className="extraction-summary"><b>Extraction complete:</b> {preview.source_filename} | {preview.extracted_characters.toLocaleString()} characters read. Review the inferred fields before saving.</div><form className="ingest-form panel" onSubmit={savePaper}><label><span className="form-label">Title</span><input required name="title" value={form.title} onChange={update} /></label><label><span className="form-label">Department</span><input required name="department" value={form.department} onChange={update} /></label><label><span className="form-label">Authors</span><input required name="authors" value={form.authors} onChange={update} /></label><label><span className="form-label">Published year</span><input required name="year" type="number" min="1900" max="2100" value={form.year} onChange={update} /></label><label className="full-width"><span className="form-label">Concept tags</span><input required name="tags" value={form.tags} onChange={update} /></label><label className="full-width"><span className="form-label">Research summary</span><textarea required name="summary" minLength="20" value={form.summary} onChange={update} /></label><div className="full-width form-actions"><button className="primary-button" type="submit" disabled={status === "saving" || status === "saved"}>{status === "saving" ? "Adding to graph..." : status === "saved" ? "Added to graph" : "Add extracted paper to graph"}</button>{status === "saved" && <span className="success-message">{message}</span>}</div></form></>}
  </>;
}

export default IngestResearch;

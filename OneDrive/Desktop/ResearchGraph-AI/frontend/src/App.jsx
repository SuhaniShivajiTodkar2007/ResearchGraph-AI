import { useEffect, useState } from "react";
import IngestResearch from "./IngestResearch";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";
const colors = ["green", "blue", "orange", "purple", "teal"];
const graphPositions = { "P-1042": [135, 98], "P-1038": [354, 74], "P-1027": [576, 119], "P-1019": [342, 250], "P-1006": [574, 226] };
const emptyGraph = { papers: [], connections: [], insights: [] };

function App() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [graph, setGraph] = useState(emptyGraph);
  const [overview, setOverview] = useState(null);
  const [status, setStatus] = useState("loading");

  const refreshWorkspace = async () => {
    try {
      const [graphResponse, overviewResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/graph`), fetch(`${API_BASE_URL}/api/overview`),
      ]);
      if (!graphResponse.ok || !overviewResponse.ok) throw new Error("Workspace request failed");
      setGraph(await graphResponse.json());
      setOverview(await overviewResponse.json());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => { refreshWorkspace(); }, []);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-mark">RG</div>
      <div className="brand-name">ResearchGraph<span>AI</span></div>
      <p className="brand-copy">Academic citation and knowledge graph engine</p>
      <nav aria-label="Main navigation">
        {["Overview", "Graph Explorer", "Discovery Studio", "Ingest Research"].map((item) => <button className={activeTab === item ? "nav-item active" : "nav-item"} key={item} onClick={() => setActiveTab(item)}>{item}</button>)}
      </nav>
      <div className="sidebar-footer"><span className="live-dot" /> Local workspace<br />Riverton University</div>
    </aside>
    <main>
      <header className="topbar"><div><span className="eyebrow">Knowledge graph workspace</span><h1>{activeTab}</h1></div><button className="primary-button" onClick={() => setActiveTab("Ingest Research")}>+ Ingest research</button></header>
      {status === "error" && <div className="api-notice">The API is unavailable. Start the FastAPI server on port 8000, then refresh this page.</div>}
      {activeTab === "Overview" && <Overview graph={graph} overview={overview} setActiveTab={setActiveTab} />}
      {activeTab === "Graph Explorer" && <GraphExplorer graph={graph} />}
      {activeTab === "Discovery Studio" && <DiscoveryStudio />}
      {activeTab === "Ingest Research" && <IngestResearch refreshWorkspace={refreshWorkspace} />}
    </main>
  </div>;
}

function Overview({ graph, overview, setActiveTab }) {
  return <>
    <section className="hero"><div><h2>See the research your university is missing.</h2><p>ResearchGraph AI links papers, datasets, and people so teams can uncover collaborators, duplicated effort, and evidence across departments.</p></div><button className="secondary-button" onClick={() => setActiveTab("Discovery Studio")}>Search research</button></section>
    <section className="metrics"><Metric value={overview?.indexed_research_objects} label="Indexed research objects" note="local development data" /><Metric value={overview?.connected_entities} label="Connected entities" note="papers, departments, links" /><Metric value={overview?.cross_field_opportunities} label="Cross-field opportunities" note="from local graph links" /><Metric value={overview?.potential_duplicates} label="Potential duplicates" note="awaiting analysis" /></section>
    <section className="workspace"><div className="graph-panel panel"><div className="panel-heading"><div><span className="eyebrow">Local graph</span><h3>Research relationship map</h3></div><button className="text-button" onClick={() => setActiveTab("Graph Explorer")}>Explore graph</button></div><Graph papers={graph.papers} connections={graph.connections} /><p className="caption">Each edge is a local relationship. Cloud services are not connected yet.</p></div><div className="insights panel"><span className="eyebrow">Discovery queue</span><h3>Highest-signal connections</h3>{graph.insights.map((insight) => <Insight {...insight} key={insight.title} />)}</div></section>
    <ResearchCards papers={graph.papers.slice(0, 4)} title="Recently indexed research" />
  </>;
}

function GraphExplorer({ graph }) {
  const [department, setDepartment] = useState("All departments");
  const departments = ["All departments", ...new Set(graph.papers.map((paper) => paper.department))];
  const papers = department === "All departments" ? graph.papers : graph.papers.filter((paper) => paper.department === department);
  const ids = new Set(papers.map((paper) => paper.id));
  const connections = graph.connections.filter((connection) => ids.has(connection.source) && ids.has(connection.target));
  return <><section className="hero compact"><div><h2>Explore relationships</h2><p>Filter the local graph by department and inspect the research objects behind each connection.</p></div><label className="select-control"><span>Department</span><select value={department} onChange={(event) => setDepartment(event.target.value)}>{departments.map((item) => <option key={item}>{item}</option>)}</select></label></section><section className="panel"><Graph papers={papers} connections={connections} /><p className="caption">{papers.length} papers and {connections.length} direct relationships visible.</p></section><ResearchCards papers={papers} title="Visible research objects" /></>;
}

function DiscoveryStudio() {
  const [term, setTerm] = useState("");
  const [submittedTerm, setSubmittedTerm] = useState("");
  const [papers, setPapers] = useState([]);
  const [resultStatus, setResultStatus] = useState("idle");
  const search = async (event) => {
    event.preventDefault();
    setResultStatus("loading");
    try {
      const response = await fetch(`${API_BASE_URL}/api/papers?query=${encodeURIComponent(term)}`);
      if (!response.ok) throw new Error("Search failed");
      setPapers(await response.json()); setSubmittedTerm(term); setResultStatus("ready");
    } catch { setResultStatus("error"); }
  };
  return <><section className="hero compact"><div><h2>Discovery Studio</h2><p>Search titles, departments, authors, descriptions, and local concept tags.</p></div></section><form className="search-form panel" onSubmit={search}><label><span className="form-label">Research query</span><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="e.g. climate, healthcare, Maya Chen" /></label><button className="primary-button" type="submit">Run search</button></form>{resultStatus === "loading" && <p className="muted-copy">Searching local research...</p>}{resultStatus === "error" && <div className="api-notice">Search could not reach the local API.</div>}{resultStatus === "ready" && <ResearchCards papers={papers} title={`Results for "${submittedTerm}"`} />}{resultStatus === "ready" && !papers.length && <p className="empty-state">No local research matches that search.</p>}</>;
}

function LegacyIngestResearch({ refreshWorkspace }) {
  const [form, setForm] = useState({ title: "", department: "", authors: "", year: new Date().getFullYear(), tags: "", summary: "" });
  const [submitStatus, setSubmitStatus] = useState("idle");
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault(); setSubmitStatus("loading");
    const payload = { ...form, year: Number(form.year), citations: 0, authors: form.authors.split(",").map((item) => item.trim()).filter(Boolean), tags: form.tags.split(",").map((item) => item.trim()).filter(Boolean) };
    try {
      const response = await fetch(`${API_BASE_URL}/api/papers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("Ingest failed");
      const paper = await response.json(); await refreshWorkspace(); setForm({ title: "", department: "", authors: "", year: new Date().getFullYear(), tags: "", summary: "" }); setSubmitStatus(`created:${paper.id}`);
    } catch { setSubmitStatus("error"); }
  };
  return <><section className="hero compact"><div><h2>Ingest local research</h2><p>Add a research object to the development dataset. It appears immediately in Overview and Graph Explorer.</p></div></section><form className="ingest-form panel" onSubmit={submit}><label><span className="form-label">Title</span><input required name="title" value={form.title} onChange={update} /></label><label><span className="form-label">Department</span><input required name="department" value={form.department} onChange={update} /></label><label><span className="form-label">Authors</span><input required name="authors" value={form.authors} onChange={update} placeholder="Dr. Name, Dr. Name" /></label><label><span className="form-label">Published year</span><input required name="year" type="number" min="1900" max="2100" value={form.year} onChange={update} /></label><label className="full-width"><span className="form-label">Concept tags</span><input required name="tags" value={form.tags} onChange={update} placeholder="Climate AI, Remote sensing" /></label><label className="full-width"><span className="form-label">Research summary</span><textarea required name="summary" minLength="20" value={form.summary} onChange={update} /></label><div className="full-width form-actions"><button className="primary-button" type="submit" disabled={submitStatus === "loading"}>{submitStatus === "loading" ? "Adding research..." : "Add to local graph"}</button>{submitStatus.startsWith("created:") && <span className="success-message">Added {submitStatus.split(":")[1]} to the local dataset.</span>}{submitStatus === "error" && <span className="error-message">Could not add this research object. Check every field and the API server.</span>}</div></form></>;
}

function ResearchCards({ papers, title }) { return <section className="recent"><div className="section-heading"><div><span className="eyebrow">Knowledge objects</span><h3>{title}</h3></div><span>{papers.length} results</span></div><div className="paper-grid">{papers.map((paper, index) => <PaperCard paper={paper} color={colors[index % colors.length]} key={paper.id} />)}</div></section>; }
function Metric({ value, label, note }) { return <article className="metric-card"><strong>{value ?? "-"}</strong><span>{label}</span><small>{note}</small></article>; }
function Insight({ title, copy }) { return <article className="insight"><b>{title}</b><p>{copy}</p></article>; }
function PaperCard({ paper, color }) { return <article className="paper-card"><div className={`paper-id ${color}`}>{paper.id}</div><div><h4>{paper.title}</h4><p>{paper.department} | {paper.year} | {paper.citations} citations</p><div>{paper.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div></div></article>; }
function Graph({ papers, connections }) { return <div className="graph" aria-label="Research relationship graph"><svg viewBox="0 0 720 330" role="img">{connections.map((connection) => { const [x1, y1] = graphPositions[connection.source] ?? [360, 165]; const [x2, y2] = graphPositions[connection.target] ?? [360, 165]; return <g key={`${connection.source}-${connection.target}`}><line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={connection.weight} /><text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6}>{connection.label}</text></g>; })}{papers.map((paper, index) => { const [x, y] = graphPositions[paper.id] ?? [360 + ((index % 3) - 1) * 80, 165 + (index % 2) * 76]; return <Node key={paper.id} x={x} y={y} name={paper.department.split(" ")[0]} color={nodeColor(index)} />; })}</svg></div>; }
function nodeColor(index) { return ["#37a875", "#467bdc", "#ef9b57", "#b66be4", "#36aeb2"][index % 5]; }
function Node({ x, y, name, color }) { return <g><circle cx={x} cy={y} r="35" fill={color}/><circle cx={x} cy={y} r="43" fill="none" stroke={color} opacity=".16" strokeWidth="9"/><text x={x} y={y + 4} textAnchor="middle" fill="white">{name}</text></g>; }

export default App;

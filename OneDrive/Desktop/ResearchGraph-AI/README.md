# ResearchGraph AI

ResearchGraph AI is a local development skeleton for an academic citation and knowledge graph platform. The application helps universities surface cross-disciplinary work, identify research connections, and make institutional knowledge easier to explore.

## Structure

```text
researchgraph-ai/
|- frontend/        React + Vite dashboard
|- backend/         FastAPI API and service boundaries
|- data/            Local development data
|- README.md
`- .gitignore
```

## Local development

### Frontend

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

The Vite application runs at `http://localhost:5173`.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

The health endpoint is available at `http://127.0.0.1:8000/health`.

## Current local API

- `GET /health` checks that the backend is available.
- `GET /api/overview` returns computed workspace metrics.
- `GET /api/papers?query=<term>` returns research objects from `data/research_graph.json`.
- `GET /api/graph` returns papers, relationships, and discovery insights for the dashboard.

The frontend reads these endpoints directly during local development. The JSON repository is a temporary development adapter; it will be replaced by AlloyDB when database integration begins.

## Planned cloud services

- `backend/app/services/vertex_ai.py` defines the future Vertex AI integration boundary.
- `backend/app/services/alloydb.py` defines the future AlloyDB integration boundary.

Neither service currently connects to Google Cloud. Cloud Run deployment configuration will be added when the production integrations are implemented.

## Cloud Run demo deployment

The included `Dockerfile` builds the React frontend and serves it through FastAPI, so Cloud Run exposes one public URL for both the UI and API.

```powershell
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud run deploy researchgraph-ai --source . --region asia-south1 --allow-unauthenticated
```

The current local JSON dataset is stored in the container filesystem. New research records are therefore temporary in a Cloud Run demo deployment; AlloyDB must replace the JSON repository before using this for persistent data.

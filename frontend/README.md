# Frontend

Single-page React app built with Vite. It lets a user ask questions, see the answer with its sources, and upload their own PDFs.

## Features

- Question input with sample question buttons.
- Answer panel with a list of collapsible sources/evidence.
- Loading and error states.
- PDF upload section for adding documents to the index.

## Project layout

```
frontend/
├── src/
│   ├── main.jsx        app entry point
│   ├── App.jsx         main UI
│   └── styles.css      styles
├── index.html
├── package.json
├── vite.config.js
├── nginx.conf          used only in the Docker image
└── Dockerfile
```

## Run locally

Prerequisite: Node.js 18 or newer.

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at http://localhost:5173. It proxies `/api/*` requests to the backend at http://localhost:8000, so the backend must be running first (see `backend/README.md`).

## Scripts

| Script         | Description                              |
|----------------|------------------------------------------|
| `npm run dev`  | Start the dev server with hot reload     |
| `npm run build`| Build a production bundle into `dist/`   |
| `npm run preview` | Serve the production build locally   |

## Run with Docker

The Dockerfile builds the app and serves it with nginx. The nginx config proxies `/api/*` to the backend service.

```bash
docker build -t rag-frontend .
docker run --rm -p 5173:80 rag-frontend
```

In the Docker setup, requests to `/api/...` are forwarded to the backend container. The backend must be reachable at the hostname `backend` on port 8000 (this is the default inside `docker-compose.yml`).

## How the UI talks to the API

- Asking a question: `POST /api/query` with `{"question": "..."}`.
- Uploading PDFs: `POST /api/ingest` with a multipart form containing one or more files under the field name `files`.

The Vite dev server rewrites `/api/...` to the backend without the `/api` prefix.
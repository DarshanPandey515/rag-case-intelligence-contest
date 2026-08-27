# Backend

FastAPI application that powers the RAG pipeline. It handles question answering (`/query`), PDF ingestion (`/ingest`), and health checks (`/health`).

## Stack

- FastAPI (API layer)
- LlamaIndex (chunking, indexing, retrieval)
- Pydantic AI (LLM agent with structured output)
- Qdrant (vector database with native hybrid search)
- Groq (LLM)
- FastEmbed (local embeddings)
- pymupdf (PDF text extraction)

## Project layout

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py        FastAPI routes
│   ├── rag.py         indexing and retrieval
│   ├── agent.py       Pydantic AI agent
│   ├── schemas.py     Pydantic models
│   └── config.py      environment configuration
├── data/
│   ├── documents/     reference documents (seeded on first start)
│   └── transcripts/   client transcripts (seeded on first start)
├── requirements.txt
├── Dockerfile
└── .dockerignore
```

## Run locally

Prerequisite: Python 3.10 or newer.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the project root (one level up from `backend/`):

```dotenv
GROQ_API_KEY=your_groq_api_key
QDRANT_URL=https://your-cluster.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
```

Start the server:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The API is at http://localhost:8000 and the Swagger docs at http://localhost:8000/docs.

## Run with Docker

```bash
docker build -t rag-backend .
docker run --rm -p 8000:8000 --env-file ../.env rag-backend
```

## Environment variables

| Variable              | Default                  | Description |
|-----------------------|--------------------------|-------------|
| `GROQ_API_KEY`        | (required)               | Groq API key |
| `GROQ_MODEL`          | `openai/gpt-oss-120b`    | LLM used for answers |
| `QDRANT_URL`          | `http://localhost:6333`  | Qdrant endpoint |
| `QDRANT_API_KEY`      | (empty)                  | Qdrant key |
| `QDRANT_COLLECTION`   | `case_intelligence`      | Qdrant collection name |
| `EMBED_MODEL`         | `BAAI/bge-small-en-v1.5` | Dense embedding model |
| `SPARSE_EMBED_MODEL`  | `Qdrant/bm25`            | Sparse embedding model |
| `TOP_K`               | `6`                      | Chunks sent to the LLM |
| `CHUNK_SIZE`          | `800`                    | Chunk size in tokens |
| `CHUNK_OVERLAP`       | `100`                    | Chunk overlap in tokens |
| `DOCS_DIR`            | `backend/data/documents` | Where reference PDFs live |
| `TRANSCRIPTS_DIR`     | `backend/data/transcripts` | Where transcript PDFs live |

## Endpoints

### POST /query

Ask a question. The backend retrieves the most relevant chunks from Qdrant and generates an answer with the Groq LLM.

Request:

```json
{ "question": "Did the case manager follow the check-in guidelines?" }
```

Response:

```json
{
  "answer": "...",
  "sources": [
    {
      "file": "check-in-guidelines.pdf",
      "doc_type": "document",
      "snippet": "...",
      "score": 0.75
    }
  ],
  "model": "openai/gpt-oss-120b"
}
```

### POST /ingest

Upload one or more PDFs. They are parsed, chunked, embedded, and added to the same Qdrant collection, so they are searchable right away.

```bash
curl -X POST http://localhost:8000/ingest \
  -F "files=@policy.pdf" \
  -F "doc_type=document"
```

Response:

```json
{
  "filename": "policy.pdf",
  "doc_type": "document",
  "chunks_added": 12,
  "total_chunks": 82
}
```

### GET /health

Returns service status, number of indexed chunks, and the active model names.

## How seeding works

On startup, if the Qdrant collection is empty, the backend parses every PDF in `data/documents/` and `data/transcripts/`, chunks it, embeds it, and stores it in Qdrant. Uploaded files are stored in the same collection and are never re-seeded.
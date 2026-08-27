# Case Intelligence RAG

A single-page web app that answers questions about client meeting transcripts and reference documents (policies, standards, guidelines) using a real retrieval-augmented generation (RAG) pipeline.

The backend runs FastAPI with LlamaIndex and Pydantic AI, stores embeddings in Qdrant, and uses Groq for the LLM. The frontend is a React single-page app built with Vite.

## What it does

- Answers open-ended questions like "What is Nathan's relationship with his family like?" or "Did the case manager follow the check-in guidelines?"
- Retrieves the right information first, then sends only that context to the LLM (no dumping everything into the prompt).
- Supports questions that need one document, one transcript, multiple documents, or a mix of transcripts and documents.
- Shows the sources (filenames) used to produce each answer.
- Lets you upload your own PDFs from the UI; they become searchable immediately.

## Tech stack

| Layer       | Technology |
|-------------|------------|
| Backend     | FastAPI, LlamaIndex, Pydantic AI, pymupdf |
| Vector DB   | Qdrant (native hybrid search: dense + sparse) |
| LLM         | Groq (default model: `openai/gpt-oss-120b`) |
| Embeddings  | FastEmbed (local, no API key) |
| Frontend    | React 18, Vite |
| Deployment  | Docker Compose |

## Project structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py        FastAPI app (query + upload endpoints)
│   │   ├── rag.py         indexing and retrieval with LlamaIndex + Qdrant
│   │   ├── agent.py       Pydantic AI agent (Groq) -> answer + sources
│   │   ├── schemas.py     request/response models
│   │   └── config.py      settings from environment variables
│   ├── data/
│   │   ├── documents/     reference documents
│   │   └── transcripts/   client transcripts
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/               React app
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── .env.example
```

The provided PDFs are included in `backend/data/` and are indexed into Qdrant automatically on first start. Uploaded PDFs are added to the same collection.

## How the RAG pipeline works

1. PDFs are parsed with pymupdf and split into chunks with LlamaIndex `SentenceSplitter` (800 tokens, 100 token overlap).
2. Each chunk is embedded twice: a dense vector (FastEmbed `BAAI/bge-small-en-v1.5`) and a sparse BM25 vector (`Qdrant/bm25`). Both run locally.
3. Chunks are stored in Qdrant. Each chunk carries metadata: source filename, document type, and person (Robert/Nathan) when it applies.
4. When a question arrives, Qdrant runs native hybrid search (dense + sparse fused together) and returns the top-k chunks.
5. The retrieved chunks are sent to the Pydantic AI agent, which runs on Groq and is instructed to answer only from that context. It returns structured output: an answer plus the list of source filenames it actually used.
6. The frontend shows the answer and the collapsible sources/evidence.

## Quick start with Docker Compose

Prerequisites: Docker and Docker Compose.

1. Clone the repository and enter it.

```bash
git clone <your-repo-url>
cd rag-contest
```

2. Create your environment file.

```bash
cp .env.example .env
```

3. Edit `.env` and add your keys.

```dotenv
GROQ_API_KEY=your_groq_api_key
QDRANT_URL=https://your-cluster.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
```

Get a Groq key at https://console.groq.com/keys and a Qdrant cluster at https://cloud.qdrant.io. If you have a local Qdrant running, use `QDRANT_URL=http://localhost:6333` and leave `QDRANT_API_KEY` empty.

4. Start the app.

```bash
docker compose up --build
```

5. Open the app.

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000 (Swagger docs at http://localhost:8000/docs)

On the first start the backend downloads the embedding models from Hugging Face and seeds the provided PDFs into Qdrant. This can take a minute. Subsequent starts are faster.

## Run without Docker

You need Python 3.10+ and Node.js 18+.

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env      # then fill in the keys
uvicorn app.main:app --port 8000
```

Frontend (in a second terminal):

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs on http://localhost:5173 and proxies `/api/*` calls to http://localhost:8000.

## API

| Method | Path      | Description |
|--------|-----------|-------------|
| POST   | `/query`  | Ask a question. Body: `{"question": "..."}`. Returns `{answer, sources}`. |
| POST   | `/ingest` | Upload one or more PDFs (multipart field `files`). |
| GET    | `/health` | Service status and index size. |

Example:

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is Nathan\u2019s relationship with his family like?"}'
```

## Configuration

All settings are environment variables. See `.env.example` for the full list.

| Variable              | Default                             | Description |
|-----------------------|-------------------------------------|-------------|
| `GROQ_API_KEY`        | (required)                          | Groq API key |
| `QDRANT_URL`          | `http://localhost:6333`             | Qdrant endpoint |
| `QDRANT_API_KEY`      | (empty)                             | Qdrant key, empty for local Qdrant |
| `QDRANT_COLLECTION`   | `case_intelligence`                 | Qdrant collection name |
| `GROQ_MODEL`          | `openai/gpt-oss-120b`               | LLM used for answers |
| `EMBED_MODEL`         | `BAAI/bge-small-en-v1.5`            | Dense embedding model |
| `SPARSE_EMBED_MODEL`  | `Qdrant/bm25`                       | Sparse (keyword) embedding model |
| `TOP_K`               | `6`                                 | Number of chunks sent to the LLM |
| `CHUNK_SIZE`          | `800`                               | Chunk size in tokens |
| `CHUNK_OVERLAP`       | `100`                               | Chunk overlap in tokens |

## Notes

- Embedding models are downloaded from Hugging Face on first use and cached locally. They do not require an API key.
- The app reads `GROQ_API_KEY`, `QDRANT_URL`, and `QDRANT_API_KEY` from a `.env` file in the project root. That file is gitignored, so your keys are never committed.

## More documentation

- Backend setup and endpoints: `backend/README.md`
- Frontend setup and scripts: `frontend/README.md`
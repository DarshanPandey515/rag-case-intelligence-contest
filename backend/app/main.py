from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from . import agent, config, rag
from .schemas import HealthResponse, IngestResponse, QueryRequest, QueryResponse, Source

app = FastAPI(title="Case Intelligence RAG", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"app": "Case Intelligence RAG", "docs": "/docs"}


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        index_size=rag.engine._count(),
        model=config.GROQ_MODEL,
        embedding_model=config.EMBED_MODEL,
    )


@app.post("/ingest", response_model=IngestResponse)
async def ingest(
    files: list[UploadFile] = File(...),
    doc_type: str = Form("document"),
) -> IngestResponse:
    total_chunks = 0
    ingested: list[str] = []
    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400, detail=f"{file.filename} is not a PDF"
            )
        contents = await file.read()
        if not contents:
            raise HTTPException(
                status_code=400, detail=f"{file.filename} is empty"
            )
        try:
            total_chunks += rag.engine.ingest_pdf(contents, file.filename, doc_type)
            ingested.append(file.filename)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not ingested:
        raise HTTPException(status_code=400, detail="No files were ingested")
    return IngestResponse(
        filename=", ".join(ingested),
        doc_type=doc_type,
        chunks_added=total_chunks,
        total_chunks=rag.engine._count(),
    )


@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest) -> QueryResponse:
    try:
        nodes = rag.engine.retrieve(req.question)
        if not nodes:
            return QueryResponse(
                answer="No relevant context was found in the indexed documents.",
                sources=[],
                model=config.GROQ_MODEL,
            )
        result = await agent.agent.answer(req.question, nodes)
        source_infos = rag.engine.sources_for(nodes)
        used = set(result.sources)
        sources = [Source(**info) for info in source_infos if info["file"] in used]
        if not sources:
            sources = [Source(**info) for info in source_infos]
        return QueryResponse(answer=result.answer, sources=sources, model=config.GROQ_MODEL)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Query failed: {exc}") from exc
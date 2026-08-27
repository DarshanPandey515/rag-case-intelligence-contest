from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1)


class Source(BaseModel):
    file: str
    doc_type: str
    snippet: str = ""
    score: float = 0.0


class QueryResponse(BaseModel):
    answer: str
    sources: list[Source] = Field(default_factory=list)
    model: str = ""
    error: str | None = None


class HealthResponse(BaseModel):
    status: str
    index_size: int
    model: str
    embedding_model: str


class IngestResponse(BaseModel):
    filename: str
    doc_type: str
    chunks_added: int
    total_chunks: int
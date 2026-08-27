import os

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)

DOCS_DIR = os.environ.get("DOCS_DIR", os.path.join(PROJECT_DIR, "data", "documents"))
TRANSCRIPTS_DIR = os.environ.get(
    "TRANSCRIPTS_DIR", os.path.join(PROJECT_DIR, "data", "transcripts")
)

QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333") or "http://localhost:6333"
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")
QDRANT_COLLECTION = os.environ.get("QDRANT_COLLECTION", "case_intelligence")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

EMBED_MODEL = os.environ.get("EMBED_MODEL", "BAAI/bge-small-en-v1.5")
SPARSE_EMBED_MODEL = os.environ.get("SPARSE_EMBED_MODEL", "Qdrant/bm25")

TOP_K = int(os.environ.get("TOP_K", "6"))
CHUNK_SIZE = int(os.environ.get("CHUNK_SIZE", "800"))
CHUNK_OVERLAP = int(os.environ.get("CHUNK_OVERLAP", "100"))
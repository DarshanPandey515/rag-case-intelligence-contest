import glob
import os

import fitz
from llama_index.core import Document, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.schema import NodeWithScore
from llama_index.core.vector_stores.types import VectorStoreQueryMode
from llama_index.embeddings.fastembed import FastEmbedEmbedding
from llama_index.vector_stores.qdrant import QdrantVectorStore
from qdrant_client import QdrantClient

from . import config


class RAGEngine:
    def __init__(self) -> None:
        self.embed_model = FastEmbedEmbedding(model_name=config.EMBED_MODEL)
        self.splitter = SentenceSplitter(
            chunk_size=config.CHUNK_SIZE,
            chunk_overlap=config.CHUNK_OVERLAP,
        )
        self.client = QdrantClient(
            url=config.QDRANT_URL,
            api_key=config.QDRANT_API_KEY or None,
        )
        self.vector_store = QdrantVectorStore(
            collection_name=config.QDRANT_COLLECTION,
            client=self.client,
            enable_hybrid=True,
            fastembed_sparse_model=config.SPARSE_EMBED_MODEL,
            batch_size=32,
        )
        self.index = VectorStoreIndex.from_vector_store(
            self.vector_store, embed_model=self.embed_model
        )
        self.retriever = self.index.as_retriever(
            similarity_top_k=config.TOP_K,
            vector_store_query_mode=VectorStoreQueryMode.HYBRID,
        )
        self._seed_builtin_data()

    def _seed_builtin_data(self) -> None:
        if self._count() > 0:
            return
        documents = self._parse_pdfs(
            [(config.DOCS_DIR, "document"), (config.TRANSCRIPTS_DIR, "transcript")]
        )
        self.ingest_documents(documents)

    def ingest_documents(self, documents: list[Document]) -> int:
        nodes = self.splitter.get_nodes_from_documents(documents)
        if not nodes:
            return 0
        self.index.insert_nodes(nodes)
        return len(nodes)

    def ingest_pdf(self, pdf_bytes: bytes, filename: str, doc_type: str = "document") -> int:
        pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = "\n".join(page.get_text() for page in pdf)
        pdf.close()
        if not text.strip():
            raise ValueError(f"{filename} contains no extractable text")
        document = Document(
            text=text.strip(),
            metadata={
                "source": filename,
                "doc_type": doc_type,
                "person": self._person_from_name(filename),
            },
        )
        return self.ingest_documents([document])

    def _parse_pdfs(self, dirs: list[tuple[str, str]]) -> list[Document]:
        documents: list[Document] = []
        for directory, doc_type in dirs:
            for path in sorted(glob.glob(os.path.join(directory, "*.pdf"))):
                pdf = fitz.open(path)
                text = "\n".join(page.get_text() for page in pdf)
                pdf.close()
                source = os.path.basename(path)
                documents.append(
                    Document(
                        text=text.strip(),
                        metadata={
                            "source": source,
                            "doc_type": doc_type,
                            "person": self._person_from_name(source),
                        },
                    )
                )
        return documents

    @staticmethod
    def _person_from_name(source: str) -> str:
        lower = source.lower()
        if lower.startswith("robert"):
            return "Robert"
        if lower.startswith("nathan"):
            return "Nathan"
        return ""

    def retrieve(self, query: str, top_k: int | None = None) -> list[NodeWithScore]:
        top_k = top_k or config.TOP_K
        results = self.retriever.retrieve(query)
        return self._dedupe(results)[:top_k]

    @staticmethod
    def _dedupe(nodes: list[NodeWithScore]) -> list[NodeWithScore]:
        seen: set[str] = set()
        unique: list[NodeWithScore] = []
        for node in nodes:
            key = node.node.text.strip()
            if key not in seen:
                seen.add(key)
                unique.append(node)
        return unique

    def sources_for(self, nodes: list[NodeWithScore]) -> list[dict]:
        seen: dict[str, dict] = {}
        for node in nodes:
            meta = node.node.metadata
            source = meta.get("source", "unknown")
            if source not in seen:
                seen[source] = {
                    "file": source,
                    "doc_type": meta.get("doc_type", ""),
                    "snippet": node.node.text[:500],
                    "score": round(float(node.score or 0.0), 3),
                }
        return list(seen.values())

    def _count(self) -> int:
        try:
            return self.client.count(
                collection_name=config.QDRANT_COLLECTION, exact=True
            ).count
        except Exception:
            return 0


engine = RAGEngine()
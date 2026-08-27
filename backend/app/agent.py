from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.models.groq import GroqModel

from . import config


class AnswerResult(BaseModel):
    answer: str = Field(description="Direct answer to the user's question")
    sources: list[str] = Field(
        description="Filenames of the sources/evidence actually used, exactly as given"
    )


SYSTEM_PROMPT = """You are a precise case-intelligence analyst for a community corrections office.
Answer the user's question using ONLY the retrieved context below. The context contains
client meeting transcripts and reference documents (policies, standards, guidelines).

Rules:
- Ground every claim in the retrieved context. Do not invent facts or use outside knowledge.
- If the context does not contain enough information to answer, say so clearly and state
  what additional information would be needed.
- When a question asks whether a guideline/principle/standard was followed, explicitly
  compare the transcript evidence against the relevant document requirements.
- For theme/summary questions, synthesize across the provided excerpts.
- Keep the answer concise but complete. Use bullet points where helpful.
- In `sources`, list every source filename you actually relied on. Use ONLY the
  exact filenames provided in the context's [Source] markers.
"""


def _build_context(nodes) -> str:
    blocks = []
    for node in nodes:
        meta = node.node.metadata
        source = meta.get("source", "unknown")
        snippet = node.node.text.strip()
        blocks.append(f"[Source: {source}]\n{snippet}")
    return "\n\n---\n\n".join(blocks)


class RagAgent:
    def __init__(self) -> None:
        self._agent: Agent | None = None

    def _get_agent(self) -> Agent:
        if self._agent is None:
            if not config.GROQ_API_KEY:
                raise RuntimeError(
                    "GROQ_API_KEY is not set. Add it to your .env file and restart."
                )
            model = GroqModel(config.GROQ_MODEL)
            self._agent = Agent(
                model,
                system_prompt=SYSTEM_PROMPT,
                output_type=AnswerResult,
                model_settings={"temperature": 0.2, "max_tokens": 1500},
            )
        return self._agent

    async def answer(self, query: str, nodes) -> AnswerResult:
        context = _build_context(nodes)
        prompt = (
            "Retrieved context:\n"
            f"{context}\n\n"
            f"Question: {query}\n\n"
            "Answer the question using only the context above."
        )
        result = await self._get_agent().run(prompt)
        return result.output


agent = RagAgent()
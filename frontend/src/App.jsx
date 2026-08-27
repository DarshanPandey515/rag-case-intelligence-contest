import { useEffect, useRef, useState } from "react";

const SAMPLE_QUESTIONS = [
  "Did the case manager follow all of the check-in guidelines in the last meeting?",
  "What are some key themes that Robert talks about?",
  "What things seem to be important to Robert?",
  "When should a client submit a grievance?",
  "Did the case manager use the 2nd principle of effective intervention in their last meeting?",
  "What do you think are the client's biggest risks/needs?",
  "What is Nathan's relationship with his family like?",
];

const PIPELINE_STEPS = [
  { label: "Searching transcripts & documents" },
  { label: "Ranking relevant evidence" },
  { label: "Writing the answer" },
];

function Typewriter({ text, onDone }) {
  const [count, setCount] = useState(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    setCount(0);
    finishedRef.current = false;
    if (!text) return;
    const total = text.length;
    const step = Math.max(1, Math.ceil(total / 500));
    const id = setInterval(() => {
      setCount((c) => Math.min(total, c + step));
    }, 10);
    return () => clearInterval(id);
  }, [text]);

  useEffect(() => {
    if (!finishedRef.current && text && count >= text.length) {
      finishedRef.current = true;
      onDone?.();
    }
  }, [count, text, onDone]);

  return (
    <span className="whitespace-pre-wrap break-words text-[15px] leading-7 text-neutral-800">
      {text.slice(0, count)}
      {count < text.length && (
        <span className="typewriter-cursor ml-0.5 inline-block font-mono text-neutral-900">
          |
        </span>
      )}
    </span>
  );
}

function Pipeline({ complete }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [1000, 2300, 3600].map((t, i) =>
      setTimeout(() => setStep(i + 1), t)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (complete) setStep(PIPELINE_STEPS.length);
  }, [complete]);

  return (
    <div className="animate-fade-in-up mt-5 rounded-xl border border-neutral-200 bg-white p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
        Pipeline
      </p>
      <div className="space-y-2.5">
        {PIPELINE_STEPS.map((s, i) => {
          const done = step > i;
          const active = step === i && !complete;
          return (
            <div key={s.label} className="flex items-center gap-3">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                  done
                    ? "border-black bg-black text-white"
                    : active
                      ? "border-neutral-300"
                      : "border-neutral-200"
                }`}
              >
                {done ? (
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 6.5 4.5 9 10 3" />
                  </svg>
                ) : active ? (
                  <span className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-neutral-300 border-t-black" />
                ) : (
                  <span className="h-1 w-1 rounded-full bg-neutral-200" />
                )}
              </span>
              <span
                className={`text-sm transition-colors duration-300 ${
                  done
                    ? "font-medium text-neutral-900"
                    : active
                      ? "font-medium text-black"
                      : "text-neutral-400"
                }`}
              >
                {s.label}
              </span>
              {active && (
                <span className="pipeline-dot ml-auto flex gap-1">
                  <span className="h-1 w-1 rounded-full bg-neutral-400" />
                  <span className="h-1 w-1 rounded-full bg-neutral-400" style={{ animationDelay: "0.2s" }} />
                  <span className="h-1 w-1 rounded-full bg-neutral-400" style={{ animationDelay: "0.4s" }} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SourceCard({ source, index, show }) {
  return (
    <details
      className={`group rounded-lg border border-neutral-200 bg-white transition-all duration-300 hover:border-neutral-400 ${
        show ? "animate-fade-in-up" : "opacity-0"
      }`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-2.5 select-none [&::-webkit-details-marker]:hidden">
        <svg
          className="h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform duration-200 group-open:rotate-90"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 2.5 8.5 6 4 9.5" />
        </svg>
        <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-medium text-neutral-900">
          {source.file}
        </span>
        <span className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
          {source.doc_type}
        </span>
        <span className="text-[10px] tabular-nums text-neutral-400">
          {source.score.toFixed(2)}
        </span>
      </summary>
      <div className="border-t border-neutral-100 px-4 py-3">
        <p className="whitespace-pre-wrap text-[12.5px] leading-5 text-neutral-500">
          {source.snippet}
        </p>
      </div>
    </details>
  );
}

function App() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [writing, setWriting] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileInput = useRef(null);

  async function submit(q) {
    const query = (q ?? question).trim();
    if (!query || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    setShowSources(false);
    setWriting(false);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setResult(data);
      setLoading(false);
      setWriting(true);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  function handleAnswerDone() {
    setWriting(false);
    setShowSources(true);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (files.length === 0 || uploading) return;
    setUploading(true);
    setUploadMsg("");
    setUploadError("");
    try {
      const formData = new FormData();
      for (const f of files) formData.append("files", f);
      const res = await fetch("/api/ingest", { method: "POST", body: formData });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || `Upload failed (${res.status})`);
      setUploadMsg(
        `${files.length} file(s) added · ${body.chunks_added} chunk(s) indexed · total in index: ${body.total_chunks}`
      );
      setFiles([]);
      if (fileInput.current) fileInput.current.value = "";
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        <header className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-black" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
              Case Intelligence
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-black sm:text-3xl">
            Ask about transcripts & documents
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Grounded answers with cited sources.
          </p>
        </header>

        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="m10.5 10.5 3 3" />
            </svg>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question…"
              disabled={loading}
              className="w-full rounded-xl border border-neutral-300 bg-white py-3 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 transition-all duration-200 focus:border-black focus:outline-none focus:ring-2 focus:ring-neutral-900/10 disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-neutral-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Working…" : "Ask"}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {SAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[12px] text-neutral-600 transition-all duration-200 hover:border-black hover:text-black disabled:opacity-50"
              onClick={() => {
                setQuestion(q);
                submit(q);
              }}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>

        {loading && <Pipeline complete={false} />}

        {error && (
          <div className="animate-fade-in-up mt-5 flex items-start gap-3 rounded-xl border border-neutral-300 bg-white p-4">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
              !
            </span>
            <div>
              <p className="text-sm font-semibold text-black">Something went wrong</p>
              <p className="mt-0.5 text-sm text-neutral-500">{error}</p>
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="mt-5 space-y-4">
            <section className="animate-fade-in-up rounded-xl border border-neutral-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                  Answer
                </span>
                {writing && (
                  <span className="ml-auto rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                    writing…
                  </span>
                )}
              </div>
              <Typewriter text={result.answer} onDone={handleAnswerDone} />
            </section>

            <section
              className={`transition-opacity duration-500 ${
                showSources ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                  Sources
                </span>
                <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
                  {(result.sources || []).length}
                </span>
              </div>
              <div className="space-y-2">
                {(result.sources || []).map((src, i) => (
                  <SourceCard
                    key={`${src.file}-${i}`}
                    source={src}
                    index={i}
                    show={showSources}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        <section className="mt-10 rounded-xl border border-dashed border-neutral-300 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Add your own PDFs
            </span>
          </div>
          <form onSubmit={handleUpload} className="flex flex-wrap items-center gap-2">
            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-600 transition-colors hover:border-black">
              <svg
                className="h-4 w-4 text-neutral-500"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 2.5v7.5M4.5 6 8 2.5 11.5 6" />
                <path d="M2.5 11.5v1a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5v-1" />
              </svg>
              {files.length > 0
                ? `${files.length} file(s) selected`
                : "Choose PDF files"}
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files))}
                disabled={uploading}
              />
            </label>
            <button
              type="submit"
              disabled={uploading || files.length === 0}
              className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-all duration-200 hover:border-black hover:bg-black hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uploading ? "Indexing…" : "Upload & index"}
            </button>
          </form>
          {uploadMsg && (
            <p className="animate-fade-in mt-3 text-sm text-neutral-600">{uploadMsg}</p>
          )}
          {uploadError && (
            <p className="animate-fade-in mt-3 text-sm text-red-600">{uploadError}</p>
          )}
        </section>

        <footer className="mt-10 text-center text-[11px] text-neutral-400">
          Case Intelligence RAG · FastAPI · LlamaIndex · Qdrant · Groq
        </footer>
      </div>
    </div>
  );
}

export default App;
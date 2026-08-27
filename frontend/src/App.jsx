import { useRef, useState } from "react";

const SAMPLE_QUESTIONS = [
  "Did the case manager follow all of the check-in guidelines in the last meeting?",
  "What are some key themes that Robert talks about?",
  "What things seem to be important to Robert?",
  "When should a client submit a grievance?",
  "Did the case manager use the 2nd principle of effective intervention in their last meeting?",
  "What do you think are the client's biggest risks/needs?",
  "What is Nathan's relationship with his family like?",
];

function App() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

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
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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
    <div className="app">
      <header>
        <h1>Case Intelligence</h1>
        <p>Ask anything about client transcripts and reference documents.</p>
      </header>

      <form
        className="query-bar"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question…"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !question.trim()}>
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>

      <div className="samples">
        {SAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            className="chip"
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

      {error && <div className="error">Error: {error}</div>}
      {loading && <div className="loading">Retrieving context and generating answer…</div>}

      {result && !loading && (
        <div className="result">
          <section className="answer">
            <h2>Answer</h2>
            <div className="answer-text">{result.answer}</div>
          </section>

          <section className="sources">
            <h2>Sources / Evidence</h2>
            {(result.sources || []).map((src, i) => (
              <details key={i} className="source">
                <summary>
                  <span className="src-file">{src.file}</span>
                  <span className="src-type">{src.doc_type}</span>
                  <span className="src-score">score {src.score}</span>
                </summary>
                <p className="src-snippet">{src.snippet}</p>
              </details>
            ))}
          </section>
        </div>
      )}

      <section className="ingest">
        <h2>Add your own PDFs</h2>
        <form onSubmit={handleUpload}>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
            disabled={uploading}
          />
          <button type="submit" disabled={uploading || files.length === 0}>
            {uploading ? "Indexing…" : "Upload & index"}
          </button>
        </form>
        {uploadMsg && <p className="ok">{uploadMsg}</p>}
        {uploadError && <p className="error">{uploadError}</p>}
      </section>
    </div>
  );
}

export default App;
import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("web");
  const [file, setFile] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleModeChange = (e) => {
    setMode(e.target.value);
    setAnswer("");

    if (e.target.value === "web") {
      setFile(null);
    }
  };

  const askAI = async () => {
    if (!question.trim()) {
      alert("Please enter a question");
      return;
    }

    if (mode === "pdf" && !file) {
      alert("Please upload a PDF for PDF Study mode");
      return;
    }

    try {
      setLoading(true);
      setAnswer("");

      const formData = new FormData();
      formData.append("question", question);
      formData.append("mode", mode);

      let sessionId = localStorage.getItem("ai_search_session_id");

      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem("ai_search_session_id", sessionId);
      }

      formData.append("session_id", sessionId);

      if (file) {
        formData.append("file", file);
      }

      const response = await axios.post("/api/ask", formData);

      setAnswer(response.data.answer);
    } catch (error) {
      console.error("Full error:", error);

      if (error.response) {
        setAnswer(JSON.stringify(error.response.data, null, 2));
      } else {
        setAnswer("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="card">
        <div className="badge">AI Powered Research System</div>

        <h1>AI Search by Abhay</h1>

        <p>Search smarter. Think faster. Discover deeper.</p>

        <label>Choose Mode</label>
        <select value={mode} onChange={handleModeChange}>
          <option value="web">Web Search</option>
          <option value="pdf">PDF Study</option>
        </select>

        <label>Your Question</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            mode === "web"
              ? "Example: What are the latest trends in AI?"
              : "Example: Summarize this PDF in simple words."
          }
          rows="5"
        />

        {mode === "pdf" && (
          <>
            <label>Upload PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files[0])}
            />

            {file && (
              <p className="file-name">
                Selected file: {file.name}
              </p>
            )}
          </>
        )}

        <button onClick={askAI} disabled={loading}>
          {loading ? "Generating..." : "Generate Answer"}
        </button>

        {answer && (
          <div className="answer">
            <h2>Answer</h2>
            <p>{answer}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
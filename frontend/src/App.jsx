import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("web");
  const [file, setFile] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_NODE_API_URL || "http://localhost:5000";

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

      if (file) {
        formData.append("file", file);
      }

      const response = await axios.post(`${API_URL}/api/ask`, formData);

      setAnswer(response.data.answer);
    } catch (error) {
      console.error("Full error:", error);

      if (error.response) {
        setAnswer(JSON.stringify(error.response.data, null, 2));
      } else {
        setAnswer("Something went wrong. Check backend connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="card">
        <div className="badge">AI Powered Research System</div>

        <h1>AI Search Assistant</h1>

        <p>
          Your intelligent gateway to web research, documents, and instant answers
        </p>

        <label>Choose Mode</label>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
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
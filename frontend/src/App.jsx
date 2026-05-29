import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("general");
  const [file, setFile] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_NODE_API_URL || "http://localhost:5000";

  const askAI = async () => {
    if (!question.trim()) {
      alert("Please enter a question");
      return;
    }

    if ((mode === "pdf" || mode === "both") && !file) {
      alert("Please upload a PDF for this mode");
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
    console.error("Backend response:", error.response.data);
    setAnswer(JSON.stringify(error.response.data, null, 2));
  } else {
    setAnswer(error.message);
  }
};

  return (
    <div className="app">
      <div className="card">
        <h1>AI Research Assistant</h1>
        <p>React + Node.js + FastAPI + Groq</p>

        <label>Choose Mode</label>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="general">General AI Answer</option>
          <option value="web">Web Search Answer</option>
          <option value="pdf">PDF RAG Answer</option>
          <option value="both">Web Search + PDF RAG</option>
        </select>

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask your question..."
          rows="5"
        />

        {(mode === "pdf" || mode === "both") && (
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files[0])}
          />
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
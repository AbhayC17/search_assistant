import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import multer from "multer";
import FormData from "form-data";

dotenv.config();

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
});

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

app.use(
  cors({
    origin: FRONTEND_URL,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Node backend is running",
  });
});

app.post("/api/ask", upload.single("file"), async (req, res) => {
  try {
    const { question, mode } = req.body;

    const formData = new FormData();
    formData.append("question", question);
    formData.append("mode", mode || "general");

    if (req.file) {
      formData.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
    }

    const response = await axios.post(`${AI_SERVICE_URL}/ask`, formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);

    res.status(500).json({
      error: "Node backend error",
      details: error.response?.data || error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Node backend running on port ${PORT}`);
});
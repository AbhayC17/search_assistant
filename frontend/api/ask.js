import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { createRequire } from "module";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);

const formidablePackage = require("formidable");
const pdfParse = require("pdf-parse");

const createForm =
  formidablePackage.formidable ||
  formidablePackage.default ||
  formidablePackage;

export const config = {
  api: {
    bodyParser: false,
  },
};

function loadLocalEnv() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const envPath = path.join(process.cwd(), ".env.local");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const envContent = fs.readFileSync(envPath, "utf8");

  envContent.split("\n").forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return;
    }

    const equalIndex = trimmedLine.indexOf("=");

    if (equalIndex === -1) {
      return;
    }

    const key = trimmedLine.slice(0, equalIndex).trim();
    let value = trimmedLine.slice(equalIndex + 1).trim();

    value = value.replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadLocalEnv();

function parseForm(req) {
  const form = createForm({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 8 * 1024 * 1024,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
      } else {
        resolve({ fields, files });
      }
    });
  });
}

function getField(fields, name, defaultValue = "") {
  const value = fields[name];

  if (Array.isArray(value)) {
    return value[0] || defaultValue;
  }

  return value || defaultValue;
}

function splitText(text, chunkSize = 900, overlap = 150) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    chunks.push(text.slice(start, end));
    start = end - overlap;
  }

  return chunks;
}

function keywordScore(question, chunk) {
  const questionWords = new Set(question.toLowerCase().match(/\w+/g) || []);
  const chunkWords = new Set(chunk.toLowerCase().match(/\w+/g) || []);

  let score = 0;

  for (const word of questionWords) {
    if (chunkWords.has(word)) {
      score++;
    }
  }

  return score;
}

function retrieveRelevantChunks(question, text, topK = 4) {
  const chunks = splitText(text);

  const scoredChunks = chunks.map((chunk) => ({
    chunk,
    score: keywordScore(question, chunk),
  }));

  scoredChunks.sort((a, b) => b.score - a.score);

  const bestChunks = scoredChunks
    .slice(0, topK)
    .filter((item) => item.score > 0)
    .map((item) => item.chunk);

  if (bestChunks.length === 0) {
    return chunks.slice(0, topK).join("\n\n");
  }

  return bestChunks.join("\n\n");
}

async function searchWeb(question) {
  try {
    if (!process.env.TAVILY_API_KEY) {
      return "Web search is not configured because TAVILY_API_KEY is missing.";
    }

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query: question,
        search_depth: "basic",
        max_results: 5,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return `Web search failed with status ${response.status}: ${errorText}`;
    }

    const data = await response.json();
    const searchResults = data.results || [];

    if (searchResults.length === 0) {
      return "No web search results found.";
    }

    return searchResults
      .slice(0, 5)
      .map((result, index) => {
        return `Source ${index + 1}
Title: ${result.title || ""}
Link: ${result.url || ""}
Summary: ${result.content || ""}`;
      })
      .join("\n\n");
  } catch (error) {
    return `Web search failed: ${error.message}`;
  }
}

async function generateAnswer({ question, mode, webContext, pdfContext }) {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const prompt = `
You are a helpful AI research assistant.

Selected Mode:
${mode}

Question:
${question}

Web Search Context:
${webContext}

PDF Context:
${pdfContext}

Instructions:
- If mode is web and web search context is available, answer using the web context.
- If mode is web but web search failed, clearly say that live web search failed, then still provide a helpful general answer using your own knowledge.
- If mode is pdf, answer using the PDF context.
- Keep the answer structured, detailed, and easy to understand.
- Do not refuse to answer simple general questions just because web search failed.
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 1500,
  });

  return completion.choices[0]?.message?.content || "No answer generated.";
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).json({
        message: "AI Search API is running",
        groqConfigured: Boolean(process.env.GROQ_API_KEY),
        supabaseUrlConfigured: Boolean(process.env.SUPABASE_URL),
        supabaseKeyConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        tavilyConfigured: Boolean(process.env.TAVILY_API_KEY),
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Only POST requests are allowed",
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: "GROQ_API_KEY is missing",
      });
    }

    if (!process.env.SUPABASE_URL) {
      return res.status(500).json({
        error: "SUPABASE_URL is missing",
      });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: "SUPABASE_SERVICE_ROLE_KEY is missing",
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { fields, files } = await parseForm(req);

    const question = getField(fields, "question");
    const mode = getField(fields, "mode", "web");
    const sessionId = getField(fields, "session_id", "unknown-session");

    if (!question.trim()) {
      return res.status(400).json({
        error: "Question is required",
      });
    }

    if (mode !== "web" && mode !== "pdf") {
      return res.status(400).json({
        error: "Invalid mode. Use either web or pdf.",
      });
    }

    let webContext = "";
    let pdfContext = "";
    let fileName = null;

    if (mode === "web") {
      webContext = await searchWeb(question);
    }

    if (mode === "pdf") {
      const uploadedFile = Array.isArray(files.file)
        ? files.file[0]
        : files.file;

      if (!uploadedFile) {
        return res.status(400).json({
          error: "PDF file is required for PDF Study mode",
        });
      }

      fileName = uploadedFile.originalFilename || "uploaded.pdf";

      const fileBuffer = await fsp.readFile(uploadedFile.filepath);
      const pdfData = await pdfParse(fileBuffer);

      if (!pdfData.text || !pdfData.text.trim()) {
        return res.status(400).json({
          error: "Could not extract text from PDF",
        });
      }

      pdfContext = retrieveRelevantChunks(question, pdfData.text);
    }

    const answer = await generateAnswer({
      question,
      mode,
      webContext,
      pdfContext,
    });

    const { error: dbError } = await supabase.from("chat_history").insert({
      session_id: sessionId,
      question,
      answer,
      mode,
      file_name: fileName,
      source_context:
        mode === "web"
          ? webContext.slice(0, 8000)
          : pdfContext.slice(0, 8000),
    });

    if (dbError) {
      return res.status(200).json({
        answer,
        saved: false,
        database_error: dbError.message,
      });
    }

    return res.status(200).json({
      answer,
      saved: true,
    });
  } catch (error) {
    console.error("API error:", error);

    return res.status(500).json({
      error: "Vercel API error",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
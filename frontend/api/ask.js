import fs from "fs/promises";
import { formidable } from "formidable";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import pdfParse from "pdf-parse";
import { search, SafeSearchType } from "duck-duck-scrape";

export const config = {
  api: {
    bodyParser: false,
  },
};

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);

function parseForm(req) {
  const form = formidable({
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
    const results = await search(question, {
      safeSearch: SafeSearchType.MODERATE,
    });

    const searchResults = results.results || [];

    if (searchResults.length === 0) {
      return "No web search results found.";
    }

    return searchResults
      .slice(0, 5)
      .map((result, index) => {
        return `Source ${index + 1}
Title: ${result.title || ""}
Link: ${result.url || ""}
Summary: ${result.description || ""}`;
      })
      .join("\n\n");
  } catch (error) {
    return `Web search failed: ${error.message}`;
  }
}

async function generateAnswer({ question, mode, webContext, pdfContext }) {
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
- If mode is web, answer using the web search context.
- If mode is pdf, answer using the PDF context.
- Keep the answer structured, detailed, and easy to understand.
- If the available context is not enough, clearly mention that the source does not provide enough information.
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
  if (req.method === "GET") {
    return res.status(200).json({
      message: "AI Search API is running",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed",
    });
  }

  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: "GROQ_API_KEY is missing",
      });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: "Supabase environment variables are missing",
      });
    }

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

      const fileBuffer = await fs.readFile(uploadedFile.filepath);
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
      console.error("Supabase insert error:", dbError.message);

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
    });
  }
}
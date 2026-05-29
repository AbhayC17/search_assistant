import os
import re
from io import BytesIO

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from ddgs import DDGS
from pypdf import PdfReader

load_dotenv()

app = FastAPI()

llm = ChatGroq(
    groq_api_key=os.getenv("GROQ_API_KEY"),
    model_name="llama-3.3-70b-versatile"
)


@app.get("/")
def home():
    return {
        "message": "FastAPI AI backend is running"
    }


def search_web(query: str) -> str:
    try:
        results = list(DDGS().text(query, max_results=5))

        if not results:
            return "No web search results found."

        formatted_results = []

        for result in results:
            title = result.get("title", "")
            link = result.get("href", "")
            body = result.get("body", "")

            formatted_results.append(
                f"Title: {title}\nLink: {link}\nSummary: {body}"
            )

        return "\n\n".join(formatted_results)

    except Exception as e:
        return f"Web search failed: {str(e)}"


def extract_pdf_text(file_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(file_bytes))

    text = ""

    for page in reader.pages:
        page_text = page.extract_text()

        if page_text:
            text += page_text + "\n"

    return text


def split_text(text: str, chunk_size: int = 900, overlap: int = 150):
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap

    return chunks


def keyword_score(query: str, chunk: str) -> int:
    query_words = set(re.findall(r"\w+", query.lower()))
    chunk_words = set(re.findall(r"\w+", chunk.lower()))

    return len(query_words.intersection(chunk_words))


def retrieve_relevant_chunks(question: str, text: str, top_k: int = 4) -> str:
    chunks = split_text(text)

    scored_chunks = []

    for chunk in chunks:
        score = keyword_score(question, chunk)
        scored_chunks.append((score, chunk))

    scored_chunks.sort(reverse=True, key=lambda x: x[0])

    best_chunks = [chunk for score, chunk in scored_chunks[:top_k] if score > 0]

    if not best_chunks:
        best_chunks = chunks[:top_k]

    return "\n\n".join(best_chunks)


@app.post("/ask")
async def ask_ai(
    question: str = Form(...),
    mode: str = Form("web"),
    file: UploadFile | None = File(None)
):
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is missing"
        )

    web_context = ""
    pdf_context = ""

    if mode == "web":
        web_context = search_web(question)

    elif mode == "pdf":
        if file is None:
            raise HTTPException(
                status_code=400,
                detail="PDF file is required for PDF Study mode"
            )

        file_bytes = await file.read()
        pdf_text = extract_pdf_text(file_bytes)

        if not pdf_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from PDF"
            )

        pdf_context = retrieve_relevant_chunks(question, pdf_text)

    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid mode. Use either 'web' or 'pdf'."
        )

    prompt = f"""
You are a helpful AI research assistant.

Answer the user's question clearly and accurately.

Selected Mode:
{mode}

Question:
{question}

Web Search Context:
{web_context}

PDF Context:
{pdf_context}

Instructions:
- If mode is web, answer using the web search context.
- If mode is pdf, answer using only the PDF context.
- Keep the answer structured, detailed, and easy to understand.
- If the available context is not enough, clearly mention that the source does not provide enough information.
"""

    response = llm.invoke(prompt)

    return {
        "answer": response.content
    }
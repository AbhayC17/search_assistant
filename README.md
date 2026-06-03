# AI Search Assistant

An AI-powered research assistant that helps users search the web, study PDFs, and generate context-aware answers using Large Language Models. The project combines real-time search, document understanding, and AI response generation to make learning and research faster, smarter, and more reliable.

## Overview

AI Search Assistant is designed for students, researchers, and professionals who want quick and meaningful answers from both web sources and uploaded documents. Instead of depending only on static model knowledge, the application improves response quality by combining user queries with relevant search results or PDF content.

This project demonstrates practical skills in AI application development, LLM integration, prompt engineering, search-augmented workflows, and document-based question answering.

## Features

- AI-powered question answering
- Real-time web search support
- PDF upload and study mode
- Document-based question answering
- Context-aware response generation
- Simple and user-friendly interface
- Useful for research, learning, and interview preparation
- Modular structure for future feature expansion

## Problem It Solves

Students and researchers often spend a lot of time switching between search engines, PDFs, notes, and AI tools. This project brings these workflows together in one place by allowing users to ask questions, search information, and understand documents through an AI assistant.

## Tech Stack

- Python
- Streamlit
- LangChain
- Llama 3 / LLM API
- Groq API / Microsoft Foundry-ready integration
- DuckDuckGo Search
- PDF processing libraries
- Git
- GitHub

## Workflow

```text
User enters a question
        |
        v
Application identifies the mode
        |
        |--- Web Search Mode ---> Fetches relevant search results
        |
        |--- PDF Study Mode ----> Extracts content from uploaded PDF
        |
        v
Relevant context is passed to the LLM
        |
        v
LLM generates a meaningful answer
        |
        v
Answer is displayed to the user
```

## Project Highlights

- Built an AI assistant capable of generating answers using real-time search and uploaded PDF content.
- Implemented search-augmented response generation to reduce dependency on static model knowledge.
- Added PDF-based learning support to help users understand documents faster.
- Designed a clean and simple interface for students and researchers.
- Structured the project so future features like voice input, chat history, citations, and multi-file support can be added easily.

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/AbhayC17/AI_Research.git
cd AI_Research
```

### 2. Create a Virtual Environment

```bash
python -m venv venv
```

### 3. Activate the Virtual Environment

For Windows:

```bash
venv\Scripts\activate
```

For macOS/Linux:

```bash
source venv/bin/activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Add API Key

Create a `.env` file and add your API key:

```env
GROQ_API_KEY=your_api_key_here
```

If using Microsoft Foundry or any other model provider, update the API key and model configuration accordingly.

### 6. Run the Application

```bash
streamlit run app.py
```

## Folder Structure

```text
AI_Research/
│
├── app.py
├── requirements.txt
├── README.md
├── .env.example
│
├── utils/
│   ├── search_utils.py
│   ├── pdf_utils.py
│   └── llm_utils.py
│
└── assets/
    └── screenshots/
```

## Future Enhancements

- Voice input support
- Chat history storage
- Multi-PDF analysis
- Source citation generation
- User authentication
- Export answers as PDF or notes
- Support for multiple AI models
- Cloud deployment

## Learning Outcomes

Through this project, I learned:

- Building LLM-powered applications
- Integrating AI models with search tools
- Creating PDF-based question-answering workflows
- Designing prompt-based AI pipelines
- Working with APIs and environment variables
- Developing practical AI tools using Python

## Demo

Live Demo: https://search-assistantbyabhay.vercel.app/ 
GitHub Repository: https://github.com/AbhayC17/AI_Research

## Author

**Abhay C**  
Computer Science Engineering Student  
Interested in AI, Cloud Computing, Web Development, and Process Intelligence.

## Connect With Me

LinkedIn: linkedin.com/in/abhay-chandrik-9a5723315/  
GitHub: https://github.com/AbhayC17

## License

This project is open-source and created for educational and learning purposes.

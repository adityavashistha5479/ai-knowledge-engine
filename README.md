# AI Knowledge Engine (RAG-based Chat System)

A full-stack AI application that allows users to query documents (PDFs) using natural language with real-time streaming responses.

---

## 🚀 Features

- 📄 PDF ingestion → chunking → embeddings → FAISS
- 🔍 Semantic search with relevance scoring
- 💬 ChatGPT-like UI with streaming responses (SSE)
- 🧠 RAG (Retrieval-Augmented Generation)
- 🔁 General knowledge fallback when no docs found
- 📌 Source citations with:
  - file name
  - page number
  - snippet
  - clickable PDF links
- 🟢 UI indicator:
  - Answer from Documents
  - General Knowledge

---

## 🛠 Tech Stack

### Backend

- FastAPI
- LangChain
- FAISS
- OpenAI API

### Frontend

- Next.js
- React
- Tailwind CSS

---

## 🧱 Project Structure

```
AI/
├── frontend/   # Next.js UI
└── backend/    # FastAPI + RAG pipeline
```

---

## ⚙️ Setup Instructions (Step-by-Step)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/<your-username>/ai-knowledge-engine.git
cd ai-knowledge-engine
```

> Replace `<your-username>` and the repo name with your GitHub user and repository name if they differ.

### 2️⃣ Backend Setup (FastAPI)

```bash
cd backend
python -m venv venv
```

**Activate virtual environment**

- **Windows:**

  ```bash
  venv\Scripts\activate
  ```

- **macOS / Linux:**

  ```bash
  source venv/bin/activate
  ```

**Install dependencies**

```bash
pip install -r requirements.txt
```

**Create `.env` file** (in `backend/`)

```env
OPENAI_API_KEY=your_api_key_here
```

**Run backend server**

```bash
uvicorn app.main:app --reload
```

Backend runs at: **http://localhost:8000**

### 3️⃣ Frontend Setup (Next.js)

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:3000**

---

## 🔄 How It Works

1. **Upload PDF documents**
2. **Backend processes:** splits into chunks → generates embeddings → stores in FAISS
3. **User asks a question**
4. **System:** retrieves relevant chunks → sends context to LLM → streams response via SSE
5. **UI displays:** answer, sources, document links

---

## 📡 API Endpoints

| Endpoint  | Description          |
| --------- | -------------------- |
| Streaming | `POST /query-stream` |
| Standard  | `POST /query`        |

_(Update if your app uses a prefix, e.g. `/api/...`.)_

---

## 📸 Screenshots _(Add Later)_

- Chat UI
- Streaming responses
- Source citations with links

---

## 🎯 Future Improvements

- Confidence scoring
- Better ranking of sources
- Answer grounding validation
- Deployment (AWS / Vercel)

## 🏗 Architecture

- User interacts with Next.js frontend
- Requests sent to FastAPI backend
- Backend:
  - retrieves relevant chunks from FAISS
  - constructs prompt using LangChain
  - calls OpenAI API
- Response is streamed via SSE
- Frontend renders tokens in real-time
- Sources are displayed with document + page references

from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
import json

from app.services.query_service import retrieve_documents
from app.core.config import settings


# ✅ Lazy LLM init
def get_llm():
    return ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.OPENAI_API_KEY,
        streaming=True
    )


# 🔥 Prompt Template
template = """
You are a helpful AI assistant.

Answer the question using the provided context below.

Rules:
- If context is available, you MUST use it to answer.
- Do NOT say you cannot access files, PDFs, or external data.
- Do NOT mention limitations.
- If context is empty, answer using general knowledge.

Context:
{context}

Question:
{question}

Answer:
"""

prompt = PromptTemplate(
    template=template,
    input_variables=["context", "question"]
)


# 🔥 Normal (non-streaming)
def ask_question(question: str, vector_store):
    docs, sources, from_docs = retrieve_documents(question, vector_store)

    context = "\n\n---\n\n".join([
        f"Source: {doc.metadata.get('source')} | Page: {doc.metadata.get('page', 0) + 1}\n{doc.page_content}"
        for doc in docs
    ]) if from_docs else ""

    final_prompt = prompt.format(
        context=context,
        question=question
    )

    llm = get_llm()  # ✅ correct

    response = llm.invoke(final_prompt)

    return {
        "answer": response.content,
        "sources": sources,
        "from_docs": from_docs
    }


# 🔥 Streaming (FIXED)
async def stream_question(question: str, vector_store):
    docs, sources, from_docs = retrieve_documents(question, vector_store)

    context = "\n\n---\n\n".join([
        f"Source: {doc.metadata.get('source')} | Page: {doc.metadata.get('page', 0) + 1}\n{doc.page_content}"
        for doc in docs
    ]) if from_docs else ""

    final_prompt = prompt.format(
        context=context,
        question=question
    )

    llm = get_llm()  # ✅ FIXED

    async for chunk in llm.astream(final_prompt):  # ✅ FIXED
        if chunk.content:
            data = {
                "type": "token",
                "content": chunk.content
            }
            yield f"data: {json.dumps(data)}\n\n"

    # ✅ Send sources
    data = {
        "type": "sources",
        "data": sources,
        "from_docs": from_docs
    }
    yield f"data: {json.dumps(data)}\n\n"
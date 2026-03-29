from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import List
from fastapi.responses import StreamingResponse
import json

from app.services.rag_service import stream_question
from app.services.rag_service import ask_question

router = APIRouter()

class Source(BaseModel):
    source: str
    page: int


class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    answer: str
    sources: List[Source]


@router.post("/query", response_model=QueryResponse)
def query_docs(request: Request, payload: QueryRequest):

    if getattr(request.app.state, "is_indexing", False):
        raise HTTPException(status_code=409, detail="Indexing in progress")

    if not hasattr(request.app.state, "vectorstore"):
        raise HTTPException(status_code=400, detail="No document uploaded")

    if request.app.state.vectorstore is None:
        raise HTTPException(status_code=400, detail="No document uploaded")

    result = ask_question(payload.question, request.app.state.vectorstore)

    return QueryResponse(
        answer=result["answer"],
        sources=result["sources"]
    )   

@router.get("/query-stream")
async def query_stream(request: Request, question: str):
    if getattr(request.app.state, "is_indexing", False):
        async def indexing_stream():
            yield f"data: {json.dumps({'type': 'token', 'content': '⏳ Document is still indexing. Please try again in a few seconds.'})}\n\n"
            yield f"data: {json.dumps({'type': 'sources', 'data': [], 'from_docs': False})}\n\n"

        return StreamingResponse(indexing_stream(), media_type="text/event-stream")

    if not hasattr(request.app.state, "vectorstore"):
        async def no_doc_stream():
            yield f"data: {json.dumps({'type': 'token', 'content': '⚠️ No document uploaded. Please upload a PDF first.'})}\n\n"
            yield f"data: {json.dumps({'type': 'sources', 'data': [], 'from_docs': False})}\n\n"

        return StreamingResponse(no_doc_stream(), media_type="text/event-stream")

    if request.app.state.vectorstore is None:
        async def no_doc_stream_2():
            yield f"data: {json.dumps({'type': 'token', 'content': '⚠️ No document uploaded. Please upload a PDF first.'})}\n\n"
            yield f"data: {json.dumps({'type': 'sources', 'data': [], 'from_docs': False})}\n\n"

        return StreamingResponse(no_doc_stream_2(), media_type="text/event-stream")

    return StreamingResponse(
        stream_question(question, request.app.state.vectorstore),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )
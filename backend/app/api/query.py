from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from fastapi.responses import StreamingResponse

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
def query_docs(request: QueryRequest):

    result = ask_question(request.question)

    return QueryResponse(
        answer=result["answer"],
        sources=result["sources"]
    )   

@router.get("/query-stream")
async def query_stream(question: str):

    return StreamingResponse(
        stream_question(question),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )
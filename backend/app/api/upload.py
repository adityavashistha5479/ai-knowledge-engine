from fastapi import APIRouter, UploadFile, File, Request
import os

from app.services.upload_service import create_vectorstore


router = APIRouter()

UPLOAD_DIR = os.path.join("data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    vectorstore = create_vectorstore(file_path)
    request.app.state.vectorstore = vectorstore

    return {"message": "File uploaded and processed", "filename": file.filename}

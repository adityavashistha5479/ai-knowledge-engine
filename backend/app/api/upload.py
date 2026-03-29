from fastapi import APIRouter, UploadFile, File, Request
import os
from threading import Thread

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

    request.app.state.is_indexing = True

    app = request.app

    def process():
        try:
            print("Processing started")
            vectorstore = create_vectorstore(file_path)
            app.state.vectorstore = vectorstore
            print("Processing done")
        except Exception as e:
            app.state.vectorstore = None
            app.state.indexing_error = str(e)
            print("Processing failed:", e)
        finally:
            app.state.is_indexing = False

    Thread(target=process, daemon=True).start()

    return {
        "message": "Upload received, processing in background",
        "filename": file.filename,
    }

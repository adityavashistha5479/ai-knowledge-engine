from fastapi import FastAPI
from app.api.health import router as app_router
from app.api.query import router as query_router
from app.api.upload import router as upload_router
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os


app = FastAPI()

allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
]

frontend_prod = os.getenv("FRONTEND_ORIGIN")
if frontend_prod:
    allowed_origins.append(frontend_prod)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))

DATA_DIR = os.path.join(PROJECT_ROOT, "data")

# Note: FastAPI uses `/docs` for Swagger UI by default.
# Mounting StaticFiles at `/docs` would hide Swagger, so use a different path.
app.mount("/documents", StaticFiles(directory=DATA_DIR), name="documents")

app.include_router(app_router)
app.include_router(query_router)
app.include_router(upload_router)
from fastapi import APIRouter

router = APIRouter()

@router.get("/app")
def get_app_status():
    return {"status": "ok"} 
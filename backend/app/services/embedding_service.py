from langchain_openai import OpenAIEmbeddings
from app.core.config import settings


def get_embeddings():

    embeddings = OpenAIEmbeddings(  
        model="text-embedding-3-small",
        api_key=settings.OPENAI_API_KEY
    )

    return embeddings
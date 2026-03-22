from app.services.document_loader import load_documents
from app.services.text_splitter import split_documents
from app.services.embedding_service import get_embeddings
from app.services.vector_store import create_vector_store


def run_ingestion():

    documents = load_documents("data")

    chunks = split_documents(documents)

    embeddings = get_embeddings()

    create_vector_store(chunks, embeddings)


if __name__ == "__main__":
    run_ingestion() 
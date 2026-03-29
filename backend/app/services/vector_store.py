from langchain_community.vectorstores import FAISS
import os


def create_vector_store(chunks, embeddings):
    vector_store = FAISS.from_documents(chunks, embeddings)

    vector_store.save_local("data/vector_index")

    return vector_store


def load_vector_store(embeddings):
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))

    index_path = os.path.join(PROJECT_ROOT, "data", "vector_index")

    print("Loading FAISS from:", index_path)  # 🔥 debug

    vector_store = FAISS.load_local(
        index_path,
        embeddings,
        allow_dangerous_deserialization=True
    )

    return vector_store
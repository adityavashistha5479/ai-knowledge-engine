from langchain_community.document_loaders import PyPDFLoader
import os


def load_documents(data_path):

    documents = []

    for file in os.listdir(data_path):
        if file.endswith(".pdf"):

            file_path = os.path.join(data_path, file)

            loader = PyPDFLoader(file_path)
            docs = loader.load()

            for i, doc in enumerate(docs):
                # ✅ Always clean filename
                doc.metadata["source"] = file

                # ✅ Fix page number (0 → 1 based)
                page = doc.metadata.get("page", i)
                doc.metadata["page"] = page + 1

                print("DEBUG DOC:", doc.metadata) 

            documents.extend(docs)

    return documents
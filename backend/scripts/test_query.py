from app.services.query_service import retrieve_documents

query = "What is this document about?"

docs, sources, from_docs = retrieve_documents(query)

print(f"\nUsing RAG: {from_docs}")
print(f"Sources: {sources}")

for doc in docs:
    print("\n---")
    print(doc.page_content)
from app.services.embedding_service import get_embeddings
from app.services.vector_store import load_vector_store


def retrieve_documents(query: str, k: int = 8):
    embeddings = get_embeddings()
    vector_store = load_vector_store(embeddings)

    # 🔥 Detect broad / summary queries
    is_summary_query = any(word in query.lower() for word in [
        "summary", "summarize", "about", "overview", "explain document"
    ])

    # 🔥 Increase coverage for summary queries
    if is_summary_query:
        k = 12

    docs_with_scores = vector_store.similarity_search_with_score(query, k=k)

    filtered_docs = []
    unique_sources = {}

    THRESHOLD = 0.8  # adjust later if needed

    for doc, score in docs_with_scores:
        print("RETRIEVED:", doc.metadata, "SCORE:", score)

        # ❗ For summary queries → DON'T filter aggressively
        if not is_summary_query and score > THRESHOLD:
            continue

        filtered_docs.append(doc)

        source = doc.metadata.get("source", "Unknown")
        page = doc.metadata.get("page", 0) + 1

        snippet = doc.page_content[:200].strip().replace("\n", " ")

        key = (source, page)

        if key not in unique_sources:
            unique_sources[key] = snippet

    # build sources list
    sources = [
        {
            "source": src,
            "page": pg,
            "snippet": unique_sources[(src, pg)]
        }
        for (src, pg) in unique_sources.keys()
    ]

    # sort for clean UI
    sources.sort(key=lambda x: (x["source"], x["page"]))

    from_docs = len(filtered_docs) > 0

    return filtered_docs, sources, from_docs
from app.services.rag_service import ask_question

question = "What is this document about?"

answer = ask_question(question)

print("\nAI Answer:\n")
print(answer)
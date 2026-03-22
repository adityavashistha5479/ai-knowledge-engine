import requests
import json

url = "http://127.0.0.1:8000/query-stream"

payload = {
    "question": "What is this document about?"
}

response = requests.post(url, json=payload, stream=True)

for chunk in response.iter_content(chunk_size=None):
    if chunk:
        print(chunk.decode("utf-8"), end="", flush=True)
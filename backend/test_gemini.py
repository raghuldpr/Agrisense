import os
import requests
from dotenv import load_dotenv
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

for model in ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-flash"]:
    print(f"Testing {model}...")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={API_KEY}"
    payload = {"contents": [{"parts": [{"text": "Hello"}]}]}
    r = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
    print(" ", r.status_code, r.text[:200])

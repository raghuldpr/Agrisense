from huggingface_hub import InferenceClient
import os
from dotenv import load_dotenv
load_dotenv()
token = os.getenv("HF_API_TOKEN")

client = InferenceClient(api_key=token)

try:
    print("Testing Llama-3.3-70B-Instruct...")
    messages = [{"role": "user", "content": "Reply with JSON: { \"answer\": \"Hello\"}"}]
    completion = client.chat.completions.create(
        model="meta-llama/Llama-3.3-70B-Instruct", 
        messages=messages, 
        max_tokens=500
    )
    print(completion.choices[0].message.content)
except Exception as e:
    print("Failed!", e)

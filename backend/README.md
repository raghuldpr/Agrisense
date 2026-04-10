---
title: AgriSense Backend
emoji: 🌿
colorFrom: green
colorTo: green
sdk: docker
pinned: false
app_port: 7860
---

# AgriSense Backend

This is the backend API for the **AgriSense** mobile application. It handles:
- Crop disease detection (PyTorch)
- Gemini integration via Groq
- Telemetry processing
- Weather fetching

## Local Development
To run locally:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Deployment (Hugging Face Spaces)
This project is configured perfectly for Hugging Face Spaces using the **Docker** SDK.
The Dockerfile is set to run the application on port **7860**.

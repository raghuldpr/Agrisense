# 🌱 Agrisense

Welcome to **Agrisense**, an end-to-end smart agriculture platform powered by Artificial Intelligence and IoT telemetry. Agrisense provides farmers with actionable insights, automated crop disease identification, real-time soil health monitoring, and personalized agronomic advice to maximize yield and efficiency.

---

## 🚀 Key Features

*   **📱 Smart Mobile Application**: A fast and intuitive React Native application that acts as the control hub for farmers, available on Android. Features include weather forecasting, localized insights, and intuitive dashboards.
*   **🤖 AI Agronomy Chatbot**: An integrated, context-aware AI assistant leveraging Hugging Face Serverless Inference APIs (Llama/Gemini). Ask critical farming questions ranging from pesticide use to optimal harvest times and get instant, scientifically-backed answers.
*   **🍃 Crop Disease Identification**: Snap a picture of a diseased leaf and upload it! Agrisense's backend uses Machine Learning models enriched by AI to identify the exact blight or pathogen and immediately recommend organic/chemical treatments.
*   **🌍 IoT Soil Telemetry Station**: Seamless hardware integration using ESP32 microcontrollers. Tracks **Soil Moisture, Temperature, and Humidity** in real-time, streaming telemetry data to the cloud for live dashboard consumption.
*   **🧪 Fertilizer & Nutrient Calculator**: Based on real-time soil data and target crop needs, the platform calculates exact NPK ratios and recommends soil amendments.

---

## 🏗️ System Architecture

Agrisense operates on a modern, decoupled architecture connecting three major tiers:

1.  **Client-Side (Frontend)**: React Native / Expo application targeting mobile devices. It communicates with the backend via RESTful APIs to fetch real-time charts, chatbot responses, and crop analysis results.
2.  **Server-Side (Backend)**: Built on Python's blazing-fast **FastAPI** framework. It handles complex business logic including fetching AI abstractions, serving ML prediction endpoints, handling hardware POST requests, and organizing cross-network caching.
3.  **Edge / Hardware (IoT)**: An **ESP32 NodeMCU** acts as the remote sensor station. Equipped with capacitive soil moisture sensors and DHT11 ambient sensors, it establishes Wi-Fi connections to push JSON telemetry payloads directly to the backend.

---

## 🛠️ Technology Stack

**Mobile Application:**
*   React Native & Expo
*   Axios (Networking)
*   AsyncStorage (Local persistence)

**Backend Infrastructure:**
*   Python 3.10+
*   FastAPI (Asynchronous Web Server)
*   Uvicorn (ASGI Server)
*   Hugging Face Hub (Serverless AI Inference APIs)
*   TensorFlow / PyTorch (Disease classification backbones)

**Hardware & Embedded:**
*   ESP32 Microcontroller
*   C++ / Arduino IDE
*   Capacitive Soil Moisture Sensors v1.2 / DHT11
*   HTTPClient & WiFi libraries

---

## 🔌 Hardware Setup (ESP32 Station)

To deploy the physical soil station to the field:
1.  Connect the Soil Moisture Sensor `A0` pin to the ESP32 `VP (Pin 36)` analog input line.
2.  Connect the DHT11 Data pin to a digital GPIO (e.g., `GPIO 4`).
3.  Ensure your `hardware/soil_station.ino` file is configured with the correct Wi-Fi `SSID` and `PASSWORD`.
4.  Update the `serverUrl` in the `.ino` script to point to your live FastAPI backend IP/Domain.
5.  Flash the firmware using the Arduino IDE.

---

## 💻 Installation & Local Development

### 1. Backend (FastAPI) Setup
```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv venv
source venv/Scripts/activate  # on Windows
# source venv/bin/activate    # on Mac/Linux

# Install requirements
pip install -r requirements.txt

# Start the local development server on port 8000
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend (Mobile App) Setup
```bash
# Navigate to the mobile directory
cd mobile

# Install Node dependencies
npm install

# Start the Expo Metro Bundler
npx expo start
```
*Use the Expo Go app on your physical device, or run it on an Android Emulator.*

### 3. Environment Variables (`.env`)
You must configure an `.env` file in your root backend folder with your necessary tokens:
```ini
HUGGING_FACE_API_KEY="your_hf_token_here"
# Note: Ensure this file is never tracked in version control.
```

---

## 📡 Core API Reference

The backend exposes several key endpoints:

*   **`GET /`** - Health check and API status.
*   **`POST /chat`** - Accepts a `query` payload and returns agronomic AI responses.
*   **`POST /soil-data`** - Ingestion endpoint for ESP32 hardware to post telemetry `(moisture, temperature, humidity)`.
*   **`GET /soil-latest`** - Returns the most recently submitted soil data block.
*   **`GET /soil-advice`** - Generates actionable irrigation and fertilization advice based on the newest soil records.
*   **`POST /analyze-disease`** - Accepts `multipart/form-data` image uploads and returns identified diseases with confidence thresholds and remedies.

---

> **Agrisense** was built to empower modern agriculture with accessible intelligence. 🌾

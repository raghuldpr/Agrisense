#include <WiFi.h>
#include <HTTPClient.h>
#include "DHT.h"

// ---------------------------------------------------------
// 1. HARDWARE PINS & SETUP
// ---------------------------------------------------------
#define DHTPIN 4          // Digital pin connected to the DHT22
#define DHTTYPE DHT22     // DHT 22 (AM2302)
#define SOIL_PIN 34       // Analog pin for Soil Moisture (ADC1_CH6)
#define TDS_PIN 35        // Analog pin for TDS Sensor (ADC1_CH7)

DHT dht(DHTPIN, DHTTYPE);

// ESP32 ADC Calibration (12-bit ADC ranges from 0 to 4095)
#define AIR_VALUE 3500    // Replace with literal reading in dry air
#define WATER_VALUE 1500  // Replace with literal reading dipped in water

// ---------------------------------------------------------
// 2. NETWORK & CLOUD BACKEND
// ---------------------------------------------------------
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Hosted FastAPI backend URL for soil telemetry ingestion
const char* serverName = "https://raghuldpr-agrisense.hf.space/soil-data";

// Set your crop configuration for AgriSense advice routing
String deviceId = "ESP32_AGRISENSE_01";
String cropType = "tomato";

// Deep sleep interval (e.g., wake up every 30 minutes = 1800 seconds)
#define uS_TO_S_FACTOR 1000000ULL 
#define TIME_TO_SLEEP  1800 


void setup() {
  Serial.begin(115200);
  delay(1000); // Give serial monitor time to stabilize
  
  Serial.println("\n\n--- AgriSense Soil Health Station Booting ---");

  dht.begin();
  
  // --- ROBUST WIFI INITIALIZATION ---
  WiFi.disconnect(true); // Clear any old stuck configs
  delay(1000);
  WiFi.mode(WIFI_STA);   // Force it to be a station (client)
  
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  int attempts = 0;
  while(WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n\n[FATAL ERROR] Completely failed to connect to Wi-Fi.");
    Serial.println("Please DOUBLE CHECK:");
    Serial.println("1. Did you type the Wi-Fi Name (SSID) and Password perfectly? (Case sensitive!)");
    Serial.println("2. Are you absolutely sure the router is 2.4GHz? (ESP32 cannot see 5GHz networks)");
    Serial.print("Diagnostic Wi-Fi Status Code: ");
    Serial.println(WiFi.status());
    Serial.println("(Status 1 = NO_SSID_AVAIL, Status 4 = WRONG PASSWORD)");
    Serial.println("Halting normal boot. Please fix credentials and upload again.");
    while(1) { delay(10000); } // Halt execution endlessly
  }
  Serial.println("\nConnected to Wi-Fi network with IP Address: ");
  Serial.println(WiFi.localIP());

  // Wait 2 seconds for sensors to stabilize
  delay(2000);
  
  // Take readings and transmit
  transmitTelemetry();

  // Go to sleep to conserve battery
  Serial.println("Going to sleep now...");
  esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP * uS_TO_S_FACTOR);
  esp_deep_sleep_start();
}

void loop() {
  // Deep sleep means loop() is rarely executed; the ESP reboots entirely instead.
}

void transmitTelemetry() {
  // 1. Read DHT22
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (isnan(h) || isnan(t)) {
    Serial.println("Failed to read from DHT sensor! Sending mock data as fallback.");
    h = 60.5; // fallback
    t = 28.0; // fallback
  }

  // 2. Read Soil Moisture
  int soilRaw = analogRead(SOIL_PIN);
  float moisturePercent = map(soilRaw, AIR_VALUE, WATER_VALUE, 0, 100);
  
  // Constrain to 0-100 to prevent weird analog drift mapping issues
  if (moisturePercent > 100.0) moisturePercent = 100.0;
  if (moisturePercent < 0.0) moisturePercent = 0.0;

  // 3. Read TDS
  int tdsRaw = analogRead(TDS_PIN);
  // Simple TDS analog to ppm calculation (requires calibration for accuracy)
  float tdsVoltage = tdsRaw * (3.3 / 4095.0);
  float tdsValue = (133.42 * tdsVoltage * tdsVoltage * tdsVoltage 
                    - 255.86 * tdsVoltage * tdsVoltage 
                    + 857.39 * tdsVoltage) * 0.5; 
  if (tdsValue < 0) tdsValue = 0;

  Serial.println("====== Sensor Readings ======");
  Serial.printf("Temperature: %.1f C\n", t);
  Serial.printf("Humidity: %.1f %%\n", h);
  Serial.printf("Soil Moisture: %.1f %% (Raw analog: %d)\n", moisturePercent, soilRaw);
  Serial.printf("TDS PPM: %.1f ppm\n", tdsValue);
  Serial.println("=============================");

  // 4. Create JSON format for backend
  String jsonPayload = "{";
  jsonPayload += "\"device_id\":\"" + deviceId + "\",";
  jsonPayload += "\"crop\":\"" + cropType + "\",";
  jsonPayload += "\"moisture\":" + String(moisturePercent, 1) + ",";
  jsonPayload += "\"tds\":" + String(tdsValue, 1) + ",";
  jsonPayload += "\"temperature\":" + String(t, 1) + ",";
  jsonPayload += "\"humidity\":" + String(h, 1);
  jsonPayload += "}";

  // 5. Send HTTP POST
  if(WiFi.status() == WL_CONNECTED){
    HTTPClient http;
    http.begin(serverName);
    
    // Specify content-type header
    http.addHeader("Content-Type", "application/json");

    Serial.println("Pushing telemetry to AgriSense Cloud: " + String(serverName));
    int httpResponseCode = http.POST(jsonPayload);
     
    if (httpResponseCode > 0) {
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
      String payload = http.getString();
      Serial.println("Server response: " + payload);
    } else {
      Serial.print("Error code: ");
      Serial.println(httpResponseCode);
    }
    http.end(); // Free resources
  } else {
    Serial.println("Error: WiFi Disconnected.");
  }
}

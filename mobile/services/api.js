// ─── UPDATE THIS to your machine's local IP ──────────────────────────────────
// Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find your IP.
// Example: 'http://192.168.1.42:8000'
const BASE_URL = 'https://raghuldpr-agrisense.hf.space'; // Direct HF API Domain

// ── WAKE-UP PING ───────────────────────────────────────────────────────────
// Hugging Face Spaces free tier sleeps after 15 minutes of inactivity.
// We ping it silently on app launch so it can warm up before the user scans.
export const pingBackend = async () => {
  try {
    fetch(`${BASE_URL}/health`).catch(() => { });
  } catch (error) { }
};
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send an image to the backend for disease prediction.
 * @param {object} params
 * @param {string} params.imageUri   - local file URI from ImagePicker
 * @param {string} params.crop       - 'tomato' | 'potato' | 'pepper'
 * @param {string} params.language   - 'en' | 'hi' | 'ta'
 * @param {number} params.latitude
 * @param {number} params.longitude
 */
export async function predictDisease({ imageUri, crop, language, latitude, longitude }) {
  const formData = new FormData();

  // Determine file extension
  const ext = imageUri.split('.').pop() || 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  formData.append('file', {
    uri: imageUri,
    name: `leaf.${ext}`,
    type: mimeType,
  });
  formData.append('crop', crop);
  formData.append('language', language);
  formData.append('latitude', String(latitude));
  formData.append('longitude', String(longitude));

  const response = await fetch(`${BASE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Server error ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch forecast data for a crop and location.
 * @param {object} params
 * @param {string} params.crop
 * @param {number} params.latitude
 * @param {number} params.longitude
 */
export async function getForecast({ crop, latitude, longitude }) {
  const query = new URLSearchParams({
    crop,
    latitude: String(latitude),
    longitude: String(longitude),
  });

  const response = await fetch(`${BASE_URL}/forecast?${query.toString()}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Server error ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch nearby agri shops for a location.
 * @param {object} params
 * @param {number} params.latitude
 * @param {number} params.longitude
 */
export async function getNearbyShops({ latitude, longitude }) {
  const query = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
  });

  const response = await fetch(`${BASE_URL}/nearby-shops?${query.toString()}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Server error ${response.status}`);
  }

  return response.json();
}

/**
 * Build a full URL for a backend-served image path.
 */
export function getImageUrl(relativePath) {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath;
  return `${BASE_URL}/${relativePath.replace(/^\//, '')}`;
}

/**
 * Build a full URL for a backend-served audio file path.
 */
export function getAudioUrl(relativePath) {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath;
  return `${BASE_URL}/${relativePath.replace(/^\//, '')}`;
}

/**
 * Send a chat message to the farmer AI assistant.
 * @param {object} params
 * @param {string} params.message
 * @param {string} params.crop
 * @param {string} params.preferred_language
 * @param {string} [params.disease]
 * @param {object} [params.weather_context]
 * @param {string} [params.location]
 */
export async function sendChatMessage({
  message,
  crop,
  preferred_language,
  disease,
  weather_context,
  location,
}) {
  const body = {
    message,
    crop,
    preferred_language,
    ...(disease && { disease }),
    ...(weather_context && { weather_context }),
    ...(location && { location }),
  };

  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Server error ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch latest soil telemetry data.
 * @param {object} params
 * @param {string} params.deviceId
 * @param {boolean} [params.simulate]
 */
export async function getLatestSoilData({ deviceId, simulate = false }) {
  const query = new URLSearchParams({
    device_id: deviceId,
    simulate: simulate ? 'true' : 'false',
  });

  const response = await fetch(`${BASE_URL}/soil-latest?${query.toString()}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Server error ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch soil advice based on telemetry.
 * @param {object} params
 * @param {string} params.deviceId
 * @param {string} [params.crop]
 * @param {boolean} [params.simulate]
 */
export async function getSoilAdvice({ deviceId, crop = 'unknown', simulate = false }) {
  const query = new URLSearchParams({
    device_id: deviceId,
    crop,
    simulate: simulate ? 'true' : 'false',
  });

  const response = await fetch(`${BASE_URL}/soil-advice?${query.toString()}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Server error ${response.status}`);
  }

  return response.json();
}

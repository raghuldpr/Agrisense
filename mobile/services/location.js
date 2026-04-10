/**
 * services/location.js
 *
 * Shared helper for fetching the device's real GPS location.
 *
 * Returns: { latitude, longitude, label }
 * - On success:   real GPS coords + reverse-geocoded city/region label
 * - On failure:   Coimbatore fallback (silent — no crash, no alert)
 */

import * as Location from 'expo-location';

// ── Fallback (Coimbatore, Tamil Nadu) ─────────────────────────────────────────
export const FALLBACK_COORDS = {
  latitude: 11.0168,
  longitude: 76.9558,
  label: 'Coimbatore, Tamil Nadu',
};

/**
 * Build a human-readable label from a reverse-geocode result.
 * Falls back gracefully when fields are missing.
 */
function buildLabel(geocode) {
  if (!geocode || geocode.length === 0) return null;
  const g = geocode[0];
  const parts = [
    g.city || g.subregion || g.district || g.name,
    g.region || g.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Request foreground location permission and return the device's
 * current position with a place label.
 *
 * Usage:
 *   const { latitude, longitude, label } = await getCurrentLocation();
 */
export async function getCurrentLocation() {
  try {
    // 1. Request permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[Location] Permission denied — using Coimbatore fallback');
      return FALLBACK_COORDS;
    }

    // 2. Get current position (balanced accuracy, 10 s timeout)
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10000,
    });

    const { latitude, longitude } = position.coords;

    // 3. Reverse geocode for a human-readable label
    let label = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`; // safe default
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      const built = buildLabel(geocode);
      if (built) label = built;
    } catch (_) {
      // Reverse geocode is optional — keep coordinate label
    }

    console.log(`[Location] Real location: ${label} (${latitude}, ${longitude})`);
    return { latitude, longitude, label };
  } catch (err) {
    console.log('[Location] GPS error — using Coimbatore fallback:', err.message);
    return FALLBACK_COORDS;
  }
}

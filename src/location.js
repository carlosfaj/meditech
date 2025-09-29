// src/location.js
import * as Location from 'expo-location';

export async function askAndGetLocation() {
  // 1) pedir permisos
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permiso de ubicación denegado');
  }

  // 2) intenta usar el último fix conocido (rápido)
  let coords = (await Location.getLastKnownPositionAsync())?.coords;

  // 3) pide un fix fresco con la máxima precisión
  try {
    const fresh = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,   // GPS real
      maximumAge: 0,                         // no acepta caché
      timeout: 15000,                        // espera hasta 15s
      mayShowUserSettingsDialog: true,       // sugiere activar precisión alta
    });
    coords = fresh?.coords || coords;
  } catch {
    // si falla GPS, usamos el último conocido
  }

  if (!coords) throw new Error('No se pudo obtener la ubicación');
  return { lat: coords.latitude, lon: coords.longitude };
}

// helper: abrir Google Maps para navegar
export function mapsLink(lat, lon) {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

// app/Centros.js
import { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import * as Location from 'expo-location';
import { askAndGetLocation } from '../src/location';
import {
  initDB,
  seedCentrosNicaraguaOnce,
  getCentrosCercanos,
} from '../src/db';
import MapView, { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';

export default function CentrosScreen() {
  const [coords, setCoords] = useState(null);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  // guardamos la última coord en un ref por si hiciera falta
  const lastCoordRef = useRef(null);

  // función ÚNICA para cargar lista a partir de lat/lon explícitas
  const loadByCoords = async (lat, lon) => {
    setLoading(true);
    try {
      const data = await getCentrosCercanos(lat, lon, { limit: 10, maxKm: 500 });
      setItems(data);
      setErr(null);
      const c = { latitude: lat, longitude: lon };
      setCoords(c);
      lastCoordRef.current = c;
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  // primera carga
  useEffect(() => {
    (async () => {
      try {
        await initDB();
        await seedCentrosNicaraguaOnce();

const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErr('Permiso de ubicación denegado. Usa “Elegir en mapa”.');
          setLoading(false);
          return;
        }

        // último fix rápido
        const last = await Location.getLastKnownPositionAsync();
        let base = last?.coords;

        // fix nuevo
        try {
          const fresh = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
            mayShowUserSettingsDialog: true,
            maximumAge: 5000,
            timeout: 15000,
          });
          base = fresh?.coords || base;
        } catch {}

        if (!base) {
          setErr('No se pudo obtener la ubicación. Usa “Elegir en mapa”.');
          setLoading(false);
          return;
        }

        await loadByCoords(base.latitude, base.longitude);
      } catch (e) {
        setErr(String(e?.message || e));
        setLoading(false);
      }
    })();
  }, []);

  // botón: “ACTUALIZAR UBICACIÓN”
  const actualizarUbicacion = async () => {
    try {
      const fresh = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        mayShowUserSettingsDialog: true,
        maximumAge: 0,
        timeout: 15000,
      });
      await loadByCoords(fresh.coords.latitude, fresh.coords.longitude);
    } catch (e) {
      setErr('No se pudo actualizar. Intenta elegir en el mapa.');
    }
  };

  // botón: “ELEGIR EN MAPA” (mini-picker inline para no abrir otra pantalla)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tempCoord, setTempCoord] = useState(null);

  const openPicker = () => {
    const c = lastCoordRef.current || coords || { latitude: 12.1364, longitude: -86.2514 };
    setTempCoord(c);
    setPickerOpen(true);
  };
  const confirmPicker = async () => {
    if (tempCoord) {
      await loadByCoords(tempCoord.latitude, tempCoord.longitude);
      
    }
    setPickerOpen(false);
  };

  const formatKm = (km) => `${km.toFixed(km < 10 ? 1 : 0)} km`;
  
  // AUN FALLA LA UBICACIÓN, DETECTA LA UBICACIÓN PERO NO RECALCULA LOS CENTROS CERCANOS UNA VEZ SE ACTUALIZA ------------------------- FIXEAR
  
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
        <Pressable onPress={actualizarUbicacion} style={{ backgroundColor: '#0a84ff', padding: 10, borderRadius: 8 }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>ACTUALIZAR UBICACIÓN</Text>
        </Pressable>
        <Pressable onPress={openPicker} style={{ backgroundColor: '#0a84ff', padding: 10, borderRadius: 8 }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>ELEGIR EN MAPA</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 14, color: 'orange', marginBottom: 4 }}>
   Centros cercanos (BETA) – Función en desarrollo
</Text>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>Centros cercanos</Text>
      {err && <Text style={{ color: 'red', marginBottom: 8 }}>{err}</Text>}
      {coords && (
        <Text style={{ color: '#666', marginBottom: 6 }}>
          Pos: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
        </Text>
      )}
      {items[0] && (
        <Text style={{ color: '#666', marginBottom: 8 }}>
          Top: {items[0].Nombre} • {formatKm(items[0].DistKm)}
        </Text>
      )}

      {loading && <Text>Cargando…</Text>}
      {!loading && items.length === 0 && <Text style={{ color: '#666' }}>Sin centros en el radio configurado.</Text>}

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.ID_Clinica_Movil)}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Pressable style={{ borderWidth: 1, borderRadius: 12, padding: 12 }}>
            <Text style={{ fontWeight: '700' }}>{item.Nombre} · {item.Direccion}</Text>
            <Text style={{ color: '#666' }}>{item.Tipo || 'centro'} • {item.Telefono || 's/teléfono'}</Text>
            <Text style={{ marginTop: 6, color: '#0a84ff' }}>{formatKm(item.DistKm)}</Text>
          </Pressable>
        )}
      />

      {pickerOpen && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#00000066' }}>
          <View style={{ margin: 16, backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', flex: 1 }}>
            <MapView
              key={`${tempCoord?.latitude ?? 0},${tempCoord?.longitude ?? 0}`}
              style={{ flex: 1 }}
              initialRegion={{
                latitude: (tempCoord?.latitude ?? 12.1364),
                longitude: (tempCoord?.longitude ?? -86.2514),
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              onRegionChangeComplete={(reg) =>
                setTempCoord({ latitude: reg.latitude, longitude: reg.longitude })
              }
            >
              {tempCoord && <Marker coordinate={tempCoord} />}
            </MapView>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Pressable onPress={() => setPickerOpen(false)} style={{ padding: 14 }}>
                <Text style={{ color: '#0a84ff', fontWeight: '700' }}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={confirmPicker} style={{ padding: 14 }}>
                <Text style={{ color: '#0a84ff', fontWeight: '700' }}>Usar esta ubicación</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

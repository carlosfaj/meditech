// components/MapPicker.js
import { useState } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function MapPicker({
  visible,
  onClose,
  onConfirm,
  initial = { latitude: 12.13639, longitude: -86.25139 }, // Managua fallback
}) {
  const [selected, setSelected] = useState(initial);

  const region = {
    latitude: selected?.latitude ?? initial.latitude,
    longitude: selected?.longitude ?? initial.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };
  // Cuando el usuario confirma en el mapa:
router.replace({
  pathname: '/centros',
  params: { lat: marker.latitude, lon: marker.longitude },
});


  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={region}
          onPress={(e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setSelected({ latitude, longitude });
          }}
        >
          {selected && <Marker coordinate={selected} />}
        </MapView>

        <View style={{ padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' }}>
          <Text style={{ marginBottom: 8 }}>
            Toca el mapa para elegir. Seleccionado:
            {' '}
            {selected ? `${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}` : '—'}
          </Text>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={onClose}
              style={{ flex: 1, padding: 12, borderWidth: 1, borderRadius: 8, alignItems: 'center' }}
            >
              <Text>Cancelar</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (selected) onConfirm(selected);
                onClose();
              }}
              style={{ flex: 1, padding: 12, backgroundColor: '#0a84ff', borderRadius: 8, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Usar esta ubicación</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

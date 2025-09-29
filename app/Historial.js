// app/historial.js
import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  initDB, ensureLocalUser, listInteractionsByUser, deleteInteraction
} from '../src/db';

export default function HistorialScreen() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [uid, setUid] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      await initDB();
      const u = uid ?? await ensureLocalUser();
      if (!uid) setUid(u);
      const rows = await listInteractionsByUser(u);   // <-- ya filtra sin vacíos
      setItems(rows);
    } catch (e) {
      setError(String(e?.message || e));
    }
  }, [uid]);

  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => { if (alive) await cargar(); })();
    return () => { alive = false; };
  }, [cargar]));

  const confirmarBorrado = (id) => {
    Alert.alert(
      'Eliminar interacción',
      `¿Quieres eliminar la interacción #${id}? Esto borrará también sus mensajes y recomendaciones.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInteraction(id);
              await cargar(); // refrescar lista
            } catch (e) {
              setError(String(e?.message || e));
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex:1, padding:16 }}>

      {!!error && <Text style={{ color:'red', marginBottom:8 }}>Error: {error}</Text>}

      <FlatList
        data={items}
        ListEmptyComponent={
          <Text style={{ color:'#666', marginTop:16 }}>
            Aún no hay interacciones. Ve a la pestaña “Chat” para iniciar una.
          </Text>
        }
        keyExtractor={(it)=>String(it.ID_Interaccion)}
        ItemSeparatorComponent={() => <View style={{height:8}} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/interaccion/${item.ID_Interaccion}`)}
            onLongPress={() => confirmarBorrado(item.ID_Interaccion)}  // borrar con long press
            style={{ borderWidth:1, borderRadius:8, padding:12 }}
          >
            <Text style={{ fontWeight:'600' }}>
              #{item.ID_Interaccion} — {item.Motivo || 'consulta'}
            </Text>
            <Text style={{ color:'#666' }}>
              {item.Fecha_Interaccion} • {item.Estado}
            </Text>
            <Text style={{ color:'#999', fontSize:12, marginTop:4 }}>
              (Mantén presionado para eliminar)
            </Text>
          </Pressable>
        )}
        
      />
    </View>
  );
}

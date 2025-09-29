// app/interaccion/[id].js
import { View, Text, FlatList } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { initDB, listMessages } from '../../src/db';

export default function InteraccionDetalle() {
  const { id } = useLocalSearchParams(); // toma el :id de la URL
  const [msgs, setMsgs] = useState([]);

  useEffect(() => {
    (async () => {
      await initDB();
      const rows = await listMessages(Number(id));
      setMsgs(rows);
    })();
  }, [id]);

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:18, fontWeight:'600', marginBottom:8 }}>Interacción #{id}</Text>
      <FlatList
        data={msgs}
        keyExtractor={(m)=>String(m.ID_Mensaje)}
        renderItem={({ item }) => (
          <View style={{
            alignSelf: item.Rol==='user'?'flex-end':'flex-start',
            backgroundColor: item.Rol==='user' ? '#DCF8C6' : '#EEE',
            marginVertical:4, padding:10, borderRadius:8, maxWidth:'85%'
          }}>
            <Text>{item.Contenido}</Text>
          </View>
        )}
      />
    </View>
  );
}

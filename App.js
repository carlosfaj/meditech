import { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';
import { initDB, ensureLocalUser } from './src/db';
import Alergias from './src/screens/Alergias';
import Chat from './src/screens/Chat';

export default function App() {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [screen, setScreen] = useState('alergias'); // 'chat' | 'alergias'

  useEffect(() => {
    (async () => {
      await initDB();
      const id = await ensureLocalUser();
      setUserId(id);
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Inicializando BD…</Text></View>;
  }

  return (
    <View style={{ flex:1 }}>
      <View style={{ flexDirection:'row', gap:8, padding:10 }}>
        <Button title="Alergias" onPress={() => setScreen('alergias')} />
        <Button title="Chat" onPress={() => setScreen('chat')} />
      </View>
      {screen === 'alergias'
        ? <Alergias usuarioId={userId} />
        : <Chat usuarioId={userId} />
      }
    </View>
  );
}

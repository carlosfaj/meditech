// app/Chat.js
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, Image, TouchableOpacity } from 'react-native';
import {
  initDB, ensureLocalUser,
  startInteraction, addMessage, listMessages,
  createRecommendationChecked,
} from '../src/db';
import { getActiveAllergies } from '../src/db';
import { sendToOpenAIWithHistory } from '../src/openai';

export default function ChatScreen() {
  const [usuarioId, setUsuarioId] = useState(null);
  const [interId, setInterId] = useState(null);
  const [msgs, setMsgs] = useState([
    { ID_Mensaje: 'local-greeting', Rol: 'bot', Contenido: 'Hola, ¿en qué puedo ayudarte hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        const uid = await ensureLocalUser();
        setUsuarioId(uid);
      } catch (e) {
        setError(String(e?.message || e));
      }
    })();
  }, []);

  const refresh = async (id) => {
    const rows = await listMessages(id);
    setMsgs(rows);
  };

  const enviar = async () => {
    try {
      const txt = (input || '').trim();
      if (!txt || !usuarioId) return;

      let id = interId;
      if (!id) {
        id = await startInteraction(usuarioId, 'consulta');
        setInterId(id);
      }

      await addMessage(id, 'user', txt);
      setInput('');

      const current = await listMessages(id);
      const history = current.map(m => ({
        role: m.Rol === 'user' ? 'user' : 'assistant',
        content: m.Contenido
      }));

      const alergias = await getActiveAllergies(usuarioId);
      const patientContext = alergias.length
        ? `Alergias activas: ${alergias.map(a => `${a.Nombre} (${a.Tipo || 'n/d'})`).join(', ')}`
        : 'Sin alergias registradas';

      const ai = await sendToOpenAIWithHistory(history, patientContext);
      const replyText = ai.reply_text || 'No pude responder en este momento.';

      await addMessage(id, 'bot', replyText);

      if (ai.suggested_medication) {
        const med = String(ai.suggested_medication);
        const check = await createRecommendationChecked({
          interaccionId: id,
          usuarioId,
          medicamento: med,
          descripcion: `Sugerencia del asistente: ${med}`,
        });
        if (check && check.bloqueada) {
          await addMessage(
            id,
            'bot',
            `⚠️ No puedo recomendar ${med} por riesgo: ${check.motivoRiesgo}.`
          );
        }
      }

      await refresh(id);
      setError(null);
    } catch (e) {
      setError(String(e?.message || e));
    }
  };

  return (
    <View style={{ flex:1, backgroundColor:'#F8F9FA', padding:16 }}>
      {/* Logo y título */}
      <View style={{ alignItems:'center', marginBottom:12 }}>
        <Image
          source={require('../assets/logo.png')} // 👈 tu logo
          style={{ width:60, height:60, marginBottom:6 }}
          resizeMode="contain"
        />
        <Text style={{ fontSize:20, fontWeight:'700', color:'#333' }}>Chat</Text>
      </View>

      {!!error && <Text style={{ color:'red', marginBottom:8 }}>{error}</Text>}

      {/* Lista de mensajes */}
      <FlatList
        style={{ flex:1, marginBottom:12 }}
        data={msgs}
        keyExtractor={(m) => String(m.ID_Mensaje)}
        renderItem={({ item }) => (
          <View style={{
            alignSelf: item.Rol === 'user' ? 'flex-end' : 'flex-start',
            backgroundColor: item.Rol === 'user' ? '#007AFF' : '#E5E5EA',
            marginVertical: 4, padding: 12,
            borderRadius: 20,
            maxWidth: '80%',
          }}>
            <Text style={{
              color: item.Rol === 'user' ? 'white' : 'black',
              fontSize: 16
            }}>
              {item.Contenido}
            </Text>
          </View>
        )}
      />

      {/* Input y botón */}
      <View style={{
        flexDirection:'row',
        alignItems:'center',
        backgroundColor:'#fff',
        borderRadius:30,
        paddingHorizontal:12,
        paddingVertical:6,
        borderWidth:1,
        borderColor:'#ddd'
      }}>
        <TextInput
          placeholder="Escribe tu mensaje…"
          value={input}
          onChangeText={setInput}
          style={{ flex:1, padding:10, fontSize:16 }}
        />
        <TouchableOpacity
          onPress={enviar}
          style={{
            backgroundColor:'#007AFF',
            paddingVertical:10,
            paddingHorizontal:20,
            borderRadius:25,
            marginLeft:6
          }}
        >
          <Text style={{ color:'#fff', fontWeight:'700' }}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

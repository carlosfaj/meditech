import { useEffect, useState } from 'react';
import { View, Text, TextInput, Switch, Button, FlatList } from 'react-native';
import {
  initDB, ensureLocalUser,
  getDemografia, upsertDemografia,
  getAlergiasConEstado, setAlergiaUsuario, crearAlergia,
  getCondicionesConEstado, setCondicionUsuario, crearCondicion,
  seedAlergias, seedCondiciones,
} from '../src/db';

export default function PerfilScreen() {
  const [uid, setUid] = useState(null);

  // demografía
  const [edad, setEdad] = useState('');
  const [sexo, setSexo] = useState('X'); // 'M' | 'F' | 'X'
  const [embarazo, setEmbarazo] = useState(false);
  const [lactancia, setLactancia] = useState(false);
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');

  // alergias
  const [alergias, setAlergias] = useState([]);
  const [newAlergia, setNewAlergia] = useState('');
  const [newAlergiaTipo, setNewAlergiaTipo] = useState('');

  // condiciones
  const [condiciones, setCondiciones] = useState([]);
  const [newCond, setNewCond] = useState('');

  useEffect(() => {
    (async () => {
      await initDB();
      const id = await ensureLocalUser();
      setUid(id);
      await seedAlergias();
      await seedCondiciones();
      await cargarTodo(id);
    })();
  }, []);

  const cargarTodo = async (id) => {
    // demografía
    const d = await getDemografia(id);
    if (d) {
      setEdad(String(d.Edad ?? ''));
      setSexo(d.Sexo ?? 'X');
      setEmbarazo(!!d.Embarazo);
      setLactancia(!!d.Lactancia);
      setPeso(String(d.PesoKg ?? ''));
      setAltura(String(d.AlturaCm ?? ''));
    }
    // catálogos + estado
    setAlergias(await getAlergiasConEstado(id));
    setCondiciones(await getCondicionesConEstado(id));
  };

  const guardarDemografia = async () => {
    await upsertDemografia(uid, {
      Edad: parseInt(edad) || null,
      Sexo: (sexo || 'X').toUpperCase(),
      Embarazo: !!embarazo,
      Lactancia: !!lactancia,
      PesoKg: parseFloat(peso) || null,
      AlturaCm: parseFloat(altura) || null,
    });
    alert('Perfil guardado.');
  };

  const toggleAlergia = async (idAlergia, v) => {
    await setAlergiaUsuario(uid, idAlergia, v);
    setAlergias(await getAlergiasConEstado(uid));
  };

  const addAlergia = async () => {
    if (!newAlergia.trim()) return;
    await crearAlergia(newAlergia, newAlergiaTipo);
    setNewAlergia('');
    setAlergias(await getAlergiasConEstado(uid));
  };

  const toggleCond = async (idCond, v) => {
    await setCondicionUsuario(uid, idCond, v, 'Activa');
    setCondiciones(await getCondicionesConEstado(uid));
  };

  const addCond = async () => {
    if (!newCond.trim()) return;
    await crearCondicion(newCond);
    setNewCond('');
    setCondiciones(await getCondicionesConEstado(uid));
  };

  return (
    <FlatList
      ListHeaderComponent={
        <View style={{ padding:16 }}>
          {/* DEMOGRAFÍA */}
          <Text style={{ fontSize:18, marginTop:6, marginBottom:8 }}>Datos</Text>
          <View style={{ gap:8 }}>
            <TextInput placeholder="Edad" keyboardType="number-pad"
              value={edad} onChangeText={setEdad}
              style={{ borderWidth:1, padding:10 }} />
            <TextInput placeholder="Sexo (M/F/X)"
              value={sexo} onChangeText={setSexo}
              maxLength={1}
              style={{ borderWidth:1, padding:10 }} />
            <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
              <Text>Embarazo</Text>
              <Switch value={embarazo} onValueChange={setEmbarazo} />
              <Text style={{ marginLeft:12 }}>Lactancia</Text>
              <Switch value={lactancia} onValueChange={setLactancia} />
            </View>
            <TextInput placeholder="Peso (kg)" keyboardType="decimal-pad"
              value={peso} onChangeText={setPeso}
              style={{ borderWidth:1, padding:10 }} />
            <TextInput placeholder="Altura (cm)" keyboardType="decimal-pad"
              value={altura} onChangeText={setAltura}
              style={{ borderWidth:1, padding:10 }} />
            <Button title="Guardar perfil" onPress={guardarDemografia} />
          </View>

          {/* ALERGIAS */}
          <Text style={{ fontSize:18, marginTop:20, marginBottom:8 }}>Alergias</Text>
          <View style={{ flexDirection:'row', gap:8, marginBottom:10 }}>
            <TextInput placeholder="Nueva alergia" value={newAlergia}
              onChangeText={setNewAlergia} style={{ flex:1, borderWidth:1, padding:10 }} />
            <TextInput placeholder="tipo" value={newAlergiaTipo}
              onChangeText={setNewAlergiaTipo} style={{ width:140, borderWidth:1, padding:10 }} />
            <Button title="Agregar" onPress={addAlergia} />
          </View>
        </View>
      }
      data={alergias}
      keyExtractor={(it)=>`alg-${it.ID_Alergia}`}
      renderItem={({ item }) => (
        <View style={{
          marginHorizontal:16, marginBottom:8,
          borderWidth:1, borderRadius:8, padding:12,
          flexDirection:'row', justifyContent:'space-between', alignItems:'center'
        }}>
          <View>
            <Text style={{ fontWeight:'600' }}>{item.Nombre}</Text>
            <Text style={{ color:'#666' }}>{item.Tipo || '—'}</Text>
          </View>
          <Switch value={!!item.Activo} onValueChange={(v)=>toggleAlergia(item.ID_Alergia, v)} />
        </View>
      )}
      ListFooterComponent={
        <>
          {/* CONDICIONES */}
          <View style={{ padding:16 }}>
            <Text style={{ fontSize:18, marginTop:14, marginBottom:8 }}>Condiciones</Text>
            <View style={{ flexDirection:'row', gap:8, marginBottom:10 }}>
              <TextInput placeholder="Nueva condición" value={newCond}
                onChangeText={setNewCond} style={{ flex:1, borderWidth:1, padding:10 }} />
              <Button title="Agregar" onPress={addCond} />
            </View>
          </View>

          {condiciones.map(item => (
            <View key={`cond-${item.ID_Condicion}`} style={{
              marginHorizontal:16, marginBottom:8,
              borderWidth:1, borderRadius:8, padding:12,
              flexDirection:'row', justifyContent:'space-between', alignItems:'center'
            }}>
              <View>
                <Text style={{ fontWeight:'600' }}>{item.Nombre}</Text>
                <Text style={{ color:'#666' }}>{item.Estado || (item.Activa ? 'Activa' : '—')}</Text>
              </View>
              <Switch value={!!item.Activa} onValueChange={(v)=>toggleCond(item.ID_Condicion, v)} />
            </View>
          ))}

          <View style={{ height:24 }} />
        </>
      }
    />
  );
}

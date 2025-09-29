# MediTech — Asistente de Salud (Expo + SQLite + OpenAI)

Asistente de salud en español con:
- **Chat contextual** (lee el historial de la conversación).
- **Perfil del paciente**: alergias, condiciones y demografía (edad, sexo, peso, altura, embarazo/lactancia).
- **Centros de salud cercanos (BETA)** con actualización manual de ubicación o selección en mapa.
- **Historial de interacciones** con detalle por conversación.

> ⚠️ **Aviso**: Prototipo educativo. No reemplaza la evaluación ni las indicaciones de personal médico.

---

## Tabla de contenidos
- [Tecnologías](#tecnologías)
- [Estructura](#estructura)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Configuración de OpenAI](#configuración-de-openai)
- [Base de datos y datos de ejemplo](#base-de-datos-y-datos-de-ejemplo)
- [Flujo del chat](#flujo-del-chat)
- [Centros cercanos (BETA)](#centros-cercanos-beta)
- [Diferencias con el proyecto de Login](#diferencias-con-el-proyecto-de-login)
- [Build](#build)
- [Roadmap](#roadmap)
- [Licencia](#licencia)

---

## Tecnologías
- **Expo** 54 (React Native)
- **expo-router** (navegación por pestañas)
- **expo-sqlite** (persistencia local)
- **expo-location** (ubicación del usuario)
- **OpenAI Chat Completions API** (respuestas del asistente)

---

## Estructura
app/
_layout.js # Tabs: Centros | Chat | Perfil | Historial
Centros.js
Chat.js
Perfil.js
Historial.js
interaccion/[id].js # Detalle de conversación

src/
db.js # Esquema SQLite + consultas y reglas
openai.js # Llamada a OpenAI + system prompt
location.js # Utilidades de ubicación
MapPicker.js # Selector de ubicación en mapa (modal)

assets/
icon.png, splash.png, logo.png

---

## Instalación y ejecución
1) **Clonar e instalar**
```bash
git clone <este-repo>
cd meditech
npm install
Dependencias nativas (Expo)


npx expo install expo-sqlite expo-location expo-router
Iniciar en desarrollo


npx expo start
Abra la app Expo Go en Android y escanee el QR.

Configuración de OpenAI
La clave puede ir en un .env o directamente en src/openai.js durante demos locales.

Opción rápida (demo): editar src/openai.js y reemplazar OPENAI_API_KEY.

Opción recomendada: usar variables de entorno y leerlas con tu método preferido.

Modelo: gpt-4o-mini (ajustable en src/openai.js).
Privacidad: no envíes datos sensibles reales en producción sin consentimiento.

Base de datos y datos de ejemplo
El esquema se crea en initDB() (tabla de usuarios, demografía, alergias, condiciones, interacciones, mensajes, recomendaciones, unidades y clínicas móviles).

Semillas:

Alergias y condiciones básicas.

Centros de salud de Nicaragua (demo): seedCentrosNicaraguaOnce() carga ejemplos la primera vez.

Para evitar duplicados, db.js crea índices únicos (por ejemplo, en Alergia.Nombre, Condicion.Nombre, y combinaciones en centros).

Flujo del chat
El usuario escribe; si no existe interacción, se crea con startInteraction.

Se guarda el mensaje del usuario.

Se arma el historial (todos los mensajes previos de esa interacción) + contexto del paciente (alergias, condiciones y demografía).

Se llama a OpenAI (sendToOpenAIWithHistory) con un prompt estructurado para obtener:

reply_text (texto para el usuario)

suggested_medication (si aplica)

Se guarda la respuesta en SQLite.

Si hay suggested_medication, se valida contra alergias activas y se registra una Recomendación con severidad/acción (p. ej., prohibir si hay riesgo).

Centros cercanos (BETA)
Usa expo-location para obtener coordenadas.

Permite actualizar ubicación y elegir manualmente en un mapa.

Calcula distancias con Haversine y ordena de menor a mayor.

Muestra nombre, tipo, teléfono y distancia estimada.

BETA: No hay geocodificación inversa ni integración con un backend real; los centros cargados son de ejemplo (Nicaragua).

Diferencias con el proyecto de Login
Este repositorio no incluye autenticación.
Para fines de la entrega, el flujo de login/registro fue preparado en otra aplicación separada (proyecto complementario) donde se implementó el método de inicio de sesión.

Aquí se asume un usuario local creado automáticamente (helper ensureLocalUser()).

Si necesitas integrar login más adelante, puedes:

Reutilizar el flujo del otro proyecto (navegación inicial + pantallas de auth).

Sincronizar el ID_Usuario real con la base local y/o backend.

En resumen: el login existe pero está en un proyecto aparte, esta app se concentra en el chat clínico, perfil y centros.

Build
Para generar APK/Bundle:


# opción local (prebuild)
npx expo prebuild
npx expo run:android --variant release

# o con EAS
# npx expo install eas-cli
# eas build -p android
Roadmap
Mejorar “Centros cercanos (BETA)” con búsqueda por dirección y caché.

Adjuntar fotos/archivos en el chat.

Modo multi-usuario.

Endurecer validaciones clínicas y registrar “fuentes” con mayor granularidad.

Licencia
MIT — Uso académico/educativo.
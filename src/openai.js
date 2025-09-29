// src/openai.js
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";
// key en .env desde mi pc, el desarrollador deberá poner su propia clave si quiere ejecutar el código en su maquina
function cap(str, max = 800) {
  str = String(str || "");
  return str.length > max ? str.slice(0, max) : str;
}


export async function sendToOpenAIWithHistory(history = [], patientContext = "") {
  const system = `
Eres un asistente de salud en español. Debes usar:
1) El HISTORIAL de la conversación (mensajes previos).
2) El CONTEXTO DEL PACIENTE (alergias, condiciones y demografía).

INSTRUCCIONES CLÍNICAS (simplificadas para orientación, no diagnóstico):
- Pregunta acerca de mas información de los sintomas del paciente (p.ej., si tiene dolor de cabeza preguntale ¿cómo es?, que si ¿es punzante o constante? y cosas asi)
- Usa alergias/condiciones/demografía para evitar contraindicaciones.
- Si hay "Ubicación" y "Centros cercanos", cuando sugieras buscar ayuda presencial, menciona un centro cercano por nombre (si existe).
- Sé breve (máx ~10 líneas), claro y empático aunque no es necesario que estés sensibilizando con el usuario constantemente, con una única vez será suficiente, comportate mas profesional.
- Evita diagnósticos definitivos; sugiere signos de alarma y cuándo acudir a urgencias.
- Si sugieres un medicamento, incluye uno solo y común (si procede).

Almacena SOLO un JSON EXACTO:
{
  "reply_text": "string",
  "suggested_medication": "string|null"
}

No envíes al usuario sintaxis de programación.

Donde:
- "reply_text": tu respuesta breve para el paciente.
- "suggested_medication": nombre del medicamento si corresponde (ej. "ibuprofeno" o "amoxicilina"), o null si no procede.

=== CONTEXTO DEL PACIENTE ===
${patientContext || "ninguno"}
`.trim();

  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      ...history.map(m => ({ role: m.role, content: cap(m.content) })),
    ],
    temperature: 0.3,
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("OpenAI error:", t);
      return { reply_text: "No pude responder en este momento.", suggested_medication: null };
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";

    let out;
    try { out = JSON.parse(raw); }
    catch { out = { reply_text: raw, suggested_medication: null }; }

    return {
      reply_text: String(out.reply_text || "").slice(0, 1200),
      suggested_medication: out.suggested_medication || null,
    };
  } catch (e) {
    console.error("OpenAI fetch error:", e?.message || e);
    return { reply_text: "Error al conectar con el asistente.", suggested_medication: null };
  }

}

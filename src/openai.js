// src/openai.js
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";

function cap(str, max = 800) {
  str = String(str || "");
  return str.length > max ? str.slice(0, max) : str;
}

export async function sendToOpenAIWithHistory(history = [], patientContext = "") {
  const system = `
Eres un asistente de salud en español...
Contexto del paciente: ${patientContext || "ninguno"}.
`.trim();

  const body = {
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: system }, ...history.map(m => ({ role: m.role, content: cap(m.content) }))],
    temperature: 0.3,
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("OpenAI error:", t);
      return { reply_text: "No pude responder en este momento.", suggested_medication: null };
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let out; try { out = JSON.parse(raw); } catch { out = { reply_text: raw, suggested_medication: null }; }
    return {
      reply_text: String(out.reply_text || "").slice(0, 1200),
      suggested_medication: out.suggested_medication || null,
    };
  } catch (e) {
    console.error("OpenAI fetch error:", e?.message || e);
    return { reply_text: "Error al conectar con el asistente.", suggested_medication: null };
  }
}

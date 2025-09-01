export async function geminiChatAdapter({ prompt, agent, sessionId }) {
  const credentials = localStorage.getItem("mystaff_credentials");
  const GEMINI_API_KEY = JSON.parse(credentials || '{}').gemini;
  const model = agent?.model || 'gemini-2.5-flash'; // Changed to gemini-pro as a common default
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  if (!GEMINI_API_KEY) throw new Error('Gemini API key missing');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
  //    'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: agent?.adapter.system_prompt || 'You are a concise, professional assistant.' }] },
        { role: 'user', parts: [{ text: prompt }] },
      ],
      generationConfig: {
        temperature: agent?.adapter.temperature ?? 0.3,
      },
    }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(`Gemini API error: ${res.status} - ${errorData.error.message || JSON.stringify(errorData)}`);
  }

  const data = await res.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!content) throw new Error('Gemini empty content');
  return content;
}
// adapters/openai.js
// OpenAI Chat Completions
// Docs: https://platform.openai.com/docs/api-reference/chat

export async function openAIChatAdapter({ prompt, agent, sessionId }) {
  const credentials = localStorage.getItem("mystaff_credentials");
  const OPENAI_API_KEY = JSON.parse(credentials || '{}').openai;
  
  const apiKey = agent?.apiKey || OPENAI_API_KEY;
  const model = agent?.model || 'gpt-4o-mini';
  const url = agent?.serviceUrl || 'https://api.openai.com/v1/chat/completions';

  if (!apiKey) throw new Error('OpenAI apiKey missing');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: agent?.systemPrompt || 'You are a concise, professional assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: agent?.temperature ?? 0.3,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('OpenAI empty content');
  return content;
}

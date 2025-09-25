// adapters/openai.js
// OpenAI Chat Completions
// Docs: https://platform.openai.com/docs/api-reference/chat
import OpenAI from 'https://cdn.jsdelivr.net/npm/openai@latest/+esm';
//import OpenAI from 'https://esm.sh/openai@4.57.0';

export async function openAIChatAdapter({ prompt, agent, sessionId }) {
  const credentials = localStorage.getItem("mystaff_credentials");
  const OPENAI_API_KEY = JSON.parse(credentials || '{}').openai;
  
  const apiKey = OPENAI_API_KEY;
  const llm_model = agent?.adapter.model || 'gpt-4o-mini';
  const url = agent?.adapter.apiUrl || 'https://api.openai.com/v1/chat/completions';
  const client = new OpenAI({apiKey: apiKey, dangerouslyAllowBrowser: true});

  if (!apiKey) {
    alert('OpenAI API 키가 없습니다. Credential 페이지에서 설정해주세요.');
    window.location.href = './credentials.html';
    return;
  }

  const response = await client.chat.completions.create({
    model: llm_model,
    messages: [
      { role: 'system', content: agent?.adapter.system_prompt || 'You are a concise, professional assistant.' },
      { role: 'user', content: prompt }
    ],
    //tools: [{type:"web_search"}],
    temperature: 0.7
  });

  const content = response.choices[0].message.content;
  console.log(content);
  return content;
}

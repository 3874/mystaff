function assertOk(resp, data) {
  if (!resp.ok) {
    throw new Error(`HTTP error! status: ${resp.status}, data: ${JSON.stringify(data)}`);
  }
}

// adapters/http.js
// 임의의 HTTP JSON API (Bearer/커스텀 헤더 지원)
export async function genericHttpAdapter({ prompt, agent }) {
  let url = agent.service_url;
  url = 'http://ai.yleminvest.com:5678/webhook/mystaff-chat';

  const payload = {
    chatInput: prompt,
    sessionId: 'dflajdl-fjalsdfjal9-970jdsf'
  };

  const resp = await fetch(url, {
    method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `mystaff`,
      },
    body: JSON.stringify(payload),
  });

  const data = await resp.json().catch(() => ({}));
  assertOk(resp, data);
  return data[0]?.output || 'No response from server';
}

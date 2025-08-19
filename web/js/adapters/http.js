function assertOk(resp, data) {
  if (!resp.ok) {
    throw new Error(`HTTP error! status: ${resp.status}, data: ${JSON.stringify(data)}`);
  }
}

// adapters/http.js
// 임의의 HTTP JSON API (Bearer/커스텀 헤더 지원)
export async function genericHttpAdapter({ prompt, agent, sessionId }) {
  const url = agent.service_url;

  const payload = {
    chatInput: prompt,
    sessionId: sessionId
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

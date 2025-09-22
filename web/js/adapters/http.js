function assertOk(resp, data) {
  if (!resp.ok) {
    throw new Error(
      `HTTP error! status: ${resp.status}, data: ${JSON.stringify(data)}`
    );
  }
}

// adapters/http.js
// 임의의 HTTP JSON API (Bearer/커스텀 헤더 지원)
export async function genericHttpAdapter({ prompt, agent, sessionId }) {
  const url = agent.adapter.apiUrl;

  const payload = {
    prompt: prompt,
    sessionId: sessionId,
  };
  console.log(payload);
  const api_headers = agent.adapter.headers;
  const api_method = agent.adapter.method || "POST";

  const resp = await fetch(url, {
    method: api_method,
    headers: api_headers,
    body: JSON.stringify(payload),
  });
  console.log(resp);
  const data = await resp.json().catch(() => ({}));
  console.log(data);
  assertOk(resp, data);
  return data[0]?.output || "No response from server";
}

function assertOk(resp, data) {
  if (!resp.ok) {
    throw new Error(
      `HTTP error! status: ${resp.status}, data: ${JSON.stringify(data)}`
    );
  }
}

// adapters/http.js
// 임의의 HTTP JSON API (Bearer/커스텀 헤더 지원)
export async function moderatorAdapter({ prompt, agent, sessionId }) {
  const url = agent.adapter.apiUrl;

  const payload = {
    prompt: prompt.input,
    history: prompt.context,
    ltm: prompt.ltm,
    sessionId: sessionId,
    //    attached: attached,
  };

  console.log(payload);

  const api_headers = agent.adapter.headers;

  const resp = await fetch(url, {
    method: "POST",
    headers: api_headers,
    body: JSON.stringify(payload),
  });

  const data = await resp.json().catch(() => ({}));
  console.log(data);
  assertOk(resp, data);

  return data[0]?.output || "No response from server";
}

function assertOk(resp, data) {
  if (!resp.ok) {
    throw new Error(
      `HTTP error! status: ${resp.status}, data: ${JSON.stringify(data)}`
    );
  }
}

// adapters/moderator.js
export async function genericHttpAdapter({ processedInput, agent, sessionId }) {
  const host = agent?.adapter?.host;
  //const url = "http://172.30.1.84:5678/webhook-test/fileflickerDB";

  const payload = {
    input: processedInput,
    sessionId: sessionId,
  };

  const api_headers = agent?.adapter?.headers;
  const api_method = agent?.adapter?.method || "POST";

  const resp = await fetch(host, {
    method: api_method,
    headers: api_headers,
    body: JSON.stringify(payload),
  });

  const data = await resp.json().catch(() => ({}));

  assertOk(resp, data);
  return data[0]?.output || "No response from server";
}

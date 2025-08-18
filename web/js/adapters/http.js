// adapters/http.js
// 임의의 HTTP JSON API (Bearer/커스텀 헤더 지원)
export async function genericHttpAdapter({ prompt, agent }) {
  const url = agent?.serviceUrl;
  if (!url) throw new Error('HTTP adapter serviceUrl missing');

  const method = agent?.method || 'POST';
  const headers = {
    'Content-Type': 'application/json',
    ...(agent?.headers || {}),
  };

  // 옵션: Bearer 토큰
  if (agent?.apiKey && !headers.Authorization) {
    headers.Authorization = `Bearer ${agent.apiKey}`;
  }

  const payload = {
    prompt,
    context: agent?.context || null,
  };

  const res = await fetch(url, {
    method,
    headers,
    body: method.toUpperCase() === 'GET' ? undefined : JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return await res.json();
  return await res.text();
}

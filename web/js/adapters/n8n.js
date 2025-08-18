// adapters/n8n.js
// n8n Webhook: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
export async function n8nWebhookAdapter({ prompt, agent }) {
  const url = agent?.serviceUrl; // n8n webhook production URL
  if (!url) throw new Error('n8n serviceUrl missing');

  const method = agent?.method || 'POST';
  const headers = {
    'Content-Type': 'application/json',
    ...(agent?.headers || {}),
  };

  const body = {
    prompt,
    agentMeta: {
      staffId: agent?.staffId,
      name: agent?.name,
      role: agent?.role,
      token_limit: agent?.token_limit,
    },
  };

  const res = await fetch(url, {
    method,
    headers,
    body: method.toUpperCase() === 'GET' ? undefined : JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`n8n HTTP ${res.status}`);
  // n8n은 "Respond when last node finishes" 설정 시 마지막 노드의 데이터를 반환 가능
  const text = await res.text();
  // JSON일 수도, 순수 텍스트일 수도 있으므로 안전 처리
  try { return JSON.parse(text); } catch { return text; }
}

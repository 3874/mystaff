// adapters/index.js
import { openAIChatAdapter } from './openai.js';
import { n8nWebhookAdapter } from './n8n.js';
import { genericHttpAdapter } from './http.js';

const registry = {
  openai: openAIChatAdapter,
  n8n: n8nWebhookAdapter,
  http: genericHttpAdapter,
};

export function getAdapter(name = 'openai') {
  const key = String(name || '').toLowerCase();
  const adapter = registry[key];
  if (!adapter) throw new Error(`Unknown adapter: ${name}`);
  return adapter;
}

// adapters/index.js
import { openAIChatAdapter } from './openai.js';
import { genericHttpAdapter } from './http.js';
import { geminiChatAdapter } from './gemini.js';
//import { langchainAdapter } from './langchain.js';


const registry = {
  openai: openAIChatAdapter,
  gemini: geminiChatAdapter,
  http: genericHttpAdapter,
//  langchain: langchainAdapter,
};

export function getAdapter(name = 'openai') {
  const key = String(name || '').toLowerCase();
  const adapter = registry[key];
  if (!adapter) throw new Error(`Unknown adapter: ${name}`);
  return adapter;
}

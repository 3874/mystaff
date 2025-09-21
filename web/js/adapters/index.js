// adapters/index.js
import { openAIChatAdapter } from "./openai.js";
import { genericHttpAdapter } from "./http.js";
import { geminiChatAdapter } from "./gemini.js";
import { moderatorAdapter } from "./moderator.js";
//import { langchainAdapter } from './langchain.js';

const registry = {
  openai: openAIChatAdapter,
  gemini: geminiChatAdapter,
  http: genericHttpAdapter,
  moderator: moderatorAdapter,
  //  langchain: langchainAdapter,
};

export function getAdapter(name = "moderator") {
  const key = String(name || "").toLowerCase();
  const adapter = registry[key];
  if (!adapter) throw new Error(`Unknown adapter: ${name}`);
  return adapter;
}

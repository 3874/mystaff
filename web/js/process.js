// process.js
// 입력 전처리 + 출력 후처리

import { getDataByKey, updateData } from './database.js';
import { updateLTM, loadLTM } from './memory.js';
import { openAIChatAdapter } from './adapters/openai.js';

export async function preprocess(sessionId, input, agent, history = null) {
  const chatHistory = history ? history : (await getDataByKey('chat', sessionId))?.msg || [];
  const last10 = chatHistory.slice(-10);
  const ltm = await loadLTM(sessionId);
  const prompt = {
    input,
    context: last10,
    ltm: ltm?.contents || '',
    token_limit: agent?.token_limit || 2048
  };

  return prompt;
}


export async function postprocess(sessionID, currentChat) {
    await updateData('chat', sessionID, { msg: currentChat });
    const currentLTM = await loadLTM(sessionID);
    
    // LTM 업데이트
    const newLTM = await compareLTMbyServer(currentChat, currentLTM);
    console.log(newLTM);
    await updateLTM(sessionID, JSON.stringify(newLTM));
}

export async function compareLTMbyServer(currentChat, currentLTM) {
    const systemPrompt = `You are an AI assistant that helps maintain a user's Long-Term Memory (LTM).
      Based on the recent conversation below, compare LTM and your conversation. 
      If the conversation is very crucial and LTM doesn't include the contents of conversation, update LTM.
      If not, return the existing LTM as is.`;

    const chatData = `
      The user's current chat is:
      --- CURRENT CHAT ---
      ${JSON.stringify(currentChat, null, 2)}
      --- CURRENT CHAT ---

      The user's current LTM is:
      --- CURRENT LTM ---
      ${JSON.stringify(currentLTM, null, 2)}
      --- END CURRENT LTM ---
      `;

    const prompt = (systemPrompt + chatData).trim();
    const res = await openAIChatAdapter({
        prompt,
        agent: {
            apiKey: '',
            serviceUrl: '',
            model: ''
        }
    });
    return res;
}
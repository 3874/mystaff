// process.js
// 입력 전처리 + 출력 후처리

import { getDataByKey, updateData } from './database.js';
import { updateLTM, loadLTM } from './memory.js';
import { openAIChatAdapter } from './adapters/openai.js';

export async function preprocess(sessionId, input, agent) {
  const chat = await getDataByKey('chat', sessionId);
  const last10 = (chat?.msg || []).slice(-10);
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
      Based on the recent conversation below, determine if there is a need to update the LTM. 
      If an update is necessary, proceed with the update. 
      If not, send the existing LTM as is.`;

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
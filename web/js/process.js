// process.js
// 입력 전처리 + 출력 후처리

import { getDataByKey, updateData } from './database.js';
import { updateLTM, loadLTM } from './memory.js';
import { openAIChatAdapter } from './adapters/openai.js';

export async function preprocess(sessionId, input, agent) {
  const chat = await getDataByKey('chat', sessionId);
  const last10 = (chat?.msg || []).slice(-10);
  const ltm = await loadLTM(sessionId);
  console.log(agent);
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
    
    // In compareLTMbyServer, we now pass the whole chat history.
    // The function itself should handle extracting the relevant parts.
    const newLTM = await compareLTMbyServer(currentChat, currentLTM);
    console.log(newLTM);
    await updateLTM(sessionID, JSON.stringify(newLTM));
}

export async function compareLTMbyServer(currentChat, currentLTM) {
    const prompt = `
    You are an AI assistant that helps maintain a user's Long-Term Memory (LTM).
    Based on the recent conversation below, please update the LTM.

    The user's recent chat history is:
    --- CHAT HISTORY ---
    ${JSON.stringify(currentChat, null, 2)}
    --- END CHAT HISTORY ---

    The user's current LTM is:
    --- CURRENT LTM ---
    ${currentLTM}
    --- END CURRENT LTM ---

    Please analyze the chat history and update the LTM with any new information, modifications, or deletions.
    Provide only the raw string for the updated LTM.
    `;

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
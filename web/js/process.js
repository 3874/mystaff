// process.js
// 입력 전처리 + 출력 후처리

import { getDataByKey, updateData } from './database.js';

export async function preprocess(sessionId, input, agent, history = null) {
  const chatHistory = history ? history : (await getDataByKey('chat', sessionId))?.msg || [];
  const last10 = chatHistory.slice(-10);
  const ltm = await getDataByKey('LTM', sessionId);
  const prompt = {
    input,
    context: last10,
    ltm: ltm.contents || '',
    token_limit: agent?.adapter.token_limit || 2048
  };
  console.log(prompt);

  return prompt;
}

export async function postprocess(sessionId, currentChat) {
  const chatTurn = 5;
  await updateData('chat', sessionId, { msg: currentChat });
  const lastChat = currentChat[currentChat.length - 1];

  let newLTM = '';
  const currentLTM = await getDataByKey('LTM', sessionId);

  if (currentLTM && currentLTM.contents){
    newLTM = await generateLTM(currentChat.slice(-chatTurn), currentLTM.contents);
  } else {
    newLTM = {"first chat": `${lastChat.user}: ${lastChat.system}`};
  }

  await updateData('LTM', sessionId, {contents: newLTM});
}

export async function generateLTM(currentChat, currentLTM, timeout = 18000) {

  const endpoint = "https://8nlkobkyb6.execute-api.ap-northeast-2.amazonaws.com/default";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        currentChat,
        currentLTM
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status} ${res.statusText} — ${text || "no body"}`);
    }

    const raw = await res.json().catch(() => ({}));

    let data = typeof raw?.body === "string" ? safeParseJSON(raw.body) : (raw?.body ?? raw);

    let ltm =
      (data && typeof data === "object" && data.ltm) ??
      (data && typeof data === "object" && data.ltm_raw
        ? safeParseJSON(data.ltm_raw) ?? currentLTM
        : null);
    
    if (!ltm) {
      ltm = currentLTM;
    } 
    return ltm;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error("generateLTM timed out after " + timeout + "ms");
      // Return currentLTM on timeout to avoid breaking the flow
      return currentLTM;
    }
    // 타임아웃/네트워크/파싱 에러 로깅
    console.error("compareLTMbyServer failed:", err);
    // also return currentLTM on other errors
    return currentLTM;
  } finally {
    clearTimeout(timeoutId);
  }

  // 안전한 JSON 파서
  function safeParseJSON(s) {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }
}


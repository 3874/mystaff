
import { getDataByKey, updateData } from './database.js';

export async function preprocess(sessionId, input, agent, history = null) {
  const chatHistory = history ? history : (await getDataByKey('chat', sessionId))?.msg || [];
  const last10 = chatHistory.slice(-10);
  const ltm = await getDataByKey('LTM', sessionId) || {};
  const prompt = {
    input,
    context: last10,
    ltm: ltm.contents || '', 
    token_limit: agent.adapter.token_limit || 2048
  };
  return prompt;
}

/**
 * 안전한 JSON 파서 (이 함수는 더 이상 LTM 처리에 사용되지 않지만, 다른 곳에서 사용될 수 있으므로 유지합니다.)
 * @param {string} s - 파싱할 JSON 문자열
 * @returns {object|null} 파싱된 객체 또는 null (파싱 실패 시)
 */
function safeParseJSON(s) {
  try {
    return JSON.parse(s);
  } catch (e) {
    console.error("Failed to parse JSON string:", s, "Error:", e);
    return null;
  }
}

export async function postprocess(sessionId, currentChat) {

  await updateData('chat', sessionId, { msg: currentChat });

  let chatTextForLTM = "";
  if (Array.isArray(currentChat) && currentChat.length > 0) {
    const lastMessageObject = currentChat[currentChat.length - 1];
    if (lastMessageObject) {
      const parts = [];
      if (lastMessageObject.user) {
        parts.push(`User: ${lastMessageObject.user}`);
      }
      if (lastMessageObject.system) {
        parts.push(`AI: ${lastMessageObject.system}`);
      }
      chatTextForLTM = parts.join('\n');
    }
  } else {
    console.warn("currentChat is not an array or is empty. Sending an empty string for currentChat in LTM generation.");
    chatTextForLTM = "";
  }

  let newLTM = null; 
  const storedLTM = await getDataByKey('LTM', sessionId);
  
  let ltmTextForLLM = (storedLTM && typeof storedLTM.contents === 'string') ? storedLTM.contents : '';
  
  if (!ltmTextForLLM) {
    console.log("No existing LTM found or contents are empty. Initializing LTM with an empty string for LLM.");
  }

  try {
    newLTM = await generateLTM(chatTextForLTM, ltmTextForLLM);
  } catch (error) {
    console.error("Error during generateLTM call:", error);
    newLTM = ltmTextForLLM; 
  }


  if (newLTM && typeof newLTM === 'string' && newLTM.length > 0) {
    try {
      const newLTMJObj = JSON.parse(newLTM);
      if (newLTMJObj && typeof newLTMJObj.body === 'string') {
        const content = newLTMJObj.body.replace(/^```markdown/, '').replace(/```$/, '').trim();
        await updateData('LTM', sessionId, { contents: content });
      } else {
        console.warn("newLTMJObj.body is not a string or newLTMJObj is missing.");
      }
    } catch (error) {
      console.error("Failed to parse newLTM JSON:", error);
    }
  } else {
    console.warn("newLTM is not a valid non-empty string. Skipping LTM update.", newLTM);
  }

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
        currentChat: currentChat, 
        currentLTM: currentLTM   
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status} ${res.statusText} — ${text || "no body"}`);
    }

    const newLTMContent = await res.text(); 

    if (!newLTMContent || newLTMContent.trim() === '') {
      return currentLTM;
    }

    return newLTMContent;   
  } catch (err) {
    if (err.name === 'AbortError') {
      return currentLTM; 
    }
    return currentLTM; 
  } finally {
    clearTimeout(timeoutId);
  }
}


export async function generateLTM2(currentChat, currentLTM) {
  try {
    const response = await fetch('http://localhost:5678/webhook/mystaff-ltm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentChat: currentChat, currentLTM: currentLTM }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP 오류! 상태: ${response.status}\n${errorText}`);
    }

    const responseData = await response.json();
    // The original code expected responseText.message.content
    return responseData.message.content;
  } catch (error) {
    console.error('generateLTM2 요청 실패:', error);
    throw error; // Re-throw the error so the caller can handle it.
  }
}

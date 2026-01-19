import { getDataByKey } from "./database.js";
import { loadLTM, updateLTM } from "./memory.js";
import OpenAI from "https://cdn.jsdelivr.net/npm/openai@latest/+esm";

async function getFileContentById(fileId) {
  if (!fileId) return null;
  try {
    const fileData = await getDataByKey("myfiles", fileId);
    return fileData || null;
  } catch (error) {
    console.error(`Error fetching file with ID ${fileId}:`, error);
    return null;
  }
}

export async function preprocess(sessionId, input, agent, history = null) {
  const regex = /(?<!\S)@(\S+)/g;
  const matches = Array.from(input.matchAll(regex));
  const chatHistory = history
    ? history
    : (await getDataByKey("chat", sessionId))?.msg || [];
  const last20 = chatHistory.slice(-20);
  const ltm = await loadLTM(sessionId);

  let allFilesInfo = [];
  let modifiedInput = input;

  if (matches.length > 0) {
    const filePromises = matches.map((match) => getFileContentById(match[1]));
    const filesData = await Promise.all(filePromises);

    const fileIdToNameMap = {};
    filesData.forEach((fileData, i) => {
      if (fileData && fileData.fileName) {
        const fileId = matches[i][1];
        fileIdToNameMap[fileId] = fileData.fileName;
      }
    });

    modifiedInput = input.replace(regex, (match, fileId) => {
      return fileIdToNameMap[fileId] || match;
    });

    for (const fileData of filesData) {
      if (fileData && fileData.contents) {
        const { contents, fileName } = fileData;
        allFilesInfo.push(`[File: ${fileName}]\n\n${contents}`);
        // removed unused join() inside loop
      }
    }
  }

  const allFilesText = allFilesInfo.length
    ? allFilesInfo.join("\n\n---------------------------------------\n\n")
    : "";

  // MemGPT 스타일의 계층적 메모리 포맷팅
  let ltmText = "";
  if (ltm && ltm.contents) {
    let mem;
    // 하위 호환성: 기존 문자열 데이터 처리
    if (typeof ltm.contents === 'string') {
      mem = { core: ltm.contents, archival: [] };
    } else {
      mem = ltm.contents;
    }

    ltmText = `[CORE MEMORY (Essential Context)]\n${mem.core || "Empty"}\n\n`;
    if (mem.archival && Array.isArray(mem.archival) && mem.archival.length > 0) {
      ltmText += `[ARCHIVAL MEMORY (Historical Facts)]\n- ${mem.archival.join('\n- ')}`;
    }
  }

  const prompt = {
    action: 'chat',
    prompt: modifiedInput,
    history: last20,
    ltm: ltmText,
    file: allFilesText || "",
    token_limit: agent?.adapter?.token_limit || 128000,
  };
  return prompt;
}

export async function postprocess(sessionId, currentChat) {
  // 1. 마지막 메시지 오브젝트 추출
  if (!Array.isArray(currentChat) || currentChat.length === 0) return;
  const lastMessage = currentChat[currentChat.length - 1];

  const userText = lastMessage.user || "";
  const aiText = lastMessage.system || "";

  // 유저나 AI 메시지가 모두 없으면 처리 중단
  if (!userText && !aiText) return;

  const chatTextForLTM = `User: ${userText}\nAI: ${aiText}`.trim();

  // 2. 기존 LTM 로드 및 구조화 (MemGPT 스타일)
  const storedLTM = await loadLTM(sessionId);
  let currentMem = { core: "", archival: [] };

  if (storedLTM && storedLTM.contents) {
    if (typeof storedLTM.contents === 'string') {
      currentMem = { core: storedLTM.contents, archival: [] };
    } else {
      currentMem = storedLTM.contents;
    }
  }

  try {
    // 3. MemGPT 관리자 호출 (OpenAI JSON Mode 사용)
    const updatedMemJSON = await generateLTM(chatTextForLTM, JSON.stringify(currentMem));

    if (updatedMemJSON) {
      try {
        const finalMem = JSON.parse(updatedMemJSON);

        // 데이터 무결성 체크 후 업데이트
        if (finalMem && typeof finalMem === 'object' && 'core' in finalMem) {
          await updateLTM(sessionId, { contents: finalMem });
          console.log("Memory updated successfully (MemGPT style)");
        }
      } catch (parseError) {
        console.error("Failed to parse MemGPT response as JSON:", parseError, updatedMemJSON);
      }
    }
  } catch (error) {
    console.error("Failed to process MemGPT LTM update:", error);
  }
}

export async function generateLTM(currentChat, currentMemJSON, timeout = 18000) {
  const credentials = localStorage.getItem("mystaff_credentials");
  const apiKey = JSON.parse(credentials || "{}").openai;

  if (!apiKey) {
    console.warn("OpenAI API key missing for LTM generation.");
    return null;
  }

  const client = new OpenAI({ apiKey: apiKey, dangerouslyAllowBrowser: true });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a MemGPT-style Memory Manager. You manage a JSON-based memory system with two tiers:
1. "core": Essential, high-level, and persistent information about the user (e.g., identity, fundamental preferences, core personality, long-term goals). Limit to approx 500 characters.
2. "archival": A list of discrete, important historical facts or small updates learned from the chat (e.g., "User ate chicken for lunch", "User finished Project A").

Your Task:
- Review the "Recent Chat" and the "Current Memory".
- Update "core" if any fundamental information about the user has changed or been newly revealed.
- Append new significant facts to "archival". Keep this list concise.
- Ensure the output is a valid JSON object with the keys "core" and "archival".
- IMPORTANT: Use the same language as the "Recent Chat" for all text entries in core and archival.
- If the chat is in Korean, the memory should be in Korean. If English, use English.`
        },
        {
          role: "user",
          content: `Current Memory: ${currentMemJSON}\n\nRecent Chat:\n${currentChat}\n\nReturn updated memory ONLY as a JSON object, maintaining language consistency:`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }, { timeout: timeout });

    return response.choices[0].message.content;
  } catch (err) {
    console.error("OpenAI MemGPT generation error:", err);
    return null;
  }
}

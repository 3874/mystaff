import { getDataByKey, updateData } from "./database.js";
import { genericHttpAdapter } from "./adapters/http.js";
import { getDefaultAgentById } from "./allAgentsCon.js";

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
  const ltm = (await getDataByKey("LTM", sessionId)) || "";

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
      }
    }
  }

  const prompt = {
    prompt: modifiedInput,
    history: last20,
    ltm: ltm.contents || "",
    file:
      allFilesInfo.join("\n\n---------------------------------------\n\n") ||
      "",
    token_limit: agent.adapter.token_limit || 128000,
  };
  return prompt;
}

export async function postprocess(sessionId, currentChat) {
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
      chatTextForLTM = parts.join("\n");
    }
  } else {
    console.warn(
      "currentChat is not an array or is empty. Sending an empty string for currentChat in LTM generation."
    );
    chatTextForLTM = "";
  }

  let newLTM = null;
  const storedLTM = await getDataByKey("LTM", sessionId);
  const responder = await getDefaultAgentById("default_20250922_00001");
  if (!responder) {
    console.error("Responder not found. Aborting LTM generation.");
    return;
  }

  let ltmTextForLLM =
    storedLTM && typeof storedLTM.contents === "string"
      ? storedLTM.contents
      : "";

  if (!ltmTextForLLM) {
    console.log(
      "No existing LTM found or contents are empty. Initializing LTM with an empty string for LLM."
    );
  }

  try {
    newLTM = await generateLTM(
      chatTextForLTM,
      ltmTextForLLM
      //      responder,
      //      sessionId
    );
  } catch (error) {
    console.error("Error during generateLTM call:", error);
    newLTM = ltmTextForLLM;
  }

  if (newLTM && typeof newLTM === "string") {
    try {
      const content = newLTM
        .replace(/^```markdown/, "")
        .replace(/```$/, "")
        .trim();
      await updateData("LTM", sessionId, { contents: content });
    } catch (error) {
      console.error("Failed to update LTM with new content:", error);
    }
  } else {
    console.warn(
      "newLTM is not a valid non-empty string. Skipping LTM update.",
      newLTM
    );
  }
}

// export async function generateLTM(currentChat, currentLTM, agent, sessionId) {
//   const prompt = `[currentChat]: ${currentChat}\n\n>>>>><<<<<\n\n[currentLTM]: ${currentLTM}\n\n`;
//   const response = await genericHttpAdapter({ prompt, agent, sessionId });
//   console.log("LTM API response:", response);
//   return response;
// }

export async function generateLTM(currentChat, currentLTM, timeout = 18000) {
  const url =
    "https://8nlkobkyb6.execute-api.ap-northeast-2.amazonaws.com/default";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  console.log(currentChat);
  console.log(currentLTM);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        currentChat: currentChat,
        currentLTM: currentLTM,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `API ${res.status} ${res.statusText} — ${text || "no body"}`
      );
    }

    const newLTM = await res.text();
    console.log("New LTM content:", newLTM);

    if (!newLTM || newLTM.trim() === "") {
      return currentLTM;
    }

    const parsedContent = JSON.parse(newLTM);
    const newLTMContent = parsedContent.body || currentLTM;
    console.log("Parsed LTM content:", newLTMContent);

    return newLTMContent;
  } catch (err) {
    if (err.name === "AbortError") {
      return currentLTM;
    }
    return currentLTM;
  } finally {
    clearTimeout(timeoutId);
  }
}

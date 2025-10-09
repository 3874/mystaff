import { getDataByKey, updateData } from "./database.js";

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

  // Helper: convert history array -> single string
  function convertHistoryToText(historyArr) {
    if (!Array.isArray(historyArr) || historyArr.length === 0) return "";
    return historyArr
      .map((msg) => {
        // common shapes: { user, system } or { role, content } or plain strings
        if (typeof msg === "string") return msg;
        if (msg.user && msg.system) {
          return `User: ${msg.user}\nAI: ${msg.system}`;
        }
        if (msg.role && msg.content) {
          return `${msg.role === "user" ? "User" : msg.role === "assistant" ? "AI" : msg.role}: ${msg.content}`;
        }
        if (msg.user) return `User: ${msg.user}`;
        if (msg.system) return `AI: ${msg.system}`;
        // fallback: JSON
        try {
          return JSON.stringify(msg);
        } catch (e) {
          return String(msg);
        }
      })
      .join("\n\n---\n\n");
  }

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

  const ltmText = (ltm && (ltm.contents || (typeof ltm === "string" ? ltm : ""))) || "";

  const prompt = {
    action: 'chat',
    prompt: modifiedInput,
    history: convertHistoryToText(last20), 
    ltm: ltmText, 
    file: allFilesText || "", 
    token_limit: agent?.adapter?.token_limit || 128000,
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

export async function generateLTM(currentChat, currentLTM, timeout = 18000) {
  const url = "https://8nlkobkyb6.execute-api.ap-northeast-2.amazonaws.com/default";
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

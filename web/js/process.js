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

  const ltmText = (ltm && (ltm.contents || (typeof ltm === "string" ? ltm : ""))) || "";

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
  const storedLTM = await loadLTM(sessionId);

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
      await updateLTM(sessionId, { contents: content });
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
  const credentials = localStorage.getItem("mystaff_credentials");
  const apiKey = JSON.parse(credentials || "{}").openai;

  if (!apiKey) {
    console.warn("OpenAI API key missing for LTM generation.");
    return currentLTM;
  }

  const client = new OpenAI({ apiKey: apiKey, dangerouslyAllowBrowser: true });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-oss-120b",
      messages: [
        {
          role: "system",
          content: "You are an assistant that summarizes and updates Long-Term Memory (LTM) based on chat history. Keep the LTM concise and focused on key facts, preferences, and progress. Return ONLY the updated LTM text without any conversational fillers or markdown formatting if possible."
        },
        {
          role: "user",
          content: `Current LTM:\n${currentLTM}\n\nRecent Chat:\n${currentChat}\n\nUpdated LTM:`
        }
      ],
      temperature: 0.3,
    }, { timeout: timeout });

    const newLTMContent = response.choices[0].message.content.trim();
    console.log("New LTM content from OpenAI:", newLTMContent);

    return newLTMContent || currentLTM;
  } catch (err) {
    console.error("OpenAI LTM generation error:", err);
    return currentLTM;
  }
}

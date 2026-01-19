import { getDataByKey, updateData } from "./database.js";
import { getAgentById } from "./allAgentsCon.js";
import { preprocess, postprocess } from "./process.js";
import { handleMsg } from "./agents.js";
import { apiPost } from "./utils.js";
import { vectorDB } from "./vector-db.js";

export async function startDiscussion(
  topic,
  { sessionId, currentChat, renderMessages, postprocess },
  iteration
) {
  const chatData = await getDataByKey("chat", sessionId);
  const participantsIds = [chatData.staffId, ...(chatData.attendants || [])];
  const participants = [];
  for (const id of participantsIds) {
    participants.push(await getAgentById(id));
  }

  if (participants.length < 1) {
    alert("There are not enough participants for a discussion.");
    return;
  }

  let conversationHistory = [];
  let currentTurn = 0;
  let lastMessage = "";

  // Turn 0: Host asks the first question
  const host = participants[0];
  const initialPrompt = `${topic}`;

  let processedInput = await preprocess(sessionId, initialPrompt, host, []);
  let response = await handleMsg(processedInput, host, sessionId);
  lastMessage = response;

  let chatTurn = {
    system: response,
    date: new Date().toISOString(),
    speaker: host.staff_name,
  };
  currentChat.push(chatTurn);
  conversationHistory.push({
    user: initialPrompt,
    system: response,
    speaker: host.staff_name,
  });
  renderMessages(currentChat);
  currentTurn++;
  await new Promise((resolve) => setTimeout(resolve, 1500));

  while (currentTurn < iteration) {
    const speakerIndex = currentTurn % participants.length;
    const currentSpeaker = participants[speakerIndex];
    let inputForNextAgent = `Based on ${lastMessage}, first answer directly and explain your reasoning in detail. `;

    if (currentTurn + 1 == iteration) {
      inputForNextAgent += `Finally, summarize the discussion in detail.`;
    } else {
      inputForNextAgent += `Then, if you have one, ask exactly one most important and non-redundant question at the end.`;
    }

    processedInput = await preprocess(
      sessionId,
      inputForNextAgent,
      currentSpeaker,
      conversationHistory
    );
    response = await handleMsg(processedInput, currentSpeaker, sessionId);
    await postprocess(sessionId, currentChat);
    lastMessage = response;

    chatTurn = {
      system: response,
      date: new Date().toISOString(),
      speaker: currentSpeaker.staff_name,
    };
    currentChat.push(chatTurn);
    conversationHistory.push({
      user: inputForNextAgent,
      system: response,
      speaker: currentSpeaker.staff_name,
    });

    renderMessages(currentChat);

    currentTurn++;
    inputForNextAgent = "";
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

export async function filesearch(topic, fileId, context) {
  let fileData = null;
  let fileName = null;
  let contents = null;
  let staffId = null;

  if (!fileId) {
    console.error("getFileById: fileId is required.");
    return null;
  }
  try {
    fileData = await getDataByKey("myfiles", fileId);
  } catch (error) {
    console.error(`Error fetching file with ID ${fileId}:`, error);
    return null;
  }

  if (fileData) {
    fileName = fileData.fileName;
    contents = fileData.contents;
    staffId = fileData.staffId;
  } else {
    console.error(`File with ID ${fileId} not found.`);
    alert(`File with ID ${fileId} not found.`);
  }

  // 1. 벡터 데이터베이스에서 가장 유사한 컨텍스트 검색
  let results = [];
  try {
    results = await vectorDB.search(topic, 5, [fileId]);
    console.log("Vector search results:", results);
  } catch (err) {
    console.error("Vector search failed, falling back to full text:", err);
  }

  // 검색 결과가 있으면 컨텍스트를 구성, 없으면 전체 내용을 사용 (폴백)
  let contextText = contents;
  if (results.length > 0) {
    contextText = results.map(r => `[From ${r.fileName}]\n${r.text}`).join("\n\n---\n\n");
  }

  const responder = await getAgentById(staffId);
  if (!responder) {
    alert("Could not find the main agent for this chat.");
    return;
  }

  const messageToSend = `다음 파일의 내용을 참고해서 사용자의 질문에 답해줘.\n\n[참고 내용]:\n${contextText}\n\n[질문]:\n${topic}`;

  const processedInput = {
    action: 'chat',
    prompt: messageToSend,
    history: context.currentChat.slice(-5),
    ltm: '',
    file: '',
    token_limit: responder?.adapter?.token_limit || 128000,
    references: results // UI에서 출처를 표시할 수 있도록 함
  };

  const response = await handleMsg(processedInput, responder, context.sessionId);

  const systemMessage = {
    system: response,
    date: new Date().toISOString(),
    speaker: responder.staff_name,
    speakerId: responder.staff_id,
    references: results
  };
  context.currentChat.push(systemMessage);
  context.renderMessages(context.currentChat);
  await updateData("chat", context.sessionId, { msg: context.currentChat });
  await postprocess(context.sessionId, context.currentChat);
}


export async function fileupload(fileId) {
  let fileData = null;
  let fileName = null;
  let contents = null;
  let summary = null;
  let staffId = null;
  let location = null;

  if (!fileId) {
    console.error("getFileById: fileId is required.");
    return null;
  }

  try {
    fileData = await getDataByKey("myfiles", fileId);
  } catch (error) {
    console.error(`Error fetching file with ID ${fileId}:`, error);
    return null;
  }

  if (fileData) {
    fileName = fileData.fileName;
    contents = fileData.contents;
    summary = fileData.summary;
    staffId = fileData.staffId;
    location = fileData.location;
  } else {
    console.error(`File with ID ${fileId} not found.`);
    alert(`File with ID ${fileId} not found.`);
  }

  const responder = await getAgentById(staffId);
  if (!responder) {
    alert("Could not find the main agent for this chat.");
    return;
  }

  const uploadURL = responder.adapter?.host;
  const body = {
    action: 'upload',
    file_name: fileName,
    contents: contents,
    summary: summary,
    staff_id: staffId,
    location: location
  };

  const response = await apiPost(uploadURL, body);
  return response;
}
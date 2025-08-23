import { getDataByKey } from './database.js';
import { getAgentById } from './allAgentsCon.js';
import { preprocess } from './process.js';
import { handleMsg } from './agents.js';

export async function startDiscussion(topic, { sessionId, currentChat, renderMessages, postprocess }) {
    const chatData = await getDataByKey('chat', sessionId);
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
    let lastMessage = '';

    // Turn 0: Host asks the first question
    const host = participants[0];
    const initialPrompt = `${topic}`;
    
    let processedInput = await preprocess(sessionId, initialPrompt, host, []);
    let response = await handleMsg(processedInput, host, sessionId);
    lastMessage = response;

    let chatTurn = { system: response, date: new Date().toISOString(), speaker: host.staff_name };
    currentChat.push(chatTurn);
    conversationHistory.push({ user: initialPrompt, system: response, speaker: host.staff_name });
    renderMessages(currentChat);
    currentTurn++;
    await new Promise(resolve => setTimeout(resolve, 1500));


    // Turns 1-9: All participants discuss
    while (currentTurn < 10) {
        const speakerIndex = currentTurn % participants.length;
        const currentSpeaker = participants[speakerIndex];

        const inputForNextAgent = `Based on ${lastMessage}, you have to answer the question if the questions are helpful to tackle the topic. And ask the relevent questions to know more about the topic.`;
        
        processedInput = await preprocess(sessionId, inputForNextAgent, currentSpeaker, conversationHistory);
        response = await handleMsg(processedInput, currentSpeaker, sessionId);
        await postprocess(sessionId, currentChat);
        lastMessage = response;

        chatTurn = { system: response, date: new Date().toISOString(), speaker: currentSpeaker.staff_name };
        currentChat.push(chatTurn);
        conversationHistory.push({ user: inputForNextAgent, system: response, speaker: currentSpeaker.staff_name });
        
        renderMessages(currentChat);

        currentTurn++;
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
   
}
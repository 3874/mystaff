// chat.js (jQuery version)
import { getDataByKey, getAllData, addData, updateData, deleteData } from '../database.js';
import { deleteLTM } from '../memory.js';
import { handleMsg } from '../agents.js';
import { preprocess, postprocess } from '../process.js';
import { getAgentById } from '../allAgentsCon.js';

let sessionId = null;
let mystaff = null;
let currentChat = [];

$(document).ready(async function() {
    await initializeChat();
    bindUIEvents();
});

async function initializeChat() {
    checkApiKey();

    const params = new URLSearchParams(window.location.search);
    sessionId = params.get('sessionId');
    const staffId = params.get('staffId');

    if (!sessionId && !staffId) {
        window.location.href = 'mystaff.html';
        return;
    } else if (!sessionId && staffId) {
        const agent = await getAgentById(staffId);
        if (!agent) {
            window.location.href = 'mystaff.html';
            return;
        } else {
            const finalUrl = await FindUrl(agent);
            window.location.href = finalUrl;
            return;
        }
    } 

    await loadChatSession(sessionId);
    await loadSessionList();
}

function checkApiKey() {
    const apiKey = localStorage.getItem("OPENAI_API_KEY");
    const modalElement = $('#apiKeyModal')[0];
    if (!modalElement) return;

    const apiKeyModal = new bootstrap.Modal(modalElement);

    if (!apiKey) {
        apiKeyModal.show();
        $('#saveApiKeyBtn').on('click', () => {
            const inputVal = $('#apiKeyInput').val();
            if (inputVal) {
                localStorage.setItem("OPENAI_API_KEY", inputVal);
                apiKeyModal.hide();
            }
        });
    }
}

async function loadChatSession(id) {
    const chatData = await getDataByKey('chat', id);
    console.log(chatData);
    if (chatData) {
        currentChat = chatData.msg || [];
        renderMessages(currentChat);

        if (chatData.staffId) {
            mystaff = await getAgentById(chatData.staffId);
        } else {
            mystaff = null;
        }
        $('#chatTitle').text(chatData.title || "Chat");
    }
}

async function loadSessionList() {
    const allSessions = await getAllData('chat');
    const $list = $('#sessionList');
    $list.empty();

    // Filter sessions by current staffId
    const filteredSessions = allSessions.filter(session => session.staffId === mystaff.staffId);

    filteredSessions.forEach(session => { // Iterate over filteredSessions
        console.log('Session object:', session); // Keep for debugging
        const isActive = session.sessionId === sessionId ? 'active' : '';
        const listItem = `
            <li class="list-group-item ${isActive} d-flex justify-content-between align-items-center" data-session-id="${session.sessionId}">
                <span class="session-title" style="cursor:pointer;">${session.title || "Untitled"}</span>
                <div class="dropdown">
                    <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false"></button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item edit-title" href="#">Edit Title</a></li>
                        <li><a class="dropdown-item delete-session" href="#">Delete</a></li>
                    </ul>
                </div>
            </li>`;
        $list.append(listItem);
    });
}

function renderMessages(msgs) {
    const $container = $('#chatMessages');
    let messagesHtml = '';
    msgs.forEach(m => {
        if (m.user) {
            messagesHtml += `
                <div class="msg-user">
                    <p>${m.user}</p>
                    <span class="msg-date text-muted small">${new Date(m.date).toLocaleString()}</span>
                </div>`;
        }
        if (m.system) {
            messagesHtml += `
                <div class="msg-system">
                    <p>${m.system}</p>
                    <span class="msg-date text-muted small">${new Date(m.date).toLocaleString()}</span>
                </div>`;
        }
    });
    $container.html(messagesHtml);
    $container.prop('scrollTop', $container.prop('scrollHeight'));
}

function bindUIEvents() {
    $('#sendBtn').on('click', sendMessage);
    $('#messageInput').on('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });

    $('#fileUploadBtn').on('click', () => {
        $('#fileInput').click();
    });

    $('#fileInput').on('change', handleFileUpload);

    // Event delegation for session list actions
    $('#sessionList').on('click', '.session-title', function() {
        const newSessionId = $(this).closest('li').data('session-id');
        if (newSessionId !== sessionId) {
            window.location.href = `chat.html?sessionId=${newSessionId}`;
        }
    });

    $('#sessionList').on('click', '.edit-title', async function(e) {
        e.preventDefault();
        const $listItem = $(this).closest('.list-group-item');
        const sessionToEditId = $listItem.data('session-id');
        const currentTitle = $listItem.find('.session-title').text();
        const newTitle = prompt("Enter new title", currentTitle);
        if (newTitle) {
            await updateData('chat', sessionToEditId, { title: newTitle });
            loadSessionList();
        }
    });

    $('#sessionList').on('click', '.delete-session', async function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to delete this session?')) {
            const $listItem = $(this).closest('.list-group-item');
            const sessionToDeleteId = $listItem.data('session-id');
            const chatData = await getDataByKey('chat', sessionToDeleteId);
            const staffIdToDelete = chatData.staffId;

            await deleteData('chat', sessionToDeleteId);
            await deleteLTM(sessionToDeleteId);

            if (sessionToDeleteId === sessionId) {
                const allSessions = await getAllData('chat');
                const nextSession = allSessions.find(s => s.staffId === staffIdToDelete);
                if (nextSession) {
                    window.location.href = `chat.html?sessionId=${nextSession.sessionId}`;
                } else if (staffIdToDelete) {
                    window.location.href = `chat.html?staffId=${staffIdToDelete}`;
                } else {
                    window.location.href = 'chat.html';
                }
            } else {
                loadSessionList();
            }
        }
    });
}

async function sendMessage() {
    const $inputEl = $('#messageInput');
    const text = $inputEl.val().trim();
    if (!text) return;

    if (!mystaff) {
        alert("Please select a staff member to chat with.");
        return;
    }

    const tempUserMsg = { user: text, date: new Date().toISOString() };
    currentChat.push(tempUserMsg);
    renderMessages(currentChat);
    $inputEl.val('');

    const processedInput = await preprocess(sessionId, text, mystaff);
    const response = await handleMsg(processedInput, mystaff);

    currentChat.pop();
    const chatTurn = { user: text, system: response, date: new Date().toISOString() };
    currentChat.push(chatTurn);

    renderMessages(currentChat);
    await postprocess(sessionId, currentChat);
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const content = await file.text();
    await addData('myfiles', { sessionId, staffId: mystaff?.staff_id?.S || null, contents: content });
}

async function FindUrl(mystaff) {
  const outputType = mystaff.output_type;
  const staffId = mystaff.staffId;
  let Furl;

  if (!staffId) {
    window.location.href = 'mystaff.html';
    return;
  } else if (!outputType || outputType === 'text') {
    Furl = `chat.html`;
  } else {
    Furl = `chat-${outputType}.html`;
  } 

  let finalSessionId = null;

  // Get all chat sessions
  const allChats = await getAllData('chat'); // getAllData is already imported

  if (allChats && allChats.length > 0) {
    // Find a session with the matching staffId
    const foundSession = allChats.find(session => session.staffId === staffId);
    if (foundSession) {
      finalSessionId = foundSession.sessionId;
    }
  }

  if (!finalSessionId) {
    // If no existing session found, create a new one
    finalSessionId = crypto.randomUUID();
    await addData('chat', {
        sessionId: finalSessionId,
        staffId: staffId,
        title: 'New Chat',
        msg: []
    });
  }

  Furl = `${Furl}?sessionId=${finalSessionId}`;
  return Furl;
}


// chat.js
import { getDataByKey, getAllData, addData, updateData, deleteData } from '../database.js';
import { deleteLTM } from '../memory.js';
import { handleMsg } from '../agents.js';
import { preprocess, postprocess } from '../process.js';
import { getAgentById } from '../allAgentsCon.js';

let sessionId = null;
let mystaff = null; // Start with null, will be loaded
let currentChat = [];

// 초기 로딩
window.addEventListener('DOMContentLoaded', async () => {
  checkApiKey();

  const params = new URLSearchParams(window.location.search);
  sessionId = params.get('sessionId');
  const staffId = params.get('staffId');

  if (!sessionId) {
    // Create a new session if no sessionId is provided
    sessionId = crypto.randomUUID();
    const agent = staffId ? await getAgentById(staffId) : null;
    const title = agent ? `Chat with ${agent.name.S}` : "New Session";

    await addData('chat', {
      sessionId,
      staffId: staffId, // Use staffId from URL, or null
      title: title,
      msg: []
    });
    // Update URL to reflect the new session, removing the initial staffId param
    history.replaceState(null, "", `chat.html?sessionId=${sessionId}`);
  }

  await loadChatSession(sessionId);
  await loadSessionList();
  bindUIEvents();
});

// API 키 체크 및 모달 (Bootstrap 5)
function checkApiKey() {
  const apiKey = localStorage.getItem("OPENAI_API_KEY");
  const modalElement = document.getElementById('apiKeyModal');
  if (!modalElement) return;
  const apiKeyModal = new bootstrap.Modal(modalElement);

  if (!apiKey) {
    apiKeyModal.show();

    document.getElementById('saveApiKeyBtn').onclick = () => {
      const input = document.getElementById('apiKeyInput');
      if (input.value) {
        localStorage.setItem("OPENAI_API_KEY", input.value);
        apiKeyModal.hide();
      }
    };
  }
}

// 세션 불러오기
async function loadChatSession(id) {
  const chatData = await getDataByKey('chat', id);
  if (chatData) {
    currentChat = chatData.msg || [];
    renderMessages(currentChat);

    if (chatData.staffId) {
      mystaff = await getAgentById(chatData.staffId);
    } else {
      // If no staffId is associated, maybe use a default or clear mystaff
      mystaff = null; 
    }

    document.getElementById('chatTitle').innerText = chatData.title || "Chat";
  }
}

// 세션 리스트 불러오기 (Bootstrap Dropdown version)
async function loadSessionList() {
  const allSessions = await getAllData('chat');
  const list = document.getElementById('sessionList');
  list.innerHTML = ''; // Clear existing list

  allSessions.forEach(session => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = session.title || "Untitled";
    titleSpan.style.cursor = 'pointer';
    titleSpan.onclick = () => window.location.href = `chat.html?sessionId=${session.sessionId}`;
    
    const dropdownDiv = document.createElement('div');
    dropdownDiv.className = 'dropdown';

    const menuBtn = document.createElement('button');
    menuBtn.className = 'btn btn-sm btn-secondary dropdown-toggle';
    menuBtn.type = 'button';
    menuBtn.setAttribute('data-bs-toggle', 'dropdown');
    menuBtn.setAttribute('aria-expanded', 'false');
    
    const dropdownMenu = document.createElement('ul');
    dropdownMenu.className = 'dropdown-menu';
    
    const editLi = document.createElement('li');
    const editBtn = document.createElement('button');
    editBtn.className = 'dropdown-item';
    editBtn.textContent = 'Edit Title';
    editBtn.onclick = async () => {
        const newTitle = prompt("Enter new title", session.title);
        if (newTitle) {
            await updateData('chat', session.sessionId, { title: newTitle });
            loadSessionList(); // Refresh the list
        }
    };
    editLi.appendChild(editBtn);

    const deleteLi = document.createElement('li');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'dropdown-item';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = async () => {
        if (confirm('Are you sure you want to delete this session?')) {
            const staffIdToDelete = session.staffId;

            // Perform deletion
            await deleteData('chat', session.sessionId);
            await deleteLTM(session.sessionId);

            // If we deleted the session we are currently in
            if (sessionId === session.sessionId) {
                const allSessions = await getAllData('chat');
                const nextSession = allSessions.find(s => s.staffId === staffIdToDelete);

                if (nextSession) {
                    // Found another session with the same staff, go to it
                    window.location.href = `chat.html?sessionId=${nextSession.sessionId}`;
                } else if (staffIdToDelete) {
                    // No other session for this staff, create a new one for them
                    window.location.href = `chat.html?staffId=${staffIdToDelete}`;
                } else {
                    // No staff associated, just go to a generic new chat
                    window.location.href = 'chat.html';
                }
            } else {
                // We deleted an inactive session, just refresh the list
                loadSessionList();
            }
        }
    };
    deleteLi.appendChild(deleteBtn);

    dropdownMenu.appendChild(editLi);
    dropdownMenu.appendChild(deleteLi);
    
    dropdownDiv.appendChild(menuBtn);
    dropdownDiv.appendChild(dropdownMenu);

    li.appendChild(titleSpan);
    li.appendChild(dropdownDiv);
    list.appendChild(li);
  });
}


// 메시지 렌더링
function renderMessages(msgs) {
  const container = document.getElementById('chatMessages');
  container.innerHTML = '';
  msgs.forEach(m => {
    // Render user message
    if (m.user) {
        const userDiv = document.createElement('div');
        userDiv.className = 'msg-user';
        userDiv.innerHTML = `<p>${m.user}</p>`;
        if (m.date) {
            const dateEl = document.createElement('span');
            dateEl.className = 'msg-date text-muted small';
            dateEl.textContent = new Date(m.date).toLocaleString();
            userDiv.appendChild(dateEl);
        }
        container.appendChild(userDiv);
    }

    // Render system message
    if (m.system) {
        const systemDiv = document.createElement('div');
        systemDiv.className = 'msg-system';
        systemDiv.innerHTML = `<p>${m.system}</p>`;
        if (m.date) {
            const dateEl = document.createElement('span');
            dateEl.className = 'msg-date text-muted small';
            dateEl.textContent = new Date(m.date).toLocaleString();
            systemDiv.appendChild(dateEl);
        }
        container.appendChild(systemDiv);
    }
  });
  container.scrollTop = container.scrollHeight;
}

// UI 이벤트 바인딩
function bindUIEvents() {
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('messageInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') sendMessage();
  });

  document.getElementById('fileUploadBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });

  document.getElementById('fileInput').addEventListener('change', handleFileUpload);
}

// 메시지 전송
async function sendMessage() {
  const inputEl = document.getElementById('messageInput');
  const text = inputEl.value.trim();
  if (!text) return;
  
  if (!mystaff) {
      alert("Please select a staff member to chat with.");
      // Here you could implement a UI to select an agent
      return;
  }

  // Show user message immediately
  const tempUserMsg = { user: text, date: new Date().toISOString() };
  currentChat.push(tempUserMsg);
  renderMessages(currentChat);

  inputEl.value = '';


  const processedInput = await preprocess(sessionId, text, mystaff);
  const response = await handleMsg(processedInput, mystaff);

  // Replace temp user message with the full chat turn object
  currentChat.pop(); // remove tempUserMsg
  const chatTurn = { user: text, system: response, date: new Date().toISOString() };
  currentChat.push(chatTurn);

  renderMessages(currentChat); // Re-render with the full turn

  await postprocess(sessionId, currentChat); // Pass the whole chat array
}

// 파일 업로드
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const content = await file.text();
  await addData('myfiles', { sessionId, staffId: mystaff?.staff_id?.S || null, contents: content });
}
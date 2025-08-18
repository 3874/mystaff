// chat.js
import { getDataByKey, getAllData, addData, updateData, deleteData } from './database.js';
import { deleteLTM } from './memory.js';
import { handleMsg } from './agents.js';
import { preprocess, postprocess } from './process.js';
import { getAgentById } from './allAgentsCon.js';

let sessionId = null;
let mystaff =   {
    "staff_id": {
      "S": "mystaff_20240726_00001"
    },
    "name": {
      "S": "박오픈"
    },
    "creation_date": {
      "S": "2024-07-26T10:00:00Z"
    },
    "description": {
      "S": "한글로 고객들의 상담을 해주는 AI BOT"
    },
    "functionJSON": {
      "M": {
        "ai_provider": {
          "S": "openai"
        },
        "service_model": {
          "S": "gpt-4o-mini"
        },
        "service_type": {
          "S": "text"
        }
      }
    },
    "imgUrl": {
      "S": "./img/avatar/avatar-1.png"
    },
    "lang": {
      "S": "한국어"
    },
    "provider_name": {
      "S": "mystaff"
    },
    "role": {
      "S": "CS 상담"
    },
    "staff_type": {
      "S": "in-house"
    },
    "status": {
      "S": "active"
    },
    "update_date": {
      "S": ""
    },
    "version": {
      "S": "0.1"
    }
  };
let currentChat = [];

// 초기 로딩
window.addEventListener('DOMContentLoaded', async () => {
  checkApiKey();

  sessionId = new URLSearchParams(window.location.search).get('sessionId');

  if (!sessionId) {
    // sessionId 없는 경우 새로 생성
    sessionId = crypto.randomUUID();
    await addData('chat', {
      sessionId,
      staffId: null,
      title: "New Session",
      msg: []
    });
    // URL 업데이트 (새 sessionId 반영)
    history.replaceState(null, "", `chat.html?sessionId=${sessionId}`);
  }

  await loadChatSession(sessionId);
  await loadSessionList();
  bindUIEvents();
});

// API 키 체크 및 모달
function checkApiKey() {
  const apiKey = localStorage.getItem("OPENAI_API_KEY");
  if (!apiKey) {
    const modal = document.getElementById('apiKeyModal');
    modal.style.display = 'flex';

    document.getElementById('saveApiKeyBtn').onclick = () => {
      const input = document.getElementById('apiKeyInput');
      if (input.value) {
        localStorage.setItem("OPENAI_API_KEY", input.value);
        modal.style.display = 'none';
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
    }

    document.getElementById('chatTitle').innerText = chatData.title || "Chat";
  }
}

// 세션 리스트 불러오기
async function loadSessionList() {
  const allSessions = await getAllData('chat');
  const list = document.getElementById('sessionList');
  list.innerHTML = '';

  allSessions.forEach(session => {
    const li = document.createElement('li');
    li.textContent = session.title || "Untitled";
    li.onclick = () => window.location.href = `chat.html?sessionId=${session.sessionId}`;

    const menuBtn = document.createElement('button');
    menuBtn.textContent = ":";
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      showSessionMenu(e.target, session);
    };

    li.appendChild(menuBtn);
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
            dateEl.className = 'msg-date';
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
            dateEl.className = 'msg-date';
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

// 세션 메뉴
function showSessionMenu(btn, session) {
  const menu = document.createElement('div');
  menu.className = 'dropdown-menu';
  menu.innerHTML = `
    <button id="editTitle">Edit Title</button>
    <button id="deleteSession">Delete</button>
  `;
  document.body.appendChild(menu);
  menu.style.top = `${btn.getBoundingClientRect().bottom}px`;
  menu.style.left = `${btn.getBoundingClientRect().left}px`;

  menu.querySelector('#editTitle').onclick = async () => {
    const newTitle = prompt("Enter new title", session.title);
    if (newTitle) {
      await updateData('chat', session.sessionId, { title: newTitle });
      loadSessionList();
    }
    menu.remove();
  };

  menu.querySelector('#deleteSession').onclick = async () => {
    await deleteData('chat', session.sessionId);
    await deleteLTM(session.sessionId);
    loadSessionList();
    menu.remove();
  };
}

// 파일 업로드
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const content = await file.text();
  await addData('myfiles', { sessionId, staffId: mystaff?.staffId || null, contents: content });
}
import { signOut } from "../utils.js";
import { moderatorAdapter } from "../adapters/moderator.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";
import { initAuthGuard } from "../auth-guard.js";

$(document).ready(async function () {
  // 인증 체크
  if (!(await initAuthGuard())) {
    return; // 인증 실패 시 리다이렉트됨
  }

  // Initialize moderator chat in the body
  initModeratorChatInBody();

  $("#signOutBtn").on("click", function (e) {
    e.preventDefault();
    signOut();
  });
});

/**
 * Initialize the moderator chat functionality directly in the page body
 */
function initModeratorChatInBody() {
  setupChatHandlers();
}

/**
 * Setup all event handlers for the chat functionality
 */
function setupChatHandlers() {
  // Send button handler
  $("#send-btn").on("click", async function (event) {
    event.preventDefault();
    const userInput = $("#user-input").val().trim();
    if (!userInput) return;

    renderMessages([{ user: userInput, date: new Date() }]);
    $("#user-input").val("");

    // Show loading state
    showLoadingMessage();

    try {
      const response = await moderatorAdapter({
        prompt: userInput,
        history: [],
        sessionId: "moderator-session",
      });

      // Remove loading message
      removeLoadingMessage();

      if (response) {
        renderMessages([{ system: response, date: new Date() }]);
      }
    } catch (error) {
      removeLoadingMessage();
      console.error("Error getting moderator response:", error);
      renderMessages([{ 
        system: "죄송합니다. 응답을 가져오는 중 오류가 발생했습니다.", 
        date: new Date() 
      }]);
    }
  });

  // Enter key handler for input
  $("#user-input").on("keypress", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      $("#send-btn").click();
    }
  });

  // Add button handler
  $("#addBtn").on("click", function () {
    // 파일 선택 다이얼로그 열기
    $("#fileInput").click();
  });

  // File input change handler
  $("#fileInput").on("change", async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      await uploadFile(file);
      // 파일 업로드 후 input 값 초기화
      $(this).val("");
    } catch (error) {
      console.error("File upload error:", error);
      alert("파일 업로드 중 오류가 발생했습니다: " + error.message);
    }
  });
}


function showLoadingMessage() {
  const loadingHtml = `
    <div class="msg-container mb-3" id="loading-message">
      <div class="msg-content msg-system p-3" style="background-color: #6c757d;">
        <div class="d-flex align-items-center">
          <div class="spinner-border spinner-border-sm me-2" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <span>응답을 생성하고 있습니다...</span>
        </div>
      </div>
    </div>
  `;
  $("#chatMessages").append(loadingHtml);
  $("#chatMessages").prop("scrollTop", $("#chatMessages").prop("scrollHeight"));
}


function removeLoadingMessage() {
  $("#loading-message").remove();
}

/**
 * Render chat messages in the chat area
 * @param {Array} msgs - Array of message objects
 */
function renderMessages(msgs) {
  const $container = $("#chatMessages");
  if (!$container.length) return;

  let messagesHtml = "";

  for (const m of msgs) {
    if (m.user) {
      messagesHtml += `
        <div class="msg-container mb-3">
            <div class="msg-content msg-user position-relative p-3">
                <p><b>User:</b></p>
                <div class="message-text">${m.user}</div>
                <span class="msg-date text-muted small" style="display: none;">${new Date(
                  m.date
                ).toLocaleString()}</span>
            </div>
        </div>`;
    }
    if (m.system) {
      const speakerName = m.speaker || "Moderator";
      let bgColor = "#6c757d";
      const systemHtml = marked.parse(m.system);
      messagesHtml += `
        <div class="msg-container mb-3">
            <div class="msg-content msg-system position-relative p-3" style="background-color: ${bgColor};">
                <p><b>${speakerName}:</b></p>
                <div class="message-text">${systemHtml}</div>
                <span class="msg-date text-muted small" style="color: #ccc; display: none;">${new Date(
                  m.date
                ).toLocaleString()}</span>
            </div>
        </div>`;
    }
  }
  $container.append(messagesHtml);
  $container.prop("scrollTop", $container.prop("scrollHeight"));
}

/**
 * Upload file to the moderator database
 * @param {File} file - The file to upload
 */
async function uploadFile(file) {
  const maxSize = 100 * 1024 * 1024;
  
  if (file.size > maxSize) {
    throw new Error("파일 크기가 10MB를 초과합니다.");
  }

  // Show upload progress message
  renderMessages([{ 
    system: `파일 "${file.name}"을 업로드하고 있습니다...`, 
    date: new Date() 
  }]);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', file.name);
  formData.append('fileSize', file.size);
  formData.append('uploadedAt', new Date().toISOString());

  try {
    const response = await fetch('https://ai.yleminvest.com/webhook/aicrew/moderatorDB/upload', {
      method: 'POST',
      body: formData,
      headers: {
        "Authorization": `mystaff`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`서버 오류 (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    
    // Show success message
    renderMessages([{ 
      system: `✅ 파일 "${file.name}"이 성공적으로 업로드되었습니다.\n응답: ${JSON.stringify(result, null, 2)}`, 
      date: new Date() 
    }]);

    console.log('File upload successful:', result);
    
  } catch (error) {
    // Show error message
    renderMessages([{ 
      system: `❌ 파일 업로드 실패: ${error.message}`, 
      date: new Date() 
    }]);
    
    throw error;
  }
}



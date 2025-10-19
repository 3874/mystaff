import { getDataByKey, updateData, addData, deleteData } from "./database.js";
import { moderatorAdapter } from "./adapters/moderator.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

/**
 * Initialize the moderator chat functionality on any page
 * This adds the floating QA bot button and chat modal
 */
export function initModeratorChat() {
  // Add the floating QA bot button
  const qaBotButton = `
    <button id="qa-bot-fab" class="btn btn-primary rounded-circle shadow" style="position: fixed; bottom: 80px; right: 20px; width: 60px; height: 60px; font-size: 24px; z-index: 1000; display: flex; align-items: center; justify-content: center;">
      <i class="fas fa-question"></i>
    </button>
  `;

  // Add the chat modal
  const chatModal = `
    <div
      class="modal fade"
      id="chatModal"
      tabindex="-1"
      aria-labelledby="chatModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="chatModalLabel">Chat</h5>
            <button
              type="button"
              class="btn btn-outline-danger btn-sm ms-2"
              id="resetChatBtn"
            >
              <i class="fa fa-rotate-left"></i> Reset
            </button>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body" style="height: 70vh; overflow-y: auto">
            <div id="chatMessages" class="p-3">
              <!-- Chat messages will be appended here -->
            </div>
          </div>
          <div class="modal-footer">
            <div class="input-group">
              <input
                type="text"
                class="form-control"
                placeholder="메시지를 입력하세요..."
                aria-label="Recipient's username"
                aria-describedby="send-btn"
                id="user-input"
              />
              <button class="btn btn-primary" type="button" id="send-btn">
                전송
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  $("body").append(qaBotButton);
  $("body").append(chatModal);

  // Setup event handlers
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

    const response = await moderatorAdapter({
      prompt: userInput,
      history: [],
      sessionId: "test-session",
    });

    if (response) {
      renderMessages([{ system: response, date: new Date() }]);
      await saveChatMessage({
        sessionId: "moderator",
        user: userInput,
        system: response,
      });
    }
  });

  // Enter key handler for input
  $("#user-input").on("keypress", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      $("#send-btn").click();
    }
  });

  // QA bot button handler
  $("#qa-bot-fab").on("click", async function (event) {
    event.preventDefault();
    $("#chatModal").modal("show");

    // Load moderator chat history
    const chatData = await getDataByKey("chat", "moderator");
    if (chatData && chatData.msg) {
      const msgs = chatData.msg.flatMap((m) => (m.msg ? m.msg : []));
      renderMessages(msgs);
    }
  });

  // Reset chat button handler
  $("#resetChatBtn").on("click", async function () {
    await deleteData("chat", "moderator");
    $("#chatMessages").empty();
  });

  // Copy button handler (delegated event)
  $(document).on("click", ".copy-btn", function () {
    const textToCopy = decodeURIComponent($(this).data("copytext"));
    navigator.clipboard.writeText(textToCopy).then(() => {
      const originalHtml = $(this).html();
      $(this).html('<i class="fas fa-check"></i>');
      setTimeout(() => {
        $(this).html(originalHtml);
      }, 1000);
    });
  });
}

/**
 * Render chat messages in the chat modal
 * @param {Array} msgs - Array of message objects
 */
function renderMessages(msgs) {
  const $container = $("#chatMessages");
  if (!$container.length) return;

  let messagesHtml = "";
  const copyIcon = '<i class="fas fa-copy"></i>';

  for (const m of msgs) {
    if (m.user) {
      const userTextForCopy = encodeURIComponent(m.user);
      messagesHtml += `
        <div class="msg-container mb-3">
            <div class="msg-content msg-user position-relative p-3">
                <button class="btn btn-sm btn-outline-light copy-btn position-absolute top-0 end-0 mt-1 me-1" data-copytext="${userTextForCopy}" title="Copy">${copyIcon}</button>
                <p><b>User:</b></p>
                <div class="message-text">${m.user}</div>
                <span class="msg-date text-muted small" hidden>${new Date(
                  m.date
                ).toLocaleString()}</span>
            </div>
        </div>`;
    }
    if (m.system) {
      const speakerName = m.speaker || "Moderator";
      let bgColor = "#6c757d";
      const systemHtml = marked.parse(m.system);
      const systemTextForCopy = encodeURIComponent(m.system);
      messagesHtml += `
        <div class="msg-container mb-3">
            <div class="msg-content msg-system position-relative p-3" style="background-color: ${bgColor};">
                <button class="btn btn-sm btn-outline-light copy-btn position-absolute top-0 end-0 mt-1 me-1" data-copytext="${systemTextForCopy}" title="Copy">${copyIcon}</button>
                <p><b>${speakerName}:</b></p>
                <div class="message-text">${systemHtml}</div>
                <span class="msg-date text-muted small" style="color: #ccc;" hidden>${new Date(
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
 * Save chat message to IndexedDB
 * @param {Object} params - Parameters for saving chat message
 * @param {string} params.sessionId - Session ID for the chat
 * @param {string} params.user - User message
 * @param {string} params.system - System response
 */
async function saveChatMessage({ sessionId, user, system }) {
  if (!user || !system) return;
  
  const chatData = {
    sessionId,
    msg: [
      {
        date: new Date().toISOString(),
        speaker: "moderator",
        speakerId: "",
        system: system,
        user: user,
      },
    ],
    title: "moderator chat",
    staffId: "moderator",
  };

  try {
    const existing = await getDataByKey("chat", sessionId);
    if (existing) {
      if (!existing.msg) {
        existing.msg = [];
      }
      existing.msg.push(chatData);
      await updateData("chat", sessionId, existing);
    } else {
      const newChat = {
        sessionId,
        msg: [chatData],
      };
      await addData("chat", newChat);
    }
  } catch (err) {
    console.error("Failed to save chat message:", err);
  }
}

/**
 * Open the moderator chat modal programmatically
 * Can be called from anywhere after initModeratorChat()
 */
export async function openModeratorChat() {
  $("#chatModal").modal("show");

  // Load moderator chat history
  const chatData = await getDataByKey("chat", "moderator");
  if (chatData && chatData.msg) {
    const msgs = chatData.msg.flatMap((m) => (m.msg ? m.msg : []));
    renderMessages(msgs);
  }
}

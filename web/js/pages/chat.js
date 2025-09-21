// chat.js (jQuery version)
import {
  getDataByKey,
  getAllData,
  updateData,
  deleteData,
  addData,
} from "../database.js";
import { deleteLTM } from "../memory.js";
import { handleMsg } from "../agents.js";
import { preprocess, postprocess } from "../process.js";
import { getAgentById, getDefaultAgentById } from "../allAgentsCon.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js"; // Import marked.js
import { handleCommand } from "../commands.js";
import { FindUrl, handleFileUpload, signOut } from "../utils.js";

let sessionId = null;
let mystaff = null;
let currentChat = [];
let staffId = null;
let mydata = null;

$(document).ready(async function () {
  const isLoggedIn = localStorage.getItem("mystaff_loggedin");

  if (isLoggedIn !== "true") {
    alert("You must be logged in to view this page.");
    window.location.href = "./signin.html";
  }
  const userId = localStorage.getItem("mystaff_user");
  if (!userId) {
    console.error("User ID not found in localStorage.");
    alert("An error occurred. Please sign in again.");
    return;
  }
  mydata = await getDataByKey("mydata", userId);

  await initializeChat();
  bindUIEvents();

  $("#signOutBtn").on("click", function (e) {
    e.preventDefault();
    signOut();
  });

  $("#messageInput").on("paste", async function (e) {
    const clipboardData = e.originalEvent.clipboardData;
    if (clipboardData.files && clipboardData.files.length > 0) {
      e.preventDefault(); // 파일 붙여넣기 시 기본 동작 방지
      if (clipboardData.files.length > 1) {
        alert("파일은 하나만 넣어주세요.");
      } else {
        const file = clipboardData.files[0];
        const fileName = file.name;
        const extension = fileName.split(".").pop().toLowerCase();
        const allowedExtensions = ["docx", "txt", "doc", "pdf"];

        if (allowedExtensions.includes(extension)) {
          const mockEvent = { target: { files: [file] } };
          await handleFileUpload(mockEvent, sessionId, mystaff);
        } else {
          alert("이 파일 형식은 저장이 불가합니다.");
        }
      }
    } else {
      const text = clipboardData.getData("text/plain");
      const size = text.length;
      const threshold = 500;

      if (size > threshold) {
        if (
          confirm(
            "붙여넣은 텍스트가 500자를 초과합니다. 파일로 저장하시겠습니까?"
          )
        ) {
          e.preventDefault(); // Prevent pasting into the textarea
          const originalCommand = $("#messageInput").val();
          const fileName = `pasted-${Date.now()}.txt`;

          const textBlob = new Blob([text], { type: "text/plain" });
          const textFile = new File([textBlob], fileName, {
            type: "text/plain",
          });
          const mockEvent = { target: { files: [textFile] } };
          let fileData = await handleFileUpload(mockEvent, sessionId, mystaff);

          $("#messageInput").val(
            `/filesearch ${fileData.id} ${originalCommand}`.trim()
          );
        }
      }
    }
  });
});

async function initializeChat() {
  const params = new URLSearchParams(window.location.search);
  staffId = params.get("staffId");
  sessionId = params.get("sessionId");
  if (sessionId) {
    await loadChatSession(sessionId);
    await loadSessionList();
  } else if (staffId) {
    sessionId = null;
    const apikeys = localStorage.getItem("mystaff_credentials");
    const apikeysObj = JSON.parse(apikeys || "{}");
    const agent = (await getAgentById(staffId)) || {};
    let apikey = "";

    if (!agent.adapter.name) {
      alert("Please select a staff member to chat with.");
      window.location.href = "./mystaff.html";
      return;
    } else if (agent.adapter.name && agent.adapter.name !== "http") {
      apikey = apikeysObj[agent.adapter.name] || "";
      if (!apikey || apikey.trim() === "" || apikey === "undefined") {
        alert(
          `Please set your ${agent.adapter.name} API key in the credentials page.`
        );
        window.location.href = "./credentials.html";
        return;
      }
    }
    const finalUrl = await FindUrl(agent);
    window.location.href = finalUrl;
  } else {
    window.location.href = `mystaff.html`;
  }
}

async function loadChatSession(sessionId) {
  const chatData = await getDataByKey("chat", sessionId);
  if (chatData && chatData.staffId) {
    mystaff = await getAgentById(chatData.staffId);
    if (mystaff === "Item not found") {
      let agentDataJson = localStorage.getItem("mystaff_default_agent");
      let agentData = JSON.parse(agentDataJson);
      mystaff = agentData.find((agent) => agent.staff_id === chatData.staffId);
    }
    let staffName = mystaff.staff_name;
    $("#chatAgentName").text(staffName || "Chat");
    currentChat = chatData.msg || [];
    if (currentChat.length === 0) {
      currentChat = [
        {
          system: "Welcome to Chat!",
          speaker: staffName,
          date: new Date().toISOString(),
        },
      ];
    }
    renderMessages(currentChat);
  } else {
    mystaff = null;
  }
}

async function loadSessionList() {
  const allSessions = await getAllData("chat");
  const $list = $("#sessionList");
  $list.empty();

  const filteredSessions = allSessions.filter(
    (session) => session.staffId === mystaff.staff_id
  );

  filteredSessions.forEach((session) => {
    const isActive = session.sessionId === sessionId ? "active" : "";
    const listItem = `
            <li class="list-group-item chat-session-item ${isActive} d-flex justify-content-between align-items-center mb-2 small" data-session-id="${
      session.sessionId
    }">
                <span class="session-title" style="cursor:pointer;">${
                  session.title || "Untitled"
                }</span>
                <div class="dropdown">
                    <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false"></button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item edit-title" href="#">Edit Title</a></li>
                        <li><a class="dropdown-item mgt-files" href="#">Manage Files</a></li>
                        <li><a class="dropdown-item delete-session" href="#">Delete</a></li>
                    </ul>
                </div>
            </li>`;
    $list.append(listItem);
  });
}

async function renderMessages(msgs) {
  const $container = $("#chatMessages");
  let messagesHtml = "";

  for (const m of msgs) {
    if (m.user) {
      messagesHtml += `
                <div class="msg-container">
                    <div class="msg-content msg-user">
                        <p><b>User:</b></p>
                        <p>${m.user}</p>
                        <span class="msg-date text-muted small">${new Date(
                          m.date
                        ).toLocaleString()}</span>
                    </div>
                </div>`;
    }
    if (m.system) {
      const speakerName =
        m.speaker || (mystaff ? mystaff.staff_name : "System");
      let bgColor = "#6c757d";
      if (m.speakerId) {
        const agent = await getAgentById(m.speakerId);
        if (agent && agent.color) {
          bgColor = agent.color;
        }
      }

      const systemHtml = marked.parse(m.system);
      messagesHtml += `
                <div class="msg-container">
                    <div class="msg-content msg-system" style="background-color: ${bgColor};">
                        <p><b>${speakerName}:</b></p>
                        <div>${systemHtml}</div>
                        <span class="msg-date text-muted small" style="color: #ccc;">${new Date(
                          m.date
                        ).toLocaleString()}</span>
                    </div>
                </div>`;
    }
  }
  $container.html(messagesHtml);
  $container.prop("scrollTop", $container.prop("scrollHeight"));
}

function bindUIEvents() {
  $("#sendBtn").on("click", sendMessage);
  $("#messageInput").on("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      sendMessage();
      e.preventDefault(); // Prevent form submission
    }
  });

  $("#fileUploadBtn").on("click", () => {
    $("#fileInput").click();
  });

  $("#fileInput").on("change", async (event) => {
    await handleFileUpload(event, sessionId, mystaff);
  });

  $("#inviteBtn").on("click", openInviteModal);

  $("#attendantsBtn").on("click", openAttendantsModal);

  $("#newChat").on("click", async () => {
    const newSessionId = Array.from(
      crypto.getRandomValues(new Uint8Array(32)),
      (byte) => byte.toString(16).padStart(2, "0")
    ).join("");
    const newChatStaffId = mystaff ? mystaff.staff_id : null;
    try {
      await addData("chat", {
        sessionId: newSessionId,
        staffId: newChatStaffId,
        title: "New Chat",
        msg: [],
        attendants: [],
      });
      window.location.href = `chat.html?sessionId=${newSessionId}`;
    } catch (error) {
      console.error("Error creating new chat session:", error);
      alert("Failed to create a new chat session.");
    }
  });

  $("#sessionList").on("click", ".session-title", function () {
    const newSessionId = $(this).closest("li").data("session-id");
    if (newSessionId !== sessionId) {
      window.location.href = `chat.html?sessionId=${newSessionId}`;
    }
  });

  $("#sessionList").on("click", ".edit-title", async function (e) {
    e.preventDefault();
    const $listItem = $(this).closest(".list-group-item");
    const sessionToEditId = $listItem.data("session-id");
    const currentTitle = $listItem.find(".session-title").text();
    const newTitle = prompt("Enter new title", currentTitle);
    if (newTitle) {
      await updateData("chat", sessionToEditId, { title: newTitle });
      loadSessionList();
    }
  });

  $("#sessionList").on("click", ".delete-session", async function (e) {
    e.preventDefault();
    if (confirm("Are you sure you want to delete this session?")) {
      const $listItem = $(this).closest(".list-group-item");
      const sessionToDeleteId = $listItem.data("session-id");

      // Delete associated files from myfiles store
      const allFiles = await getAllData("myfiles");
      const filesToDelete = allFiles.filter(
        (file) => file.sessionId === sessionToDeleteId
      );
      for (const file of filesToDelete) {
        await deleteData("myfiles", file.id);
      }

      await deleteData("chat", sessionToDeleteId);
      await deleteLTM(sessionToDeleteId);

      if (sessionToDeleteId === sessionId) {
        const allSessions = await getAllData("chat");
        const nextSession = allSessions.find(
          (s) => s.staffId === mystaff.staff_id
        );
        if (nextSession) {
          window.location.href = `chat.html?sessionId=${nextSession.sessionId}`;
        } else {
          window.location.href = "chat.html";
        }
      } else {
        loadSessionList();
      }
    }
  });

  $("#sessionList").on("click", ".mgt-files", async function (e) {
    e.preventDefault();
    const sessionLi = $(this).closest(".chat-session-item");
    const sessionIdForFiles = sessionLi.data("session-id");
    await openManageFilesModal(sessionIdForFiles);
  });

  // Event delegation for deleting files from the modal
  $("#manageFilesModal").on("click", ".delete-file-btn", async function () {
    const $listItem = $(this).closest("li");
    const fileId = $listItem.data("file-id");

    if (confirm("Are you sure you want to delete this file?")) {
      try {
        await deleteData("myfiles", fileId);
        $listItem.remove();
        if ($("#fileList").children().length === 0) {
          $("#fileList").append(
            '<li class="list-group-item">No files found for this session.</li>'
          );
        }
        alert("File deleted successfully.");
      } catch (error) {
        console.error("Error deleting file:", error);
        alert("Failed to delete the file.");
      }
    }
  });

  // Create mentions container if it doesn't exist
  if ($("#mentionsContainer").length === 0) {
    const mentionsContainer =
      '<div id="mentionsContainer" class="d-flex flex-wrap gap-2 mb-2"></div>';
    $("#messageInput").before(mentionsContainer);
  }

  // Create attendants dropdown if it doesn't exist
  if ($("#attendantsDropdown").length === 0) {
    const dropdown =
      '<div id="attendantsDropdown" class="list-group" style="display: none; position: absolute; z-index: 1000;"></div>';
    $("#messageInput").parent().append(dropdown);
  }

  $("#messageInput").on("input", async function () {
    const text = $(this).val();
    const cursorPos = this.selectionStart;

    // Check for @mention
    const textBeforeCursor = text.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      hideFileSearchDropdown();
      await showAttendantsDropdown(atMatch[1]);
      return; // exit to avoid other checks
    } else {
      hideAttendantsDropdown();
    }

    // Check for /filesearch
    if (text.trim() === "/filesearch" || text.trim() === "/파일검색") {
      await showFileSearchDropdown();
    } else {
      hideFileSearchDropdown();
    }
  });

  $("#attendantsDropdown").on("click", "a.list-group-item", function (e) {
    e.preventDefault();
    const staffName = $(this).data("staff-name");
    const staffId = $(this).data("staff-id");

    const mentionButton = `
      <span class="badge bg-primary me-2" data-staff-id="${staffId}">
        ${staffName}
        <button type="button" class="btn-close btn-close-white ms-1" aria-label="Close"></button>
      </span>`;
    $("#mentionsContainer").html(mentionButton);

    const $input = $("#messageInput");
    const text = $input.val();
    const cursorPos = $input[0].selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      const startIndex = atMatch.index;
      const newText = text.substring(0, startIndex) + text.substring(cursorPos);
      $input.val(newText).focus();
      $input[0].setSelectionRange(startIndex, startIndex);
    }
    hideAttendantsDropdown();
  });

  $("#mentionsContainer").on("click", ".btn-close", function () {
    $(this).parent().remove();
  });

  $("#fileSearchDropdown").on("click", "a.list-group-item", function (e) {
    e.preventDefault();
    const fileId = $(this).data("file-id");
    $("#messageInput").val(`/filesearch ${fileId} `).focus();
    hideFileSearchDropdown();
  });

  $(document).on("click", function (e) {
    if (
      !$(e.target).closest(
        "#messageInput, #fileSearchDropdown, #attendantsDropdown"
      ).length
    ) {
      hideFileSearchDropdown();
      hideAttendantsDropdown();
    }
  });
}

async function sendMessage() {
  const $inputEl = $("#messageInput");
  let text = $inputEl.val().trim();

  const mentions = [];
  const mentionedStaffIds = [];
  $("#mentionsContainer .badge").each(function () {
    let TstaffId = $(this).data("staff-id");
    mentions.push(`@[${TstaffId}]`);
    mentionedStaffIds.push(TstaffId);
  });

  let targetStaff;
  if (mentionedStaffIds.length > 0) {
    const targetStaffId = mentionedStaffIds[0];
    targetStaff = await getAgentById(targetStaffId);
  }

  if (mentions.length > 0) {
    text = mentions.join(" ") + " " + text;
  }

  if (!text) return;

  if (text.startsWith("/")) {
    try {
      const userMessage = { user: text, date: new Date().toISOString() };
      currentChat.push(userMessage);
      renderMessages(currentChat);
      $inputEl.val("");
      $("#mentionsContainer").empty();

      const context = { sessionId, currentChat, renderMessages, postprocess };
      const commandIsValid = await handleCommand(text, context, 4);

      if (!commandIsValid) {
        currentChat.pop();
        renderMessages(currentChat);
      }
    } catch (error) {
      console.error("Error executing command:", error);
      const errorMessage = {
        system: "An error occurred while executing the command.",
        date: new Date().toISOString(),
      };
      currentChat.push(errorMessage);
      renderMessages(currentChat);
    } finally {
      await updateData("chat", sessionId, { msg: currentChat });
    }
    return;
  }

  if (!mystaff) {
    alert("Please select a staff member to chat with.");
    return;
  }

  const $sendBtn = $("#sendBtn");
  const $spinner = $("#loadingSpinner");
  $inputEl.prop("disabled", true);
  $sendBtn.prop("disabled", true);
  $spinner.show();

  const tempUserMsg = { user: text, date: new Date().toISOString() };
  currentChat.push(tempUserMsg);
  renderMessages(currentChat);
  $inputEl.val("");

  try {
    let responder = mystaff;

    if (!responder) {
      alert("Could not find a valid recipient for the message.");
      currentChat.pop(); // remove temp user message
      renderMessages(currentChat);
      return;
    }

    currentChat.pop(); // remove temp user message
    const userMessageTurn = { user: text, date: new Date().toISOString() };
    currentChat.push(userMessageTurn);

    const processedInput = await preprocess(sessionId, text, responder);
    const resp = await handleMsg(processedInput, responder, sessionId);
    const classify = JSON.parse(resp);

    if (
      typeof targetStaff === "object" &&
      targetStaff != {} &&
      targetStaff.staff_id
    ) {
      responder = targetStaff;
    } else {
      switch (classify.intent) {
        case "search":
          responder = await getDefaultAgentById("default_20250921_00003");
          break;
        case "code":
          responder = await getDefaultAgentById("default_20250921_00002");
          break;
        case "task":
          responder = await getDefaultAgentById("default_20250921_00002");
          break;
        case "image_generation":
          responder = await getDefaultAgentById("default_20250921_00002");
          break;
        default:
          responder = await getDefaultAgentById("default_20250921_00002");
          break;
      }
    }

    const response = await handleMsg(processedInput, responder, sessionId);

    const chatTurn = {
      system: response,
      date: new Date().toISOString(),
      speaker: responder.staff_name,
      speakerId: responder.staff_id,
    };
    currentChat.push(chatTurn);
    renderMessages(currentChat);
  } catch (error) {
    console.error("Error sending message:", error);
    alert("An error occurred while sending your message.");
  } finally {
    $inputEl.prop("disabled", false);
    $sendBtn.prop("disabled", false);
    $spinner.hide();
    await updateData("chat", sessionId, { msg: currentChat });
    await postprocess(sessionId, currentChat);
  }
}

async function openInviteModal() {
  const chatData = await getDataByKey("chat", sessionId);
  const currentParticipants = [
    chatData.staffId,
    ...(chatData.attendants || []),
  ];
  const availablAgentsIds = mydata.mystaff;
  const $staffList = $("#staffList");
  $staffList.empty();

  for (let i = 0; i < availablAgentsIds.length; i++) {
    let agent = await getAgentById(availablAgentsIds[i]);
    if (!agent) continue;

    let listItem;
    if (availablAgentsIds[i] === chatData.staffId) {
      listItem = `<li class="list-group-item d-flex justify-content-between align-items-center">${agent.staff_name} <span class="badge bg-primary rounded-pill">Host</span></li>`;
    } else {
      listItem = `<li class="list-group-item"><input class="form-check-input me-1" type="checkbox" value="${availablAgentsIds[i]}" id="staff-${availablAgentsIds[i]}"><label class="form-check-label" for="staff-${availablAgentsIds[i]}">${agent.staff_name}</label></li>`;
    }
    $staffList.append(listItem);
  }

  const inviteModal = new bootstrap.Modal(
    document.getElementById("inviteModal")
  );
  inviteModal.show();

  $("#sendInviteBtn")
    .off("click")
    .on("click", async () => {
      const selectedStaff = [];
      $("#staffList input:checked").each(function () {
        selectedStaff.push($(this).val());
      });

      if (selectedStaff.length > 0) {
        const existingAttendants = chatData.attendants || [];
        const newAttendants = [
          ...new Set([...existingAttendants, ...selectedStaff]),
        ];
        await updateData("chat", sessionId, { attendants: newAttendants });
        alert("Invitations sent!");
        inviteModal.hide();
      } else {
        alert("Please select at least one staff member to invite.");
      }
    });
}

async function openAttendantsModal() {
  const chatData = await getDataByKey("chat", sessionId);
  const attendants = chatData.attendants || [];
  const participants = [chatData.staffId, ...attendants];

  const $attendantsList = $("#attendantsList");
  $attendantsList.empty();

  for (const staffId of participants) {
    const agent = await getAgentById(staffId);
    if (agent) {
      let listItem;
      if (staffId === chatData.staffId) {
        //        listItem = `<li class="list-group-item">${agent.staff_name} (Host)</li>`;
        listItem = `<li class="list-group-item">Moderator (Host)</li>`;
      } else {
        listItem = `<li class="list-group-item d-flex justify-content-between align-items-center" data-staff-id-li="${staffId}">${agent.staff_name}<button type="button" class="btn-close" aria-label="Close" data-staff-id-btn="${staffId}"></button></li>`;
      }
      $attendantsList.append(listItem);
    }
  }

  const attendantsModal = new bootstrap.Modal(
    document.getElementById("attendantsModal")
  );
  attendantsModal.show();

  $("#attendantsList")
    .off("click", ".btn-close")
    .on("click", ".btn-close", async function () {
      const staffIdToRemove = $(this).data("staff-id-btn");
      if (confirm(`Are you sure you want to remove this participant?`)) {
        const currentChatData = await getDataByKey("chat", sessionId);
        const newAttendants = (currentChatData.attendants || []).filter(
          (id) => id !== staffIdToRemove
        );
        await updateData("chat", sessionId, { attendants: newAttendants });
        $(this).closest("li").remove();
      }
    });
}

async function openManageFilesModal(sessionIdForFiles) {
  try {
    const allFiles = await getAllData("myfiles");
    const sessionFiles = allFiles.filter(
      (file) => file.sessionId === sessionIdForFiles
    );

    const $fileList = $("#fileList");
    $fileList.empty();

    if (sessionFiles.length > 0) {
      sessionFiles.forEach((file) => {
        const fileName = file.fileName || "Unnamed File";
        const fileItemHtml = `
                    <li class="list-group-item d-flex justify-content-between align-items-center" data-file-id="${file.id}">
                        <span>${fileName}</span>
                        <button type="button" class="btn btn-danger btn-sm delete-file-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </li>`;
        $fileList.append(fileItemHtml);
      });
    } else {
      $fileList.append(
        '<li class="list-group-item">No files found for this session.</li>'
      );
    }

    const filesModal = new bootstrap.Modal(
      document.getElementById("manageFilesModal")
    );
    filesModal.show();
  } catch (error) {
    console.error("Error opening file management modal:", error);
    alert("Could not load the file list.");
  }
}

async function showFileSearchDropdown() {
  const $dropdown = $("#fileSearchDropdown");
  const allFiles = await getAllData("myfiles");
  const sessionFiles = allFiles.filter((file) => file.sessionId === sessionId);

  $dropdown.empty();

  if (sessionFiles.length > 0) {
    sessionFiles.forEach((file) => {
      const fileItem = `<a href="#" class="list-group-item list-group-item-action" data-file-id="${file.id}">${file.fileName}</a>`;
      $dropdown.append(fileItem);
    });
  } else {
    const noFilesItem =
      '<span class="list-group-item">No files found for this session.</span>';
    $dropdown.append(noFilesItem);
  }
  $dropdown.show();
}

function hideFileSearchDropdown() {
  $("#fileSearchDropdown").hide().empty();
}

async function showAttendantsDropdown(filter = "") {
  const $dropdown = $("#attendantsDropdown");
  const chatData = await getDataByKey("chat", sessionId);
  if (!chatData) return;

  const attendants = chatData.attendants || [];
  const participants = [chatData.staffId, ...attendants];

  $dropdown.empty();

  let participantsFound = false;
  for (const staffId of participants) {
    const agent = await getAgentById(staffId);
    if (
      agent &&
      agent.staff_name &&
      agent.staff_name.toLowerCase().includes(filter.toLowerCase())
    ) {
      const participantItem = `<a href="#" class="list-group-item list-group-item-action" data-staff-id="${agent.staff_id}" data-staff-name="${agent.staff_name}">${agent.staff_name}</a>`;
      $dropdown.append(participantItem);
      participantsFound = true;
    }
  }

  if (participantsFound) {
    const inputPos = $("#messageInput").position();
    const inputHeight = $("#messageInput").outerHeight();
    $dropdown.css({
      display: "block",
      top: inputPos.top - $dropdown.outerHeight(),
      left: inputPos.left,
      width: $("#messageInput").outerWidth(),
    });
  } else {
    $dropdown.hide();
  }
}

function hideAttendantsDropdown() {
  $("#attendantsDropdown").hide().empty();
}

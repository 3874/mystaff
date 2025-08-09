import { init, getChatPartData, clearChatData } from '../mystaffDB.js';

"use strict";

$(document).ready(function() {
  // 1) MystaffDB 초기화
  init()
    .then(() => {
      console.log('MystaffDB initialized successfully.');
      // 2) 모든 채팅 세션 가져오기
      return getChatPartData();
    })
    .then(sessions => {
      console.log('All chat sessions:', sessions);
      displayChats(sessions);
    })
    .catch(error => {
      console.error('Error initializing or fetching chats:', error.message || error);
    });
});

// 3) 화면에 채팅 세션 목록 표시
function displayChats(sessions) {
  const chatList = $("#chatlist");
  chatList.empty();

  sessions.forEach(session => {
    // session.sessionId, session.staff_id, session.messages
    // 여기서는 staff_id를 텍스트로 사용합니다. 필요시 ownerStore에서 이름을 가져오도록 확장하세요.
    chatList.append(
      `<li class="list-group-item" data-id="${session.sessionId}">${session.title}</li>`
    );
  });
}

// 4) 클릭 시 해당 세션으로 이동
$("#chatlist").on("click", ".list-group-item", function() {
  const sessionId = $(this).data("id");
  // staff_id 대신 이름을 query로 전달하려면 추가 조회 로직 필요
  window.location.href = `chat.html?sessionId=${sessionId}`;
});

$("#clear-btn").on("click", function() {
    init()
    .then(() => clearChatData())
    location.reload();
});
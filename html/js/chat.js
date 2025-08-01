"use strict";

$.chatCtrl = function(element, chat) {
  var chat = $.extend({
    position: 'chat-right',
    text: '',
    time: moment(new Date().toISOString()).format('hh:mm'),
    picture: '',
    type: 'text', // or typing
    timeout: 0,
    onShow: function() {}
  }, chat);

  // Markdown → HTML 변환
  var chatTextHtml = marked.parse(chat.text);

  var target = $(element),
      element = '<div class="chat-item '+chat.position+'" style="display:none">' +
                '<img src="'+chat.picture+'">' +
                '<div class="chat-details">' +
                '<div class="chat-text">'+chatTextHtml+'</div>' +
                '<div class="chat-time">'+chat.time+'</div>' +
                '</div>' +
                '</div>',
      typing_element = '<div class="chat-item chat-left chat-typing" style="display:none">' +
                '<img src="'+chat.picture+'">' +
                '<div class="chat-details">' +
                '<div class="chat-text"></div>' +
                '</div>' +
                '</div>';

    var append_element = element;
    if(chat.type == 'typing') {
      append_element = typing_element;
    }

    if(chat.timeout > 0) {
      setTimeout(function() {
        target.find('.chat-content').append($(append_element).fadeIn());
        if (window.MathJax) MathJax.typesetPromise();
      }, chat.timeout);
    }else{
      target.find('.chat-content').append($(append_element).fadeIn());
      if (window.MathJax) MathJax.typesetPromise();
    }

    var target_height = 0;
    target.find('.chat-content .chat-item').each(function() {
      target_height += $(this).outerHeight();
    });
    setTimeout(function() {
      target.find('.chat-content').scrollTop(target_height, -1);
    }, 100);
    chat.onShow.call(this, append_element);
}


var chats = [

];

for(var i = 0; i < chats.length; i++) {
  var type = 'text';
  if(chats[i].typing != undefined) type = 'typing';
  $.chatCtrl('#mychatbox', {
    text: (chats[i].text != undefined ? chats[i].text : ''),
    picture: (chats[i].position == 'left' ? './img/avatar/avatar-5.png' : './img/avatar/avatar-2.png'),
    position: 'chat-'+chats[i].position,
    type: type
  });
}

const sessionId = crypto.randomUUID();

$("#chat-form").submit(function() {
  var me = $(this);
  var $form = $(this);
  var $input = $form.find('input');
  var $button = $form.find('button');
  
  // 입력창과 버튼 비활성화
  $input.prop('disabled', true);
  $button.prop('disabled', true);
  
  sendChatRequest($input.val().trim(), sessionId).then(function() {
    // 답변 오면 입력창과 버튼 활성화, spinner 제거
    $input.prop('disabled', false);
    $button.prop('disabled', false);
    $input.focus();
  });

  if(me.find('input').val().trim().length > 0) {      
    $.chatCtrl('#mychatbox', {
      text: me.find('input').val(),
      picture: './img/avatar/avatar-2.png',
    });
    me.find('input').val('');
  } 
  return false;
});


async function sendChatRequest(input, sessionId) {
  const N8N_WEBHOOK_URL = 'http://ai.yleminvest.com:5678/webhook/mystaff-chat';


  const requestData = {
    chatInput: input,
    sessionId: sessionId
  };

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `mystaff`
      },
      body: JSON.stringify(requestData)
    });

    const data = await response.json();


    if (response.ok) {
      console.log(data);

      const reply = data[0].output || "죄송합니다. 응답을 받아오는 데 실패했습니다.";
      $.chatCtrl('#mychatbox', {
        text: reply,
        picture: './img/avatar/avatar-2.png',
        position: 'chat-left'
      });

    } else {
      console.error('Error response:', data);

    }
  } catch (error) {
    console.error('Error:', error);


  } finally {

  }
}

// 쿼리스트링에서 id 값 추출
function getQueryId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// localStorage에서 members 가져오기
function getMemberById(id) {
  const members = JSON.parse(localStorage.getItem('members') || '[]');
  return members.find(m => String(m.id) === String(id));
}

// 페이지 로드 시 실행
$(function() {
  const memberId = getQueryId();
  let user = null;
  if (memberId) {
    user = getMemberById(memberId);
    // 예시: 콘솔로 확인
    console.log('선택된 멤버:', user);
    // 이름을 chat-user-name에 표시 (chat.html 또는 chat2.html에서 사용)
    if (user && $('#chat-user-name').length) {
      $('#chat-user-name').text(user.name);
    }
  }
  // user 객체를 필요에 따라 활용 가능
  // window.selectedUser = user; // 필요시 전역 저장
});




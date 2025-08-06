var chatStaff, sessionId;

$(document).ready(function() {
    const myprofileJSON = CheckSignIn();
    console.log(myprofileJSON);
    const chatJson = localStorage.getItem('mystaff_staffData');
    if (!chatJson) {
        location.href="index.html";
    }
    chatStaff = JSON.parse(chatJson);
    console.log(chatStaff);
    $('#chat-user-name').text(chatStaff.name);

    const urlParams = new URLSearchParams(window.location.search);
    sessionId = urlParams.get('sessionId') || '';
    console.log(sessionId);
    if(!sessionId) {
        location.href = "index.html";
    }

    MystaffDB.init()
    .then(() => MystaffDB.getChatSession(sessionId))
    .then(session => {
        console.log(session);
        // session이 없거나 messages가 없으면 빈 배열로 대체
        const messages = session?.messages || [];

        messages.forEach(chatMessage => {
        $.chatCtrl('#mychatbox', {
            text: chatMessage.text,
            picture: chatMessage.sender === 'user'
            ? './img/avatar/avatar-1.png'
            : chatStaff.imgUrl,
            position: chatMessage.sender === 'user'
            ? 'chat-right'
            : 'chat-left'
        });
        });
    })
    .catch(error => {
        console.error('Error loading chat session:', error.message);
        alert(error.message || '채팅 세션을 불러오는 중 오류가 발생했습니다.');
    });
    
});


// Chat control function
$.chatCtrl = function(element, chat) {
    var chat = $.extend({
        position: 'chat-right',
        text: '',
        time: moment(new Date().toISOString()).format('hh:mm'),
        picture: '',
        type: 'text',
        timeout: 0,
        onShow: function() {}
    }, chat);

    var chatTextHtml = marked.parse(chat.text);
    var target = $(element),
        elementHtml = '<div class="chat-item '+chat.position+'" style="display:none">' +
                      '<img src="'+chat.picture+'">' +
                      '<div class="chat-details">' +
                      '<div class="chat-text">'+chatTextHtml+'</div>' +
                      '<div class="chat-time">'+chat.time+'</div>' +
                      '</div>' +
                      '</div>';

    if(chat.timeout > 0) {
        setTimeout(function() {
            target.find('.chat-content').append($(elementHtml).fadeIn());
            if (window.MathJax) MathJax.typesetPromise();
        }, chat.timeout);
    } else {
        target.find('.chat-content').append($(elementHtml).fadeIn());
        if (window.MathJax) MathJax.typesetPromise();
    }

    let target_height = 0;
    target.find('.chat-content .chat-item').each(function() {
        target_height += $(this).outerHeight();
    });
  
    setTimeout(function() {
        target.find('.chat-content').scrollTop(target_height);
    }, 100);
    
    chat.onShow.call(this, elementHtml);
};


$("#chat-form").on("submit", async function(event) {
    // 1) 기본 폼 제출 동작 방지
    event.preventDefault();

    const $form = $(this);
    const $input = $form.find('input');
    const $button = $form.find('button');

    // Disable input and button
    $input.prop('disabled', true);
    $button.prop('disabled', true);

    const Staff_func = chatStaff.functionJSON;
    const message = $input.val().trim();

    if (message.length > 0) {
        try {
            // 2) 로컬 DB에 저장
            await MystaffDB.addChatMessage(sessionId, 'user', message);

            // 3) 화면에 출력
            $.chatCtrl('#mychatbox', {
                text: message,
                picture: './img/avatar/avatar-1.png',
                position: 'chat-right'
            });
            $input.val('');

            // 4) 서버 요청 및 응답 처리
            await sendChatRequest(message, sessionId, Staff_func.url);
        } catch (err) {
            console.error(err);
        }
    }

    // 5) 항상 버튼·입력창 활성화
    $input.prop('disabled', false);
    $button.prop('disabled', false);
    $input.focus();
});

// Send chat request to the server
async function sendChatRequest(input, sessionId, clienturl) {
    const N8N_WEBHOOK_URL = clienturl;
    console.log(N8N_WEBHOOK_URL);
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
            const reply = data[0].output || "죄송합니다. 응답을 받아오는 데 실패했습니다.";
            await MystaffDB.addChatMessage(sessionId, 'system', reply);
            $.chatCtrl('#mychatbox', {
                text: reply,
                picture: chatStaff.imgUrl,
                position: 'chat-left'
            });
        } else {
            console.error('Error response:', data);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

$(document).on("click", "#remove_btn", async function() {
    if (sessionId) {
        await MystaffDB.deleteChatMessages(sessionId);
        alert("채팅 데이터가 성공적으로 삭제되었습니다!");
        location.reload();
    } else {
        alert("세션 ID를 찾을 수 없습니다.");
    }
});
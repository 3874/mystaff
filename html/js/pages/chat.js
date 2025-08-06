var chatStaff, sessionId;

$(document).ready(async function() {
    await MystaffDB.init();

    const myprofileJSON = CheckSignIn();
    console.log(myprofileJSON);

    const urlParams = new URLSearchParams(window.location.search);
    sessionId = urlParams.get('sessionId') || '';
    console.log(sessionId);
    if(!sessionId) {
        location.href = "index.html";
    }

    chatStaff = await MystaffDB.getChatSession(sessionId);
    if (!chatStaff) {
        console.error('Could not find staff for sessionId:', sessionId);
        location.href = "index.html";
        return;
    }
    console.log(chatStaff);

    $('#chat-user-name').text(chatStaff.name);
    loadExistingChats(sessionId);

});

async function loadExistingChats(sessionId) {
    if (!sessionId) {
        console.error('No sessionId provided, cannot load chats.');
        return; 
    }

    const messages = await MystaffDB.getChatMessages(sessionId);
    messages.forEach(chatMessage => {
        $.chatCtrl('#mychatbox', {
            text: chatMessage.text, 
            picture: chatMessage.sender === 'user' ? './img/avatar/avatar-1.png' : chatStaff.imgUrl,
            position: chatMessage.sender === 'user' ? 'chat-right' : 'chat-left'
        });
    });
}

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


$("#chat-form").submit(async function() {
    var me = $(this);
    var $form = $(this);
    var $input = $form.find('input');
    var $button = $form.find('button');

    // Disable input and button
    $input.prop('disabled', true);
    $button.prop('disabled', true);
    const Staff_func = chatStaff.functionJSON;
    console.log(Staff_func);
    const message = $input.val().trim();
    if (message.length > 0) {
        await MystaffDB.addChatMessage(sessionId, 'user', message);
        $.chatCtrl('#mychatbox', {
            text: message,
            picture: './img/avatar/avatar-1.png',
        });
        me.find('input').val('');

        try {
            await sendChatRequest(message, sessionId, Staff_func.url)
        } finally {
            // Enable input and button when response is received or an error occurs
            $input.prop('disabled', false);
            $button.prop('disabled', false);
            $input.focus();
        }
    } else {
        $input.prop('disabled', false);
        $button.prop('disabled', false);
    }
    return false;
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
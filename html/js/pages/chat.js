import { handleMessage } from '../adapters.js';
import { init, getChatbySession, addChatMessage, deleteChatMessages, getChatSessionsByStaffId, addChatSession, updateChatTitle } from '../mystaffDB.js';
import { CheckSignIn } from '../custom.js';
import { generateUUID } from '../utils.js';

var chatStaff, sessionId, staffId;

$(document).ready(function() {
    const myprofileJSON = CheckSignIn();
    console.log(myprofileJSON);

    const urlParams = new URLSearchParams(window.location.search);
    sessionId = urlParams.get('sessionId') || '';
    staffId = urlParams.get('staffId') || '';
    if (!sessionId && !staffId) {
        location.href="index.html";
    } else if (sessionId) {
        // If only sessionId is provided, fetch the chat session by sessionId
        init().then(() => {
            return getChatbySession(sessionId);
        }).then(session => {
            const messages = session?.messages || [];
            $('#chat-title').text(session.title || 'New Chat');
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
        }).catch(error => {
            console.error('Error fetching chat session:', error);
            alert('Failed to fetch chat session.');
        });
    } else if (staffId) {
        // If only staffId is provided, fetch the chat session by staffId
        init().then(() => {
            return getChatSessionsByStaffId(staffId);
        }).then(sessions => {
            if (sessions && sessions.length > 0) {
                // Single session found, redirect to that chat
                sessionId = sessions[0].sessionId;
                location.href = `chat.html?sessionId=${sessionId}`;
            } else {
                // No session found, create a new one
                sessionId = generateUUID();
                return addChatSession({
                    sessionId: sessionId,
                    staff_id: staffId,
                    title: 'New Chat'
                }).then(() => {
                    location.href = `chat.html?sessionId=${sessionId}`;
                });
            }
        }).catch(error => {
            console.error('Error handling chat session:', error);
            alert('Failed to handle chat session.');
        });
        return;
    } 
    
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
                      '<img src="'+chat.picture+'" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">' +
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

    const message = $input.val().trim();

    if (message.length > 0) {
        try {
            // 2) 로컬 DB에 저장 (사용자 메시지)
            await addChatMessage(sessionId, 'user', message);

            // 3) 화면에 출력 (사용자 메시지)
            $.chatCtrl('#mychatbox', {
                text: message,
                picture: './img/avatar/avatar-1.png',
                position: 'chat-right'
            });
            $input.val('');

            // 4) 서버 요청 및 응답 처리
            const reply = await handleMessage(chatStaff, sessionId, message);
            if(reply) {
                // 5) 로컬 DB에 저장 (시스템 응답)
                await addChatMessage(sessionId, 'system', reply);
                // 6) 화면에 출력 (시스템 응답)
                $.chatCtrl('#mychatbox', {
                    text: reply,
                    picture: chatStaff.imgUrl,
                    position: 'chat-left'
                });
            }
        } catch (err) {
            console.error(err);
        }
    }

    // 7) 항상 버튼·입력창 활성화
    $input.prop('disabled', false);
    $button.prop('disabled', false);
    $input.focus();
});



$(document).on("click", "#remove_btn", async function() {
    if (sessionId) {
        await deleteChatMessages(sessionId);
        alert("채팅 데이터가 성공적으로 삭제되었습니다!");
        location.reload();
    } else {
        alert("세션 ID를 찾을 수 없습니다.");
    }
});

// Handle chat title editing
$(document).on('click', '#chat-title', function() {
    const $title = $(this);
    const originalTitle = $title.text();
    const $input = $('<input type="text" class="form-control" />');
    $input.val(originalTitle);
    $title.hide();
    $title.after($input);
    $input.focus();

    const saveChanges = async () => {
        const newTitle = $input.val().trim();
        if (newTitle && newTitle !== originalTitle) {
            try {
                await updateChatTitle(sessionId, newTitle);
                $title.text(newTitle);
            } catch (error) {
                console.error('Error updating chat title:', error);
                alert('Failed to update chat title.');
                // Revert to original title on error
                $title.text(originalTitle);
            }
        } else {
            // If title is empty or unchanged, revert
            $title.text(originalTitle);
        }
        $input.remove();
        $title.show();
    };

    $input.on('blur', saveChanges);
    $input.on('keydown', function(e) {
        if (e.key === 'Enter') {
            saveChanges();
        } else if (e.key === 'Escape') {
            $input.remove();
            $title.show();
        }
    });
});
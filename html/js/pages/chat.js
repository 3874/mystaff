import { OpenAIAdapter, GeminiAdapter, ClaudeAdapter, GrokAdapter, LlamaAdapter, DeepseekAdapter } from '../adapters.js';
import { init, getChatSession, addChatMessage, deleteChatMessages } from '../mystaffDB.js';
import { CheckSignIn } from '../custom.js';
import { generateUUID } from '../utils.js';

var chatStaff, sessionId;

$(document).ready(function() {
    const myprofileJSON = CheckSignIn();
    console.log(myprofileJSON);
    const chatJson = localStorage.getItem('mystaff_staffData');
    if (!chatJson) {
        location.href="index.html";
    }
    chatStaff = JSON.parse(chatJson);
    $('#chat-user-name').text(chatStaff.name);

    const urlParams = new URLSearchParams(window.location.search);
    sessionId = urlParams.get('sessionId') || '';
    if(!sessionId) {
        sessionId = generateUUID();
        location.href = `chat.html?sessionId=${sessionId}`;
    }

    init()
    .then(() => getChatSession(sessionId))
    .then(session => {
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
            await addChatMessage(sessionId, 'user', message);

            // 3) 화면에 출력
            $.chatCtrl('#mychatbox', {
                text: message,
                picture: './img/avatar/avatar-1.png',
                position: 'chat-right'
            });
            $input.val('');

            // 4) 서버 요청 및 응답 처리
            switch (chatStaff.staff_type) {
                case 'default':
                    const AIprovider = chatStaff.functionJSON.ai_provider;
                    let adapter;
                    const apiKey = chatStaff.functionJSON.apiKey; 

                    switch (AIprovider) {
                        case 'openai':
                            adapter = new OpenAIAdapter(apiKey);
                            break;
                        case 'gemini':
                            adapter = new GeminiAdapter(apiKey);
                            break;
                        case 'claude':
                            adapter = new ClaudeAdapter(apiKey);
                            break;
                        case 'grok':
                            adapter = new GrokAdapter(apiKey);
                            break;
                        case 'llama':
                            adapter = new LlamaAdapter(apiKey);
                            break;
                        case 'deepseek':
                            adapter = new DeepseekAdapter(apiKey);
                            break;
                        default:
                            console.error('Unknown AI service:', service);
                            await addChatMessage(sessionId, 'system', "죄송합니다. 알 수 없는 AI 서비스입니다.");
                            return;
                    }

                    try {
                        const reply = await adapter.sendMessage(message);
                        await addChatMessage(sessionId, 'system', reply);
                        $.chatCtrl('#mychatbox', {
                            text: reply,
                            picture: chatStaff.imgUrl,
                            position: 'chat-left'
                        });
                    } catch (error) {
                        console.error('Error from AI service:', error);
                        await addChatMessage(sessionId, 'system', error.message || "AI 서비스와 통신 중 오류가 발생했습니다.");
                        $.chatCtrl('#mychatbox', {
                            text: error.message || "AI 서비스와 통신 중 오류가 발생했습니다.",
                            picture: chatStaff.imgUrl,
                            position: 'chat-left'
                        });
                    }
                    break;
                default:
                    await sendChatRequest(message, sessionId, Staff_func.url);
                    break;
            }
        } catch (err) {
            console.error(err);
        }
    }

    // 5) 항상 버튼·입력창 활성화
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
$(document).ready(function() {
  const memberId = getQueryParameter('id');
  const memberName = getQueryParameter('name');
  $('#chat-user-name').text(memberName);
  loadExistingChats(memberId);

});

"use strict";

// Initialize database
let db;
const request = indexedDB.open('chatDatabase', 1);

request.onerror = function(event) {
    console.error('Database error:', event.target.errorCode);
};

request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains('chats')) {
        const objectStore = db.createObjectStore('chats', { keyPath: 'chat_id' });
        objectStore.createIndex('contents', 'contents', { unique: false });
    }
};

request.onsuccess = function(event) {
    db = event.target.result;
    console.log('Database initialized successfully.');
    // Load chats once the database is ready
    const memberId = getQueryParameter('id');
    loadExistingChats(memberId);
};

async function loadExistingChats(memberId) {
    if (!memberId) {
        console.error('No memberId provided, cannot load chats.');
        return; 
    }

    const transaction = db.transaction(['chats'], 'readonly');
    const objectStore = transaction.objectStore('chats');
    const getRequest = objectStore.get(memberId);

    getRequest.onsuccess = function() {
        const existingChat = getRequest.result;
        console.log('Fetched chat data for memberId:', memberId, existingChat); // Log the result

        if (existingChat && Array.isArray(existingChat.contents)) {
            existingChat.contents.forEach(chatMessage => {
                $.chatCtrl('#mychatbox', {
                    text: chatMessage.text, // Access the text property
                    picture: './img/avatar/avatar-2.png',
                    position: chatMessage.type === 'user' ? 'chat-right' : 'chat-left' // Determine position based on type
                });
            });
        } else {
            console.log('No previous chats found for this user.');
        }
    };

    getRequest.onerror = function(event) {
        console.error('Error fetching chats:', event.target.error);
    };
}

async function saveChat(userId, userName, message, messageType) {
    const chatData = {
        chat_id: userId,
        chat_name: userName,
        contents: [{
            text: message,
            type: messageType // Add a type to distinguish between user and system messages
        }]
    };

    const transaction = db.transaction(['chats'], 'readwrite');
    const objectStore = transaction.objectStore('chats');
    const getRequest = objectStore.get(userId);

    getRequest.onsuccess = function() {
        const existingChat = getRequest.result;

        if (existingChat) {
            // Ensure contents is an array before pushing
            if (!Array.isArray(existingChat.contents)) {
                existingChat.contents = []; // Initialize as empty array if it's not
            }
            existingChat.contents.push({ text: message, type: messageType }); // Add the new message
            const updateRequest = objectStore.put(existingChat);
            updateRequest.onsuccess = function() {
                console.log('Chat updated successfully:', existingChat);
            };
            updateRequest.onerror = function(event) {
                console.error('Error updating chat:', event.target.error);
            };
        } else {
            // Add new record if it doesn't exist
            const addRequest = objectStore.add(chatData);
            addRequest.onsuccess = function() {
                console.log('Chat saved successfully:', chatData);
            };
            addRequest.onerror = function(event) {
                console.error('Error saving chat:', event.target.error);
            };
        }
    };

    getRequest.onerror = function(event) {
        console.error('Error fetching chat:', event.target.error);
    };
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

// Handle chat submission
const sessionId = crypto.randomUUID();
$("#chat-form").submit(function() {
    var me = $(this);
    var $form = $(this);
    var $input = $form.find('input');
    var $button = $form.find('button');

    // Disable input and button
    $input.prop('disabled', true);
    $button.prop('disabled', true);

    const message = $input.val().trim();
    if (message.length > 0) {
        const memberId = getQueryParameter('id');
        const memberName = getQueryParameter('name');
        saveChat(memberId,memberName, message, 'user'); // Call saveChat
        sendChatRequest(message, sessionId).then(function() {
            // Enable input and button when response is received
            $input.prop('disabled', false);
            $button.prop('disabled', false);
            $input.focus();
        });
        $.chatCtrl('#mychatbox', {
            text: message,
            picture: './img/avatar/avatar-2.png',
        });
        me.find('input').val('');
    } 
    return false;
});

// Send chat request to the server
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
            const reply = data[0].output || "죄송합니다. 응답을 받아오는 데 실패했습니다.";
            const memberId = getQueryParameter('id');
            const memberName = getQueryParameter('name');
            saveChat(memberId, memberName, reply, 'system'); // Call saveChat
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
    }
}

// Utility function to get query parameters
function getQueryParameter(key) {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(key);
    return value;
}

$(document).on("click", "#remove_btn", function() {
    const memberId = getQueryParameter('id'); // id 값을 가져옴
    if (memberId) {
        deleteChat(memberId); // 채팅 삭제 함수 호출
    } else {
        alert("사용자 ID를 찾을 수 없습니다.");
    }
    location.reload();
});
// Function to delete chat from IndexedDB
function deleteChat(memberId) {
    const transaction = db.transaction(['chats'], 'readwrite');
    const objectStore = transaction.objectStore('chats');
    const deleteRequest = objectStore.delete(memberId);

    deleteRequest.onsuccess = function() {
        alert("채팅 데이터가 성공적으로 삭제되었습니다!");
    };

    deleteRequest.onerror = function(event) {
        console.error('삭제 중 오류 발생:', event.target.error);
    };
}
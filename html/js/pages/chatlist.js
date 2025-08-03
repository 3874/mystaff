"use strict";

let db;
const request = indexedDB.open('chatDatabase', 1);

request.onerror = function(event) {
    console.error('Database error:', event.target.errorCode);
};

request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains('chats')) {
        db.createObjectStore('chats', { keyPath: 'chat_id' });
    }
};

request.onsuccess = function(event) {
    db = event.target.result;
    console.log('Database initialized successfully.');
    fetchAllChats();
};

// Function to fetch all chat messages
function fetchAllChats() {
    const transaction = db.transaction(['chats'], 'readonly');
    const objectStore = transaction.objectStore('chats');
    const getAllRequest = objectStore.getAll();

    getAllRequest.onsuccess = function(event) {
        const allChats = event.target.result;
        console.log('All chat messages:', allChats);
        displayChats(allChats);
    };

    getAllRequest.onerror = function(event) {
        console.error('Error fetching all chats:', event.target.error);
    };
}

function displayChats(chats) {
    const chatList = $("#chatlist");
    chatList.empty();
    chats.forEach(chat => {
        chatList.append(`<li class="list-group-item" data-id="${chat.chat_id}">${chat.chat_name}</li>`);
    });
}

$("#chatlist").on("click", ".list-group-item", function() {
    const chatId = $(this).data("id");
    window.location.href = `chat.html?id=${chatId}&name=${$(this).text()}`;
});

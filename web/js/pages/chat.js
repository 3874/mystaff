// chat.js (jQuery version)
import { getDataByKey, getAllData, updateData, deleteData, addData } from '../database.js';
import { deleteLTM } from '../memory.js';
import { handleMsg } from '../agents.js';
import { preprocess, postprocess } from '../process.js';
import { getAgentById } from '../allAgentsCon.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js'; // Import marked.js
import { handleCommand } from '../commands.js';
import { FindUrl, handleFileUpload } from '../utils.js';
import { getAllAgents } from '../allAgentsCon.js';
import { signOut } from '../utils.js';


let sessionId = null;
let mystaff = null;
let currentChat = [];
let staffId = null;
let mydata = null;


$(document).ready(async function() {
    const isLoggedIn = localStorage.getItem('mystaff_loggedin');

    if (isLoggedIn !== 'true') {
        // If not logged in, redirect to the sign-in page
        alert('You must be logged in to view this page.');
        window.location.href = './signin.html';
    } 
    const userId = localStorage.getItem('mystaff_user');
    if (!userId) {
      console.error('User ID not found in localStorage.');
      alert('An error occurred. Please sign in again.');
      return;
    }
    mydata = await getDataByKey('mydata', userId);

    await initializeChat();
    bindUIEvents();

    $('#signOutBtn').on('click', function(e) {
        e.preventDefault();
        signOut();
    });
});

async function initializeChat() {

    const params = new URLSearchParams(window.location.search);
    staffId = params.get('staffId');
    if (!staffId || staffId === 'undefined' || staffId === null) {
        sessionId = params.get('sessionId');
    } else {
        sessionId = null;
        const apikeys = localStorage.getItem('mystaff_credentials');
        const apikeysObj = JSON.parse(apikeys || '{}');
        const agent = await getAgentById(staffId) || {};
        console.log(agent);
        console.log(typeof agent);
        let apikey = '';

        if (!agent.adapter) {
            alert('Please select a staff member to chat with.');
            window.location.href = './mystaff.html';
            return;
        } else if (agent.adapter && agent.adapter !== 'http') {
            apikey = apikeysObj[agent.adapter] || '';
            if (!apikey || apikey.trim() === '' || apikey === 'undefined') {
                alert(`Please set your ${agent.adapter} API key in the credentials page.`);
                window.location.href = './credentials.html';
                return;
            }
        }
        const finalUrl = await FindUrl(agent);
        window.location.href = finalUrl;
    }
    
    await loadChatSession(sessionId);
    await loadSessionList();
}

async function loadChatSession(id) {
    const chatData = await getDataByKey('chat', id);
    if (chatData) {
        currentChat = chatData.msg || [];
        renderMessages(currentChat);

        if (chatData.staffId) {
            mystaff = await getAgentById(chatData.staffId);
            console.log(mystaff);
            $('#chatAgentName').text(mystaff.staff_name || "Chat");
        } else {
            mystaff = null;
        }
        
    }
}

async function loadSessionList() {
    const allSessions = await getAllData('chat');
    const $list = $('#sessionList');
    $list.empty();

    // Filter sessions by current staffId
    const filteredSessions = allSessions.filter(session => session.staffId === mystaff.staffId);

    filteredSessions.forEach(session => { // Iterate over filteredSessions
        const isActive = session.sessionId === sessionId ? 'active' : '';
        const listItem = `
            <li class="list-group-item chat-session-item ${isActive} d-flex justify-content-between align-items-center mb-2 small" data-session-id="${session.sessionId}">
                <span class="session-title" style="cursor:pointer;">${session.title || "Untitled"}</span>
                <div class="dropdown">
                    <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false"></button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item edit-title" href="#">Edit Title</a></li>
                        <li><a class="dropdown-item delete-session" href="#">Delete</a></li>
                    </ul>
                </div>
            </li>`;
        $list.append(listItem);
    });
}

async function renderMessages(msgs) {
    const $container = $('#chatMessages');
    let messagesHtml = '';
    
    for (const m of msgs) {
        if (m.user) {
            messagesHtml += `
                <div class="msg-container">
                    <div class="msg-content msg-user">
                        <p><b>User:</b></p>
                        <p>${m.user}</p>
                        <span class="msg-date text-muted small">${new Date(m.date).toLocaleString()}</span>
                    </div>
                </div>`;
        }
        if (m.system) {
            const speakerName = m.speaker || (mystaff ? mystaff.staff_name : "System");
            let bgColor = '#6c757d'; // Default color
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
                        <span class="msg-date text-muted small" style="color: #ccc;">${new Date(m.date).toLocaleString()}</span>
                    </div>
                </div>`;
        }
    }
    $container.html(messagesHtml);
    $container.prop('scrollTop', $container.prop('scrollHeight'));
}

function bindUIEvents() {
    $('#sendBtn').on('click', sendMessage);
    $('#messageInput').on('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });

    $('#fileUploadBtn').on('click', () => {
        $('#fileInput').click();
    });

    $('#fileInput').on('change', handleFileUpload);

    $('#inviteBtn').on('click', openInviteModal);

    $('#attendantsBtn').on('click', openAttendantsModal);

    // New Chat button functionality
    $('#newChat').on('click', async () => {
        // Generate a new sessionId
        const newSessionId = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => {
            return ('0' + byte.toString(16)).slice(-2);
        }).join('');

        // Determine the staffId for the new chat
        // If there's a current staff, use that staff's ID for the new chat
        // Otherwise, the new chat will start without a specific staff, and the user can select one later.
        const newChatStaffId = mystaff ? mystaff.staffId : null;

        try {
            // Create a new chat entry in the database
            await addData('chat', {
                sessionId: newSessionId,
                staffId: newChatStaffId,
                title: 'New Chat', // Default title for the new chat
                msg: [],
                attendants: [],
            });

            // Redirect to the new chat session
            window.location.href = `chat.html?sessionId=${newSessionId}`;
        } catch (error) {
            console.error("Error creating new chat session:", error);
            alert("Failed to create a new chat session. Please check the console for details.");
        }
    });

    // Event delegation for session list actions
    $('#sessionList').on('click', '.session-title', function() {
        const newSessionId = $(this).closest('li').data('session-id');
        if (newSessionId !== sessionId) {
            window.location.href = `chat.html?sessionId=${newSessionId}`;
        }
    });

    $('#sessionList').on('click', '.edit-title', async function(e) {
        e.preventDefault();
        const $listItem = $(this).closest('.list-group-item');
        const sessionToEditId = $listItem.data('session-id');
        const currentTitle = $listItem.find('.session-title').text();
        const newTitle = prompt("Enter new title", currentTitle);
        if (newTitle) {
            await updateData('chat', sessionToEditId, { title: newTitle });
            loadSessionList();
        }
    });

    $('#sessionList').on('click', '.delete-session', async function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to delete this session?')) {
            const $listItem = $(this).closest('.list-group-item');
            const sessionToDeleteId = $listItem.data('session-id');
            const chatData = await getDataByKey('chat', sessionToDeleteId);
            const staffIdToDelete = chatData.staffId;

            await deleteData('chat', sessionToDeleteId);
            await deleteLTM(sessionToDeleteId);

            if (sessionToDeleteId === sessionId) {
                const allSessions = await getAllData('chat');
                const nextSession = allSessions.find(s => s.staffId === staffIdToDelete);
                if (nextSession) {
                    window.location.href = `chat.html?sessionId=${nextSession.sessionId}`;
                } else if (staffIdToDelete) {
                    window.location.href = `chat.html?staffId=${staffIdToDelete}`;
                } else {
                    window.location.href = 'chat.html';
                }
            } else {
                loadSessionList();
            }
        }
    });
}

async function sendMessage() {
    const $inputEl = $('#messageInput');
    const text = $inputEl.val().trim();
    const iteration = 4;

    if (!text) return;

    if (text.startsWith('/')) {
        const userMessage = { user: text, date: new Date().toISOString() };
        currentChat.push(userMessage);
        renderMessages(currentChat);
        $inputEl.val('');

        const context = {
            sessionId,
            currentChat,
            renderMessages,
            postprocess
        };
        const commandIsValid = await handleCommand(text, context, iteration);

        if (!commandIsValid) {
            currentChat.pop(); // Remove the invalid command message
            renderMessages(currentChat);
        }
        return;
    }

    if (!mystaff) {
        alert("Please select a staff member to chat with.");
        return;
    }

    let responder = mystaff; // Default to host
    let messageToSend = text;

    if (text.startsWith('@')) {
        const mention = text.split(' ')[0].substring(1);
        messageToSend = text.substring(mention.length + 2).trim(); // Remove mention from message

        const chatData = await getDataByKey('chat', sessionId);
        const participants = [chatData.staffId, ...(chatData.attendants || [])];
        
        const allAgents = await getAllAgents();
        const mentionedAgent = allAgents.find(agent => agent.staff_name === mention && participants.includes(agent.staffId));

        if (mentionedAgent) {
            responder = mentionedAgent;
        } else {
            alert(`Agent "${mention}" is not a participant in this chat.`);
            return; 
        }
    }

    const $sendBtn = $('#sendBtn');
    const $spinner = $('#loadingSpinner');
    $inputEl.prop('disabled', true);
    $sendBtn.prop('disabled', true);
    $spinner.show();

    const tempUserMsg = { user: text, date: new Date().toISOString() };
    currentChat.push(tempUserMsg);
    renderMessages(currentChat);
    $inputEl.val('');

    try {
        const processedInput = await preprocess(sessionId, messageToSend, responder);
        const response = await handleMsg(processedInput, responder, sessionId);

        currentChat.pop();
        const chatTurn = { user: text, system: response, date: new Date().toISOString(), speaker: responder.staff_name, speakerId: responder.staffId };
        currentChat.push(chatTurn);

        renderMessages(currentChat);
    } catch (error) {
        console.error("Error sending message:", error);
        alert("An error occurred while sending your message. Please try again.");
    } finally {
        $inputEl.prop('disabled', false);
        $sendBtn.prop('disabled', false);
        $spinner.hide();
        await postprocess(sessionId, currentChat);
    }
}

async function openInviteModal() {
    const chatData = await getDataByKey('chat', sessionId);
    const currentParticipants = [chatData.staffId, ...(chatData.attendants || [])];
    console.log(currentParticipants);

    const availablAgentsIds = mydata.mystaff;
    const $staffList = $('#staffList');
    $staffList.empty();

    for (let i = 0; i < availablAgentsIds.length; i++) {
        let agent = await getAgentById(availablAgentsIds[i]);
        if (!agent) continue; // Skip if agent not found

        let listItem;
        if (availablAgentsIds[i] === chatData.staffId) {
            // Host - no checkbox, just display name with (Host)
            listItem = `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${agent.staff_name} <span class="badge bg-primary rounded-pill">Host</span>
                </li>
            `;
        } else {
            // Other staff - with checkbox for inviting
            listItem = `
                <li class="list-group-item">
                    <input class="form-check-input me-1" type="checkbox" value="${availablAgentsIds[i]}" id="staff-${availablAgentsIds[i]}">
                    <label class="form-check-label" for="staff-${availablAgentsIds[i]}">${agent.staff_name}</label>
                </li>
            `;
        }
        $staffList.append(listItem);
    }

    const inviteModal = new bootstrap.Modal(document.getElementById('inviteModal'));
    inviteModal.show();

    // Restore the 'sendInviteBtn' functionality
    $('#sendInviteBtn').off('click').on('click', async () => {
        const selectedStaff = [];
        $('#staffList input:checked').each(function() {
            selectedStaff.push($(this).val());
        });

        if (selectedStaff.length > 0) {
            const existingAttendants = chatData.attendants || [];
            const newAttendants = [...new Set([...existingAttendants, ...selectedStaff])];
            await updateData('chat', sessionId, { attendants: newAttendants });
            alert('Invitations sent!');
            inviteModal.hide();
        } else {
            alert('Please select at least one staff member to invite.');
        }
    });
}

async function openAttendantsModal() {
    const chatData = await getDataByKey('chat', sessionId);
    const attendants = chatData.attendants || [];
    const participants = [chatData.staffId, ...attendants];

    const $attendantsList = $('#attendantsList');
    $attendantsList.empty();

    for (const staffId of participants) {
        const agent = await getAgentById(staffId);
        if (agent) {
            let listItem;
            if (staffId === chatData.staffId) {
                listItem = `<li class="list-group-item">${agent.staff_name} (Host)</li>`;
            } else {
                listItem = `
                    <li class="list-group-item d-flex justify-content-between align-items-center" data-staff-id-li="${staffId}">
                        ${agent.staff_name}
                        <button type="button" class="btn-close" aria-label="Close" data-staff-id-btn="${staffId}"></button>
                    </li>
                `;
            }
            $attendantsList.append(listItem);
        }
    }

    const attendantsModal = new bootstrap.Modal(document.getElementById('attendantsModal'));
    attendantsModal.show();

    // Use event delegation to handle clicks on dynamically added buttons
    $('#attendantsList').off('click', '.btn-close').on('click', '.btn-close', async function() {
        const staffIdToRemove = $(this).data('staff-id-btn');
        if (confirm(`Are you sure you want to remove this participant?`)) {
            const currentChatData = await getDataByKey('chat', sessionId);
            const currentAttendants = currentChatData.attendants || [];
            const newAttendants = currentAttendants.filter(id => id !== staffIdToRemove);
            await updateData('chat', sessionId, { attendants: newAttendants });
            
            // Just remove the item from the list in the DOM
            $(this).closest('li').remove();
        }
    });
}

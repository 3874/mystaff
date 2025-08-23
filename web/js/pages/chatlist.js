import { getAllData, deleteData, updateData } from '../database.js';
import { getAgentById } from '../allAgentsCon.js'; // Assuming this is needed to get staff name
import { deleteLTM } from '../memory.js'; // For deleting LTM associated with chat
import { signOut } from '../utils.js';

$(document).ready(async function() {
    // Check for login status
    const isLoggedIn = localStorage.getItem('mystaff_loggedin');

    if (isLoggedIn !== 'true') {
        // If not logged in, redirect to the sign-in page
        alert('You must be logged in to view this page.');
        window.location.href = 'signin.html';
    } else {
        await loadChatList();
        bindChatListEvents();
    }

});

async function loadChatList() {
    const allSessions = await getAllData('chat');
    const $chatListUl = $('#chatlist ul'); // Target the ul inside the div#chatlist
    $chatListUl.empty();

    if (allSessions && allSessions.length > 0) {
        for (const session of allSessions) {
            let staffName = 'Unknown Staff';
            if (session.staffId) {
                const agent = await getAgentById(session.staffId);
                if (agent) {
                    staffName = agent.staff_name || 'Unnamed Agent';
                }
            }

            const listItem = `
                <li class="list-group-item d-flex justify-content-between align-items-center" data-session-id="${session.sessionId}">
                    <div>
                        <a class="dropdown-item open-chat" href="chat.html?sessionId=${session.sessionId}">
                            <h5 class="mb-1 session-title" style="cursor:pointer;">${session.title || "Untitled Chat"}</h5>
                            <small class="text-muted">Staff: ${staffName}</small>
                        </a>
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-danger delete-session" type="button">Delete</button>
                    </div>
                </li>`;
            $chatListUl.append(listItem);
        }
    } else {
        $chatListUl.append('<li class="list-group-item text-center text-muted">No chat sessions found.</li>');
    }
}

function bindChatListEvents() {
    $('#chatlist').on('click', '.open-chat', function(e) {
        // No preventDefault here, let the link navigate
    });

    $('#chatlist').on('click', '.delete-session', async function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to delete this chat session?')) {
            try {
                const $listItem = $(this).closest('.list-group-item');
                const sessionIdToDelete = $listItem.data('session-id');

                if (!sessionIdToDelete) {
                    console.error('Could not find session ID to delete.');
                    alert('An error occurred. Could not determine which session to delete.');
                    return;
                }

                await deleteData('chat', sessionIdToDelete);
                await deleteLTM(sessionIdToDelete); // Delete associated LTM

                loadChatList(); // Reload the list after deletion
            } catch (error) {
                console.error('Error deleting chat session:', error);
                alert('An error occurred while deleting the chat session.');
            }
        }
    });
}
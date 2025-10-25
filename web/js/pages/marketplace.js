import { getAllAgentsWithStatus } from '../allAgentsCon.js';
import { signOut, getCurrentUser } from '../utils.js';
import { initModeratorChat } from '../moderator-chat.js';
import { initAuthGuard } from '../auth-guard.js';

$(document).ready(async function() {
  // 인증 체크
  if (!initAuthGuard()) {
    return;
  }

  await initializeFindStaffPage();
  
  // Initialize moderator chat functionality
  initModeratorChat();
  
  $('#signOutBtn').on('click', function(e) {
    e.preventDefault();
    signOut();
  });
});



async function initializeFindStaffPage() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('User not found.');
      window.location.href = './signin.html';
      return;
    }

    const userId = user.email;

    const $allStaffList = $('#ex-staff-row');

    $allStaffList.empty();

    const agents = await getAllAgentsWithStatus();
    console.log(agents);

    agents.forEach((agent, index) => {
      if (agent) { // Check if agent was found
        const avatarNumber = (index % 5) + 1;
        const avatarUrl = `../img/avatar/avatar-${avatarNumber}.png`;
        const listItem = `
          <div class="col-12 col-md-6 col-lg-3 mb-4">
            <div class="card h-100 text-center">
              <img src="${avatarUrl}" alt="${agent.staff_name || 'Agent'}'s avatar" class="card-img-top rounded-circle mx-auto mt-3" style="width: 100px; height: 100px; object-fit: cover;">
              <div class="card-body">
                <h5 class="card-title">${agent.staff_name || 'Unnamed Agent'}</h5>
                <a href="./intern-profile.html?staffId=${agent.staff_id}" class="btn btn-primary btn-sm mb-2">Detail</a>
                <br><br>
                <h6 class="card-subtitle mb-2 text-muted">${agent.role || 'No role specified'}</h6>
                <p class="card-text">${agent.summary || 'No summary.'}</p>
              </div>
            </div>
          </div>
        `;
        $allStaffList.append(listItem);
      }
    });

  } catch (error) {
    console.error('Failed to initialize find staff page:', error);
    alert('An error occurred while loading the page.');
  }
}



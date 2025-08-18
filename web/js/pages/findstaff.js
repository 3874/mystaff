import { getAllAgents } from '../allAgentsCon.js';

$(document).ready(function() {
  // Check for login status
  const isLoggedIn = localStorage.getItem('mystaff_loggedin');

  if (isLoggedIn !== 'true') {
    alert('You must be logged in to view this page.');
    window.location.href = './signin.html';
  } else {
    initializeFindStaffPage();
  }
});

async function initializeFindStaffPage() {
  try {
    const userId = localStorage.getItem('mystaff_user');
    if (!userId) {
      console.error('User ID not found in localStorage.');
      window.location.href = './signin.html';
      return;
    }

    const $allStaffList = $('#all-staff-row');

    $allStaffList.empty();

    const agents = await getAllAgents();
    console.log(agents);

    agents.forEach((agent, index) => {
      if (agent) { // Check if agent was found
        const avatarNumber = (index % 5) + 1;
        const avatarUrl = `../img/avatar/avatar-${avatarNumber}.png`;
        const listItem = `
          <li class="list-group-item d-flex justify-content-between align-items-center mb-3 border rounded ms-3">
            <div class="d-flex align-items-center ms-3">
              <img src="${avatarUrl}" alt="${agent.staff_name || 'Agent'}'s avatar" class="rounded-circle me-3" style="width: 60px; height: 60px;">
              <div>
                <h5 class="mb-1">${agent.staff_name || 'Unnamed Agent'}</h5>
                <p class="mb-1 text-muted">${agent.role || 'No role specified'}</p>
                <small>${agent.description || 'No description.'}</small>
              </div>
            </div>
            <div class="d-flex justify-content-end">
            <a href="./staff-profile.html?staffId=${agent.staffId}" class="btn btn-sm btn-primary ms-auto me-3">Detail</a>
            </div>
          </li>
        `;
        $allStaffList.append(listItem);
      }
    });


  } catch (error) {
    console.error('Failed to initialize find staff page:', error);
    alert('An error occurred while loading the page.');
  }
}



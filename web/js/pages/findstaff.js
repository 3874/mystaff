import { getAllAgents } from '../allAgentsCon.js';
import { signOut } from '../utils.js';

$(document).ready(function() {
  // Check for login status
  const isLoggedIn = localStorage.getItem('mystaff_loggedin');

  if (isLoggedIn !== 'true') {
    alert('You must be logged in to view this page.');
    window.location.href = './signin.html';
  } else {
    initializeFindStaffPage();
  }
  
  $('#signOutBtn').on('click', function(e) {
    e.preventDefault();
    signOut();
  });
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
              <div class="col-12 col-md-6 mb-4">
                <div class="card h-100">
                  <div class="card-body d-flex align-items-center">
                    <img src="${avatarUrl}" alt="${agent.staff_name || 'Agent'}'s avatar" class="rounded-circle me-3" style="width: 60px; height: 60px;">
                    <div class="flex-grow-1">
                      <h5 class="card-title">${agent.staff_name || 'Unnamed Agent'}</h5>
                      <p class="card-text text-muted">${agent.role || 'No role specified'}</p>
                      <p class="card-text">${agent.summary || 'No summary.'}</p>
                    </div>
                    <a href="./staff-profile.html?staffId=${agent.staffId}" class="btn btn-sm btn-primary ms-3">Detail</a>
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



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

    const $allStaffList = $('#ex-staff-row');

    $allStaffList.empty();

    const agents = await getAllAgents();
    console.log(agents);

    agents.forEach((agent, index) => {
      if (agent) { // Check if agent was found
        const avatarNumber = (index % 5) + 1;
        const avatarUrl = `../img/avatar/avatar-${avatarNumber}.png`;
        const listItem = `
          <div class="col-12 col-md-6 col-lg-4 mb-4">
            <div class="card h-100 text-center">
              <img src="${avatarUrl}" alt="${agent.staff_name || 'Agent'}'s avatar" class="card-img-top rounded-circle mx-auto mt-3" style="width: 100px; height: 100px; object-fit: cover;">
              <div class="card-body">
                <h5 class="card-title">${agent.staff_name || 'Unnamed Agent'}</h5>
                <a href="./staff-profile.html?staffId=${agent.staff_id}" class="btn btn-primary btn-sm mb-2">Detail</a>
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



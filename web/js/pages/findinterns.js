import { getAllAgentsWithStatus } from '../allAgentsCon.js';
import { signOut, FindUrl } from '../utils.js';

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

  const qaBotButton = `
    <button id="qa-bot-fab" class="btn btn-primary rounded-circle shadow" style="position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; font-size: 24px; z-index: 1000; display: flex; align-items: center; justify-content: center;">
      <i class="fas fa-question"></i>
    </button>
  `;

  $('body').append(qaBotButton);

  // Click event for the QA bot button
  $('#qa-bot-fab').on('click', async function(event) {
    event.preventDefault();
    let agentDataJson = localStorage.getItem("mystaff_default_agent");
    let agentData = JSON.parse(agentDataJson);
    const mystaff = agentData.find((agent) => agent.staff_id === "default_20220111_00001");
    console.log(mystaff);
    const finalUrl = await FindUrl(mystaff, 1);
    setTimeout(() => {
      $("#chatModal").modal('show');
    }, 100);
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

    const agents = await getAllAgentsWithStatus();
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



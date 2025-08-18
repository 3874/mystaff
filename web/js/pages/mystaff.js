import { getDataByKey, getAllData } from '../../js/database.js'; // Import getAllData
import { getAgentById } from '../allAgentsCon.js'; // Import the function


$(document).ready(function() {
  // Check for login status
  const isLoggedIn = localStorage.getItem('mystaff_loggedin');

  if (isLoggedIn !== 'true') {
    // If not logged in, redirect to the sign-in page
    alert('You must be logged in to view this page.');
    window.location.href = 'signin.html';
  } else {
    // If logged in, proceed to load the staff agents
    loadStaffAgents();
  }

  $('#default-member-list').on('click', 'a[data-id]', async function(event) {
    event.preventDefault(); 

    const agentId = $(this).data('id'); 
    
    const mystaff = await getAgentById(agentId);
    console.log(mystaff);

    const finalUrl = await FindUrl(mystaff);
    window.location.href = finalUrl;

  });

});


async function loadStaffAgents() {
  try {
    const userId = localStorage.getItem('mystaff_user');
    if (!userId) {
      console.error('User ID not found in localStorage.');
      alert('An error occurred. Please sign in again.');
      return;
    }

    const userData = await getDataByKey('mydata', userId);
    console.log(userData);

    if (userData) {
      // Populate company name
      if (userData.company) {
        $('#company-name').text(userData.company);
      }

      // Populate staff lists
      const $defaultList = $('#default-member-list');

      $defaultList.empty();

      if (userData.mystaff && Array.isArray(userData.mystaff) && userData.mystaff.length > 0) {
        
        // Use Promise.all to fetch all agent details concurrently
        const agentPromises = userData.mystaff.map(staffId => getAgentById(staffId));
        const agents = await Promise.all(agentPromises);

        agents.forEach(agent => {
          if (agent) { // Check if agent was found
            console.log(agent);
            const listItem = `
              <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <h5 class="mb-1">${agent.staff_name || 'Unnamed Agent'}</h5>
                  <p class="mb-1 text-muted">${agent.role || 'No role specified'}</p>
                  <small>${agent.summary || 'No description.'}</small>
                </div>
                <a href="./chat.html?staffId=${agent.staffId}" class="btn btn-sm btn-primary">Chat</a>
              </li>
            `;
            $defaultList.append(listItem);
          }
        });
      } else {
        $defaultList.html('<li class="list-group-item">You have no staff agents.</li>');
      }
      

    } else {
      console.error('Could not find user data for ID:', userId);
      alert('Could not load your profile. Please sign in again.');
    }
  } catch (error) {
    console.error('Failed to load staff agents:', error);
    alert('An error occurred while loading your staff agents.');
  }
}
import { getDataByKey, updateData } from '../../js/database.js'; // Import getAllData
import { getAgentById } from '../allAgentsCon.js'; // Import the function
import { signOut, FindUrl } from '../utils.js';

$(document).ready(function() {
  // Check for login status
  const isLoggedIn = localStorage.getItem('mystaff_loggedin');

  if (isLoggedIn !== 'true') {
    // If not logged in, redirect to the sign-in page
    alert('You must be logged in to view this page.');
    window.location.href = './signin.html';
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
  $('#signOutBtn').on('click', function(e) {
    e.preventDefault();
    signOut();
  });

  // Event listener for the "Fire" button
  $('#default-member-list').on('click', '.fire-staff-btn', async function(event) {
    event.preventDefault();
    const staffIdToFire = $(this).data('staff-id');

    if (confirm(`Are you sure you want to fire this staff member (ID: ${staffIdToFire})?`)) {
      try {
        const userId = localStorage.getItem('mystaff_user');
        if (!userId) {
          console.error('User ID not found in localStorage.');
          alert('An error occurred. Please sign in again.');
          return;
        }

        const userData = await getDataByKey('mydata', userId);
        if (userData && userData.mystaff) {
          const updatedMystaff = userData.mystaff.filter(id => id !== staffIdToFire);
          await updateData('mydata', userId, { mystaff: updatedMystaff });
          alert('Staff member fired successfully!');
          loadStaffAgents(); // Re-render the list
        } else {
          alert('Could not find staff data to update.');
        }
      } catch (error) {
        console.error('Error firing staff member:', error);
        alert('An error occurred while trying to fire the staff member.');
      }
    }
  });

  // Event listener for the "Detail" button
  $('#default-member-list').on('click', '.detail-btn', function(event) {
    event.preventDefault();
    const staffId = $(this).data('staff-id');
    setTimeout(() => {
      window.location.href = `./staff-profile.html?staffId=${staffId}`;
    }, 100);
  });

  // Event listener for the "Chat" button
  $('#default-member-list').on('click', '.chat-btn', async function(event) {
    event.preventDefault();
    const staffId = $(this).data('staff-id');
    const mystaff = await getAgentById(staffId);
    const finalUrl = await FindUrl(mystaff);
    setTimeout(() => {
        window.location.href = finalUrl;
    }, 100);
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
          if (agent) { 
            const listItem = `
              <div class="col-12 col-md-6 mb-4">
                <div class="card h-100">
                  <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${agent.staff_name || 'Unnamed Agent'}</h5>
                    <p class="card-text text-muted">${agent.role || 'No role specified'}</p>
                    <p class="card-text flex-grow-1">${agent.summary || 'No description.'}</p>
                    <div class="d-flex flex-row gap-2 mt-auto">
                      <button type="button" class="btn btn-sm btn-warning detail-btn" data-staff-id="${agent.staff_id}">Detail</button>
                      <button type="button" class="btn btn-sm btn-primary chat-btn" data-staff-id="${agent.staff_id}">Chat</button>
                      <button type="button" class="btn btn-sm btn-danger fire-staff-btn" data-staff-id="${agent.staff_id}">Fire</button>
                    </div>
                  </div>
                </div>
              </div>
            `;
            $defaultList.append(listItem);
          }
        });
      } else {
        $defaultList.html('<div class="col-12"><p class="text-center">You have no staff agents.</p></div>');
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
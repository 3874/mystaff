import { getDataByKey, updateData, deleteData } from '../database.js'; // Import updateData
import { getAgentById, addAgent } from '../allAgentsCon.js'; // Import the function
import { signOut } from '../utils.js';
let staffId;

$(document).ready(async function() {
  try {
    // Check for login status
    const isLoggedIn = localStorage.getItem('mystaff_loggedin');

    if (isLoggedIn !== 'true') {
      // If not logged in, redirect to the sign-in page
      alert('You must be logged in to view this page.');
      window.location.href = 'signin.html';
    } else {
      const userId = localStorage.getItem('mystaff_user');
      if (!userId) {
        console.error('User ID not found in localStorage.');
        alert('An error occurred. Please sign in again.');
        window.location.href = './signin.html';
        return;
      }

      // extract the staffId from url and getAgentById
      const urlParams = new URLSearchParams(window.location.search);
      staffId = urlParams.get('staffId');
      console.log(staffId);

      if (!staffId) {
        alert('No staffId provided in the URL.');
        window.location.href = 'mystaff.html';
        return;
      }

      let staffData;
      try {
        staffData = await getDataByKey('diystaff', staffId);
        if (!staffData) {
          alert('Staff data not found for the given ID.');
          window.location.href = 'mystaff.html';
          return;
        }
      } catch (error) {
        console.error('Error fetching staff data:', error);
        alert('Failed to load staff data. Please try again.');
        window.location.href = 'mystaff.html';
        return;
      }
      
      loadStaffAgent(staffData);

      $('.hire-btn').on('click', async function(e) {
        e.preventDefault(); // Prevent default link behavior

        const currentStaffId = staffId; // Get staffId again for clarity

        if (!currentStaffId) {
          alert('Error: Staff ID not found for hiring.');
          return;
        }
        
        console.log(staffData);
        try {
          // staffData의 staus값을 success로 바꾸고 addAgent 함수를 이용해서 staffData 값을 넣는다.
          staffData.status = 'success';
          await addAgent(staffData);
          alert('Staff member added to MyStaff list!');
        } catch (error) {
          console.error('Error adding staff member:', error);
          alert('Failed to add staff member. Please try again.');
        }
        //window.location.href = './registstatus.html'; // Redirect to mystaff.html
      });

      $('.remove-btn').on('click', async function(e) {
        e.preventDefault();
        console.log(staffId);
        try {
          // 이값을 가지고 diystaff store에서 값을 삭제
          await deleteData('diystaff', staffId);
          alert('Staff member removed from MyStaff list!');
          window.location.href = './registstatus.html';
        } catch (error) {
          console.error('Error removing staff member:', error);
          alert('Failed to remove staff member. Please try again.');
        }
      });

      $('#signOutBtn').on('click', function(e) {
        e.preventDefault();
        try {
          signOut();
        } catch (error) {
          console.error('Error signing out:', error);
          alert('An error occurred during sign out. Please try again.');
        }
      });
    }
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    alert('An unexpected error occurred. Please refresh the page.');
  }
});

function loadStaffAgent(staffData) {
  // Populate image
  const avatarNumber = (Math.floor(Math.random() * 5) % 5) + 1; // Assuming staff_id can be used to cycle avatars
  const avatarUrl = `../img/avatar/avatar-${avatarNumber}.png`;
  $('.author-box-picture').attr('src', avatarUrl);
  $('.author-box-picture').attr('alt', staffData.staff_name || 'Agent');
  $('.author-box-staffId').text(staffData.staffId || 'N/A');
  $('.author-box-name').text(staffData.staff_name || 'Unnamed Agent');
  $('.author-box-job').text(staffData.role || 'No role specified');
  $('.author-box-summary').text(staffData.summary || 'No description available.');
  $('.author-box-adapter').text(staffData.adapter || 'Unnamed Agent');
  $('.author-box-model').text(staffData.model || 'No mode specified');
  $('.author-box-url').text(staffData.service_url || 'No service url available.');
  $('.author-box-output').text(staffData.output_type || 'No output type specified');
  $('.author-box-systemprompt').text(staffData.system_prompt || 'No system prompt available.');
  $('.author-box-maxtoken').text(staffData.token_limit || 'No max token specified');
  $('.author-box-fileupload').text(staffData.file_uploading ? 'Enabled' : 'Disabled');
  $('.author-box-ragSupport').text(staffData.rag_support ? 'Enabled' : 'Disabled');
  $('.author-box-status').text(staffData.status || 'N/A'); // Add this line
}



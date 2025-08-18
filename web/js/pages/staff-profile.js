import { getDataByKey, updateData } from '../database.js'; // Import updateData
import { getAgentById } from '../allAgentsCon.js'; // Import the function

$(document).ready(async function() {
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
    const staffId = urlParams.get('staffId');
    console.log(staffId);

    if (!staffId) {
      alert('No staffId');
      window.location.href = 'mystaff.html';
      return;
    }

    const staffData = await getAgentById(staffId);
    console.log(staffData);
    loadStaffAgent(staffData);

    // Hire button click handler
    $('.hire-btn').on('click', async function(e) {
      e.preventDefault(); // Prevent default link behavior

      const currentStaffId = staffId; // Get staffId again for clarity

      if (!currentStaffId) {
        alert('Error: Staff ID not found.');
        return;
      }

      let userData = await getDataByKey('mydata', userId);
      if (!userData) {
        window.location.href = './signin.html';
        return; // Initialize with myId if no user data exists
      }
      if (!userData.mystaff) {
        userData.mystaff = []; // Initialize mystaff array if it doesn't exist
      }

      // Check if staffId already exists in mystaff
      if (userData.mystaff.includes(currentStaffId)) {
        alert('This staff member is already in your MyStaff list!');
      } else {
        userData.mystaff.push(currentStaffId); // Add staffId to mystaff
        await updateData('mydata', userId, userData); // Save updated user data
        alert('Staff member added to your MyStaff list!');
      }

      window.location.href = './mystaff.html'; // Redirect to mystaff.html
    });
  }
});

function loadStaffAgent(staffData) {
  // Populate image
  const avatarNumber = (Math.floor(Math.random() * 5) % 5) + 1; // Assuming staff_id can be used to cycle avatars
  const avatarUrl = `../img/avatar/avatar-${avatarNumber}.png`;
  $('.author-box-picture').attr('src', avatarUrl);
  $('.author-box-picture').attr('alt', staffData.staff_name || 'Agent');

  // Populate staff ID
  $('.author-box-staffId').text(`Staff ID: ${staffData.staffId || 'N/A'}`);

  // Populate name
  $('.author-box-name').text(staffData.staff_name || 'Unnamed Agent');

  // Populate job/role
  $('.author-box-job').text(staffData.role || 'No role specified');

  // Populate description
  $('.author-box-description').text(staffData.summary || 'No description available.');

}



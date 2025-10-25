import { getDataByKey, updateData } from '../database.js';
import { getAgentById } from '../allAgentsCon.js';
import { signOut, getCurrentUser } from '../utils.js';
import { initAuthGuard } from '../auth-guard.js';

$(document).ready(async function() {
  // 인증 체크
  if (!initAuthGuard()) {
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    console.error('User not found.');
    alert('An error occurred. Please sign in again.');
    window.location.href = './signin.html';
    return;
  }

  const userId = user.email;

  // extract the staffId from url and getAgentById
  const urlParams = new URLSearchParams(window.location.search);
  const staffId = urlParams.get('staffId');

  if (!staffId) {
    alert('No staffId');
      window.location.href = 'mystaff.html';
      return;
    }

    const staffData = await getAgentById(staffId);
    console.log(staffData);
    loadStaffAgent(staffData);

    $('.import-btn').on('click', async function(e) {
      e.preventDefault(); // Prevent default link behavior

      const currentStaffId = staffId; 

      if (!currentStaffId) {
        alert('Error: Staff ID not found.');
        return;
      }

      // Check if the staff data already exists in the 'myinterns' store
      const existingStaff = await getDataByKey('myinterns', currentStaffId);

      if (existingStaff) {
        alert('This staff member is already in your My Interests list!');
      } else {
        // Save the entire staffData object to the 'myinterns' store
        await updateData('myinterns', currentStaffId, staffData);
        alert('Staff member added to your My Interests list!');
      }

      window.location.href = './myinterns.html'; // Redirect to myinterns.html
    });

  $('#signOutBtn').on('click', function(e) {
    e.preventDefault();
    signOut();
  });
});

function loadStaffAgent(staffData) {
  // Populate image
  const avatarNumber = (Math.floor(Math.random() * 5) % 5) + 1; // Assuming staff_id can be used to cycle avatars
  const avatarUrl = `../img/avatar/avatar-${avatarNumber}.png`;
  $('.author-box-picture').attr('src', avatarUrl);
  $('.author-box-picture').attr('alt', staffData.staff_name || 'Agent');
  $('.author-box-staffId').text(staffData.staff_id || 'N/A');
  $('.author-box-name').text(staffData.staff_name || 'Unnamed Agent');
  $('.author-box-role').text(staffData.role || 'No role specified');
  $('.author-box-summary').text(staffData.summary || 'No description available.');
  $('.author-box-input').text(JSON.stringify(staffData.input_format) || 'No input type specified');
  $('.author-box-output').text(JSON.stringify(staffData.output_format) || 'No output type specified');
  
  // staffData.adapter는 object type 이다. 만약 값이 있다면 $('.author-box-adapter')아래 테이블로 넣자
  const adapterData = staffData.adapter;
  let tableHtml = '';
  if (adapterData && typeof adapterData === 'object' && Object.keys(adapterData).length > 0) {
    for (const [key, value] of Object.entries(adapterData)) {
      tableHtml += `
        <tr>
          <th class="text-center border" style="width: 25%;">${key}</th>
          <td class="border" style="width: 75%;">${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}</td>
        </tr>
      `;
    }
  }

  $('.author-box-adapter').append(tableHtml);

}



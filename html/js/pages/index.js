import { init, getUserData, updateUser } from '../mystaffDB.js';
import { CheckSignIn } from '../custom.js';

$(document).ready(function() {
  const myprofileJSON = CheckSignIn();
  console.log(myprofileJSON);
  const mystaff = JSON.parse(myprofileJSON);
  $('#company-name').text(mystaff.companyName || 'No Name');
  defaultMember();
  renderMembers(mystaff.members || []);

});

function defaultMember() {
  const $list = $('#member-list');
  $list.empty();

  // Make an AJAX call to get all staff members
  $.ajax({
    url: 'https://r2jt9u3d5g.execute-api.ap-northeast-2.amazonaws.com/default/mystaff',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ action: 'getall' }), // Using 'getall' action as seen in findstaff.js
    success: function(response) {
      let allStaffData;

      if (response.body && typeof response.body === 'string') {
        try {
          allStaffData = JSON.parse(response.body);
        } catch (e) {
          console.error('Error parsing response body for default members:', e);
          return;
        }
      } else if (Array.isArray(response)) {
        allStaffData = response;
      } else {
        console.error('Unexpected response format for default members:', response);
        return;
      }

      // Ensure that the parsed data is an array before calling .filter
      if (!Array.isArray(allStaffData)) {
          console.error('API response for default members is not an array:', allStaffData);
          $list.append('<li>Error: API response format is incorrect.</li>');
          return;
      }

      // Filter for staff with staff_type === 'default'
      const defaultStaff = allStaffData.filter(staff => staff.staff_type === 'default');
      console.log('All staff data:', defaultStaff);
      
      if (defaultStaff.length > 0) {
        defaultStaff.forEach(staffData => {
          const $memberItem = $(`
            <li class="media member-item" data-id="${staffData.staff_id}">
              <img alt="image" class="mr-3 rounded-circle" width="50" src="${staffData.imgUrl || './img/avatar/avatar-1.png'}">
              <div class="media-body">
                <div class="mt-0 mb-1 font-weight-bold">${staffData.name}</div>
                <div class="text-small"> ${staffData.description}</div>
              </div>
            </li>
          `);

          $memberItem.on('click', function() {
            localStorage.setItem('mystaff_staffData', JSON.stringify(staffData));
            window.location.href = `chat.html`;
          });

          $list.append($memberItem);
        });
      } else {
        console.log('No default staff members found.');
        $list.append('<li>No Default Staff Members Found</li>');
      }
    },
    error: function(error) {
      console.error('Error fetching default staff data:', error);
      $list.append('<li>Error loading default staff.</li>');
    }
  });
}       

function renderMembers(members) {
  const $list = $('#member-list');


  if (Array.isArray(members) && members.length > 0) {
    members.forEach(element => {
      $.ajax({
        url: 'https://r2jt9u3d5g.execute-api.ap-northeast-2.amazonaws.com/default/mystaff',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ action: 'read', staff_id: element }),
        success: function(response) {
          let staffData;

          // Parse the response
          if (response.body && typeof response.body === 'string') {
            try {
              staffData = JSON.parse(response.body);
            } catch (e) {
              console.error('Error parsing response body:', e);
              return;
            }
          } else if (typeof response === 'object' && response !== null) {
            staffData = response;
          } else {
            console.error('Unexpected response format:', response);
            return;
          }

          console.log(staffData);

          const $memberItem = $(`
            <li class="media member-item" data-id="${staffData.staff_id}">
              <img alt="image" class="mr-3 rounded-circle" width="50" src="${staffData.imgUrl || './img/avatar/avatar-1.png'}">
              <div class="media-body">
                <div class="mt-0 mb-1 font-weight-bold">${staffData.name}</div>
                <div class="text-small"> ${staffData.description}</div>
              </div>
              <div class="btn-group mb-3" role="group" aria-label="Basic example">
                <button type="button" class="btn btn-sm btn-danger fire-btn">Fire</button>
              </div>
            </li>
          `);
          
          $memberItem.find('.fire-btn').on('click', function(e) {
            e.stopPropagation();
            const staffId = $(this).closest('.member-item').data('id');
            fireStaff(staffId);
          });

          $memberItem.on('click', function() {
            localStorage.setItem('mystaff_staffData', JSON.stringify(staffData));
            window.location.href = `detail.html`;
          });

          $list.append($memberItem);

        },
        error: function(error) {
          console.error('Error fetching staff data:', error);
          // Optionally show an error message for each member
        }
      });
    });
  } else {
    console.error('No staff IDs found.');
    $list.append('<li>No hired Staff</li>');
  }
}

function fireStaff(staffId) {
  if (confirm('Are you sure you want to fire this staff member?')) {
    init()
      .then(() => getUserData())
      .then(data => {
        const mystaff = data[0];
        if (!mystaff) {
          throw new Error("User data not found. Please sign in again.");
        }
        const updatedMembers = mystaff.members.filter(id => id !== staffId);
        mystaff.members = updatedMembers;
        return updateUser(mystaff);
      })
      .then(() => {
        // Update localStorage after successful DB update
        return getUserData();
      })
      .then(data => {
        const updatedMystaff = data[0];
        localStorage.setItem("mystaffInfo", JSON.stringify(updatedMystaff));
        $(`.member-item[data-id="${staffId}"]`).remove();
        alert('Staff member fired successfully.');
      })
      .catch(error => {
        console.error('Error firing staff member:', error.message);
        alert(error.message || 'Failed to fire staff member.');
      });
  }
}
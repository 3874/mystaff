$(document).ready(function() {
  const mystaffJSON = CheckSignIn();
  console.log(mystaffJSON);
  const mystaff = JSON.parse(mystaffJSON);
  $('#company-name').text(mystaff.companyName || 'No Name');
  renderMembers(mystaff.members || []);

});

function renderMembers(members) { // Accept the members parameter
  const $list = $('#member-list');
  $list.empty();


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
                <div class="text-small"> ${staffData.expertise}</div>
              </div>
              <div class="btn-group mb-3" role="group" aria-label="Basic example">
                <button type="button" class="btn btn-sm btn-danger fire-btn">Fire</button>
                <button type="button" class="btn btn-sm btn-warning chat-btn">Chat</button>
                <button type="button" class="btn btn-sm btn-success detail-btn">Detail</button>
              </div>
            </li>
          `);
          
          $memberItem.find('.fire-btn').on('click', function(e) {
            e.stopPropagation();
            const staffId = $(this).closest('.member-item').data('id');
            fireStaff(staffId);
          });

          $memberItem.find('.chat-btn').on('click', function() {
            window.location.href = `chat.html?id=${staffData.staff_id}&name=${staffData.name}`; // Redirect to chat.html
          });

          $memberItem.find('.detail-btn').on('click', function() {
            window.location.href = `detail.html?id=${staffData.staff_id}`; // Redirect to chat.html
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
    $list.append('<li>No Staff IDs Provided</li>');
  }
}

function fireStaff(staffId) {
  if (confirm('Are you sure you want to fire this staff member?')) {
    MystaffDB.init()
      .then(() => MystaffDB.getAllData())
      .then(data => {
        const mystaff = data[0];
        if (!mystaff) {
          throw new Error("User data not found. Please sign in again.");
        }
        const updatedMembers = mystaff.members.filter(id => id !== staffId);
        mystaff.members = updatedMembers;
        return MystaffDB.updateUser(mystaff);
      })
      .then(() => {
        // Update localStorage after successful DB update
        return MystaffDB.getAllData();
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
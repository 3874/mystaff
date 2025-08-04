$(document).ready(function() {
  MystaffDB.init()
    .then(() => {
      return MystaffDB.getAllData(); // Fetch and log all data on initial load
    })
    .then(data => {
      const mystaff = data[0] || {}; // Assuming the first entry is the current staff
      $('#company-name').text(mystaff.companyName || 'No Name');
      console.log(mystaff);
      renderMembers(mystaff.members || []); // Pass the members array to renderMembers
    })
    .catch(error => {
      console.error("Error while initializing DB:", error);
    });
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
              <button class="btn btn-danger btn-sm fire-btn">Fire</button>
            </li>
          `);
          
          $memberItem.find('.fire-btn').on('click', function(e) {
            e.stopPropagation();
            const staffId = $(this).closest('.member-item').data('id');
            fireStaff(staffId);
          });

          $memberItem.on('click', function() {
            window.location.href = `chat.html?id=${staffData.staff_id}&name=${staffData.name}`; // Redirect to chat.html
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
    MystaffDB.getAllData()
      .then(data => {
        const mystaff = data[0];
        const updatedMembers = mystaff.members.filter(id => id !== staffId);
        mystaff.members = updatedMembers;
        return MystaffDB.updateUser(mystaff);
      })
      .then(() => {
        $(`.member-item[data-id="${staffId}"]`).remove();
        alert('Staff member fired successfully.');
      })
      .catch(error => {
        console.error('Error firing staff member:', error);
        alert('Failed to fire staff member.');
      });
  }
}
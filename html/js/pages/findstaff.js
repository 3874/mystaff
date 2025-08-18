import { CheckSignIn } from '../custom.js';

$(document).ready(function() {
  const myprofileJSON = CheckSignIn();
  console.log(myprofileJSON);
  const mystaff = JSON.parse(myprofileJSON);
  
  function populateStaff(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let staffHTML = '';
    data.forEach(staff => {
      staffHTML += `
        <div class="col-6 col-sm-4 col-lg-2 mb-4 text-center">
          <a href="aiprofile.html?id=${staff.id}" class="text-decoration-none text-dark">
            <img alt="${staff.name}" src="${staff.avatar}" class="rounded-circle mb-2" style="width: 80px; height: 80px; object-fit: cover;" data-toggle="tooltip" title="${staff.name}">
            <h6 class="mb-0">${staff.name}</h6>
            <p class="text-muted small">${staff.role}</p>
          </a>
        </div>
      `;
    });
    container.innerHTML = staffHTML;
    // Re-initialize tooltips for dynamically added elements
    $('[data-toggle="tooltip"]').tooltip();
  }

  // Fetch staff data from API
  $.ajax({
    url: 'https://r2jt9u3d5g.execute-api.ap-northeast-2.amazonaws.com/default/mystaff',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ action: 'getall' }), // or whatever action your API expects
    success: function(response) {
      console.log('Staff data fetched successfully:', response);
      let data = [];
      // Check if the actual data is in the 'body' property and is a string
      if (response.body && typeof response.body === 'string') {
        try {
          data = JSON.parse(response.body);
        } catch (e) {
          console.error('Error parsing response body:', e);
          return; // Exit if parsing fails
        }
      } else if (Array.isArray(response)) {
        // If the response itself is the array
        data = response;
      } else {
        console.error('Unexpected response format:', response);
        return; // Exit if the format is not as expected
      }

      // Ensure that the parsed data is an array before calling .map
      if (!Array.isArray(data)) {
          console.error('Parsed data is not an array:', data);
          return;
      }

      // Filter out staff with staff_type === 'default'
      const filteredData = data.filter(item => item.staff_type !== 'default');

      const staffData = filteredData.map(item => ({
        id: item.staff_id, // Adjust if the field name is different
        name: item.name,
        avatar: item.imgUrl || './img/avatar/avatar-1.png', // Default avatar
        role: item.role,
        icon: 'fas fa-user' // Default icon, adjust as needed
      }));

      populateStaff('featured-staff-row', staffData);
      populateStaff('latest-updated-staff-row', staffData);
    },
    error: function(error) {
      console.error('Error fetching staff data:', error);
    }
  });

  // 예시: 검색 결과를 동적으로 표시
  $('#findstaff-form').on('submit', function(e) {
    e.preventDefault();
    const keyword = $(this).find('input').val().trim();
    const $list = $('#findstaff-list');
    $list.empty();
    if (keyword) {
      // 실제 구현에서는 Ajax 등으로 검색 결과를 받아와야 함
      $list.append(`
        <li class="list-group-item">
          <div class="d-flex align-items-center">
            <img alt="image" src="./img/avatar/avatar-1.png" class="rounded-circle mr-3" style="width: 60px; height: 60px; object-fit: cover;">
            <div>
              <div class="font-weight-bold">검색 결과 예시: ${keyword}</div>
              <div class="text-muted text-small">Role: 예시</div>
            </div>
          </div>
        </li>
      `);
    } else {
      $list.append('<li class="text-center text-muted">검색어를 입력하세요.</li>');
    }
  });
});
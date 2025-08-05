$(document).ready(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const staffId = urlParams.get('id');
  const mystaffJSON = CheckSignIn();
  console.log(mystaffJSON);

      if (staffId) {
        $.ajax({
          url: 'https://r2jt9u3d5g.execute-api.ap-northeast-2.amazonaws.com/default/mystaff',
          type: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ action: 'read', staff_id: staffId }),
          success: function(response) {
            let staffData;
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

            if (Array.isArray(staffData) && staffData.length > 0) {
                staffData = staffData[0];
            } else if (Array.isArray(staffData) && staffData.length === 0) {
                console.error('Staff not found for id:', staffId);
                $('.author-box-name a').text('Staff Not Found');
                return;
            }

            $('.author-box-picture').attr('src', staffData.imgUrl || './img/avatar/avatar-1.png');
            $('.author-box-name a').text(staffData.name);
            $('.author-box-job').text(staffData.role);
            $('.author-box-description p').text(staffData.expertise); 
            
            const chatLink = `index.html`;
            $('.float-right a.btn').attr('href', chatLink);
          },
          error: function(error) {
            console.error('Error fetching staff data:', error);
            $('.author-box-name a').text('Error loading profile');
          }
        });
      } else {
        console.error('No staff ID found in URL.');
        $('.author-box-name a').text('No Staff ID Provided');
      }

});


$(document).ready(function() {
  //로그인체크
  const myprofileJSON = CheckSignIn();
  console.log(myprofileJSON);
  const mystaff = JSON.parse(myprofileJSON);

  //url의 id에서 staffId 받기
  const urlParams = new URLSearchParams(window.location.search);
  const staffId = urlParams.get('id');

  //staffId를 가지고 staff 정보 가져와 화면에 노출
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
            localStorage.setItem('mystaff_staffData', JSON.stringify(staffData));
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

  // hire 버튼 누르면 owner objectstore(테이블)의 members에 배열로 저장
  $('#hire-btn').on('click', function(e) {
    e.preventDefault();
    if (!staffId) {
      alert('Staff ID not found. Cannot hire staff.');
      return;
    }

  MystaffDB.init()
    .then(() => MystaffDB.getUserData())
    .then(data => {
      console.log(data);
      const mystaff = data[0] || {}; // 데이터가 없을 경우를 대비
      const members = mystaff.members || [];

      if (members.includes(staffId)) {
        throw new Error('Staff is already hired.');
      }

      members.push(staffId);
      mystaff.members = members;

      // DB 업데이트를 요청하고, 업데이트에 사용된 mystaff 객체를 다음 then으로 넘깁니다.
      return MystaffDB.updateUser(mystaff).then(() => mystaff); 
    })
    .then(updatedMystaff => {
      localStorage.setItem("mystaffInfo", JSON.stringify(updatedMystaff));
      alert('Staff hired successfully!');
      location.href = "./index.html";
    })
    .catch(error => {
      console.error('Error hiring staff:', error.message);
      alert(error.message || 'Error hiring staff.');
    });
  });

});


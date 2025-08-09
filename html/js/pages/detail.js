import { init, getChatSessionByStaffId, addChatSession } from '../mystaffDB.js';
import { CheckSignIn } from '../custom.js';
import { generateUUID } from '../utils.js';

var staffData;

$(document).ready(function() {

    const myprofileJSON = CheckSignIn();
    console.log(myprofileJSON);

    const chatJson = localStorage.getItem('mystaff_staffData');
    if (!chatJson) {
      location.href="index.html";
    }
    staffData = JSON.parse(chatJson);
    console.log("staffData:", staffData);
    $('.author-box-picture').attr('src', staffData.imgUrl || './img/avatar/avatar-1.png');
    $('.author-box-name a').text(staffData.name);
    $('.author-box-job').text(staffData.role);
    $('.author-box-description p').text(staffData.description); 
    const chatLink = `index.html`;
    $('.float-right a.btn').attr('href', chatLink);

    $('.json-btn').on('click', function() {
      const functionJSON = staffData.functionJSON;
      $('#json-data').text(JSON.stringify(functionJSON, null, 2));
      $('#jsonModal').modal('show');
    });

    $('.chat-btn').on('click', async function() {
      try {
        // 클릭할 때마다 DB 초기화 시도
        await init();
        console.log("MystaffDB initialized on click");

        // 초기화 후 세션 조회/생성 로직
        let session = await getChatSessionByStaffId(staffData.staff_id);
        console.log('기존 세션:', session);

        if (session) {
          window.location.href = `chat.html?sessionId=${session.sessionId}`;
        } else {
          const newSessionId = generateUUID();
          const sessionObj = {
            sessionId: newSessionId,
            title: staffData.name,
            staff_id: staffData.staff_id
          };
          await addChatSession(sessionObj);
          console.log('새 세션 생성:', sessionObj);
          window.location.href = `chat.html?sessionId=${newSessionId}`;
        }
      } catch (error) {
        console.error('채팅 세션 처리 중 오류:', error);
        alert('채팅을 시작하는 데 실패했습니다. 다시 시도해주세요.');
      }
    });


});
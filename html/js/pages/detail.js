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
      let session = await MystaffDB.getChatSessionByStaffId(staffData.staff_id);
      console.log(session);
      if (session) {
        //location.href = `chat.html?sessionId=${session.sessionId}`;
      } else {
        const newSessionId = crypto.randomUUID();
        //location.href = `chat.html?sessionId=${newSessionId}`;
      }
    });

});
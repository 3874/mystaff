import { init, getChatSessionsByStaffId, addChatSession } from '../mystaffDB.js';
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
    $('.author-box-name').text(staffData.name);
    $('.author-box-staffId').text(staffData.staff_id);
    $('.author-box-job').text(staffData.role);
    $('.author-box-lang').text(staffData.lang);
    $('.author-box-description').text(staffData.description); 
    const chatLink = `index.html`;
    $('.float-right a.btn').attr('href', chatLink);

    $('.json-btn').on('click', function() {
      const functionJSON = staffData.functionJSON;
      const tableBody = $('#json-table tbody');
      tableBody.empty(); // Clear previous content

      for (const key in functionJSON) {
        if (Object.hasOwnProperty.call(functionJSON, key)) {
          const value = functionJSON[key];
          const row = `<tr><td>${key}</td><td>${value}</td></tr>`;
          tableBody.append(row);
        }
      }
      $('#jsonModal').modal('show');
    });

    $('.chat-btn').on('click', async function() {
    });


});
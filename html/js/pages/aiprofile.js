$(document).ready(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const staffId = urlParams.get('id');
  let mystaff; 
  MystaffDB.init()
    .then(() => {
        return MystaffDB.getAllData(); // Fetch and log all data on initial load
    })
    .then(data => {
        mystaff = data[0];
        console.log("Current data in 'owner' table:", data);
    })
    .catch(error => {
        console.error("Error while initializing DB:", error);
    });


  if (staffId) {
    $.ajax({
      url: 'https://r2jt9u3d5g.execute-api.ap-northeast-2.amazonaws.com/default/mystaff',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ action: 'read', staff_id: staffId }),
      success: function(response) {
        let staffData;
        // The response from API Gateway is often an object with a stringified 'body'.
        if (response.body && typeof response.body === 'string') {
          try {
            staffData = JSON.parse(response.body);
          } catch (e) {
            console.error('Error parsing response body:', e);
            return;
          }
        } else if (typeof response === 'object' && response !== null) {
          // Fallback if the response is already a JSON object.
          staffData = response;
        } else {
          console.error('Unexpected response format:', response);
          return;
        }

        // When getting by ID, the result might be an array with one item.
        if (Array.isArray(staffData) && staffData.length > 0) {
            staffData = staffData[0];
        } else if (Array.isArray(staffData) && staffData.length === 0) {
            console.error('Staff not found for id:', staffId);
            // Maybe display a "not found" message on the page
            $('.author-box-name a').text('Staff Not Found');
            return;
        }

        // Populate the profile card with the fetched data
        $('.author-box-picture').attr('src', staffData.imgUrl || './img/avatar/avatar-1.png');
        $('.author-box-name a').text(staffData.name);
        $('.author-box-job').text(staffData.role);
        // Assuming 'expertise' maps to the description field
        $('.author-box-description p').text(staffData.expertise); 
        
        // Update the hiring link to go to the chat page with the staff's ID
        const chatLink = `mystaff.html`;
        $('.float-right a.btn').attr('href', chatLink);
      },
      error: function(error) {
        console.error('Error fetching staff data:', error);
        // Display an error message on the page
        $('.author-box-name a').text('Error loading profile');
      }
    });
  } else {
    console.error('No staff ID found in URL.');
    // Display a message indicating no ID was provided
    $('.author-box-name a').text('No Staff ID Provided');
  }


  $('#hire-btn').on('click', function() {
    if (!staffId) {
      alert('Staff ID not found. Cannot hire staff.');
      return;
    }
    console.log(mystaff);
    const members = mystaff.members || [];
    
    //members에 staffID가 있는지 체크
    if (members.includes(staffId)) {
      alert('Staff is already hired.');
      return;
    }

    members.push(staffId);
    mystaff.members = members;
    // mystaffDB에 update
    const db = indexedDB.open("mystaff", 1);
    db.onerror = function(event) {
      console.error("Database error: " + event.target.errorCode);
    };
    db.onsuccess = function(event) {
      const db = event.target.result;
      const transaction = db.transaction(["owner"], "readwrite");
      const objectStore = transaction.objectStore("owner");
      const updateRequest = objectStore.put(mystaff);
      updateRequest.onsuccess = function() {
        alert('Staff hired successfully!');
      };
      updateRequest.onerror = function() {
        alert('Error hiring staff.');
      };
    };
  });

});


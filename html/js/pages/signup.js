$(document).ready(function() {

  MystaffDB.init()
    .then(() => {
        return MystaffDB.getAllData(); // Fetch and log all data on initial load
    })
    .then(data => {
        console.log("Current data in 'owner' table:", data);
    })
    .catch(error => {
        console.error("Error while initializing DB:", error);
    });


  $('#generate-secret-key').on('click', function() {
    const randomString = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => {
      return ('0' + byte.toString(16)).slice(-2);
    }).join('');
    $('#secret_key').val(randomString);
  });

  $('form').on('submit', function(e) {
    e.preventDefault();
    const nick = $('#nick').val().trim();
    const companyName = $('#company').val().trim();
    const email = $('#email').val().trim();
    const secretKey = $('#secret_key').val().trim();
    const password = $('#password').val();
    const passwordConfirm = $('#password2').val();

    if (!nick || !companyName || !email || !secretKey || !password || !passwordConfirm) {
      alert('All fields are required.');
      return;
    }
    if (password !== passwordConfirm) {
      alert('Passwords do not match.');
      return;
    }

    MystaffDB.getAllData().then(data => {
        if (data.some(user => user.email === email)) {
            alert('An account with this email already exists.');
        } else {
            const newUser = { nick, companyName, email, secretKey, password };
            MystaffDB.addUser(newUser)
                .then(() => {
                    localStorage.setItem("mystaffInfo", JSON.stringify(newUser));
                    alert('Registration successful!');
                    window.location.href = 'index.html';
                })
                .catch(error => {
                    alert('Failed to register. Please try again. ' + error);
                });
        }
    }).catch(error => {
        alert('Failed to check existing users: ' + error);
    });
  });

  $('#reset-database').on('click', function() {
      if (confirm('Are you sure you want to delete all registered data? This cannot be undone.')) {
          MystaffDB.clearAllData()
              .then(() => {
                  alert('Database has been reset.');
                  console.log("All data cleared from 'owner' table.");
                  return MystaffDB.getAllData();  // Re-fetch and log now-empty table
              })
              .then(data => {
                  console.log("Current data in 'owner' table (after reset):", data);
              })
              .catch(error => {
                  alert('Failed to reset the database: ' + error);
              });
      }
  });
});
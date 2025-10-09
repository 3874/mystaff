import { addData, getAllData } from '../../js/database.js';

$(document).ready(function() {
  const $signupForm = $('#signupForm');
  const $generateKeyBtn = $('#generate-secret-key');

  if ($generateKeyBtn.length) {
    $generateKeyBtn.on('click', function() {
      const randomString = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => {
        return ('0' + byte.toString(16)).slice(-2);
      }).join('');
      $('#secret_key').val(randomString);
    });
  }

  if ($signupForm.length) {
    $signupForm.on('submit', async function(e) {
      e.preventDefault();

      // Get form values (using jQuery)
      const nick = $.trim($('#nick').val() || '');
      const company = $.trim($('#company').val() || '');
      const email = $.trim($('#email').val() || '');
      const secretKey = $.trim($('#secret_key').val() || '');
      const password = $('#password').val() || '';
      const password2 = $('#password2').val() || '';
      const agree = $('#agree').prop('checked');

      // Validation
      if (!nick || !company || !email || !secretKey || !password || !password2) {
        alert('All fields are required.');
        return;
      }
      if (password !== password2) {
        alert('Passwords do not match.');
        return;
      }
      if (!agree) {
        alert('You must agree to the terms and conditions.');
        return;
      }

      try {
        const existingUsers = await getAllData('mydata');
        if (existingUsers.some(function(user) { return user.myId === email; })) {
          alert('An account with this email already exists.');
          return;
        }

        const newUser = {
          myId: email, // Using email as the primary key
          nick,
          company,
          secretKey,
          password, // Note: Storing passwords in plain text is not secure for production.
          mystaff: [],
          credentials: {}
        };

        await addData('mydata', newUser);

        alert('Registration successful!');
        window.location.href = './signin.html'; // Redirect to sign-in page

      } catch (error) {
        console.error('Registration failed:', error);
        alert('Failed to register. Please try again.');
      }
    });
  }
});

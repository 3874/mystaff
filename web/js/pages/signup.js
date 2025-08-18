import { addData, getAllData } from '../../js/database.js';

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  const generateKeyBtn = document.getElementById('generate-secret-key');

  if (generateKeyBtn) {
    generateKeyBtn.addEventListener('click', () => {
      const randomString = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => {
        return ('0' + byte.toString(16)).slice(-2);
      }).join('');
      document.getElementById('secret_key').value = randomString;
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Get form values
      const nick = document.getElementById('nick').value.trim();
      const company = document.getElementById('company').value.trim();
      const email = document.getElementById('email').value.trim();
      const secretKey = document.getElementById('secret_key').value.trim();
      const password = document.getElementById('password').value;
      const password2 = document.getElementById('password2').value;
      const agree = document.getElementById('agree').checked;

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
        if (existingUsers.some(user => user.myId === email)) {
          alert('An account with this email already exists.');
          return;
        }

        const newUser = {
          myId: email, // Using email as the primary key
          nick,
          company,
          secretKey,
          password, // Note: Storing passwords in plain text is not secure for production.
          mystaff: []
        };

        await addData('mydata', newUser);
        
        // For simplicity, just storing a flag. Old code stored the whole user object.
        localStorage.setItem("mystaff_loggedin", "true");
        localStorage.setItem("mystaff_user", email);


        alert('Registration successful!');
        window.location.href = './mystaff.html'; // Redirect to chat page

      } catch (error) {
        console.error('Registration failed:', error);
        alert('Failed to register. Please try again.');
      }
    });
  }
});

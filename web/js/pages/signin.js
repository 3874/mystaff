import { getDataByKey } from '../../js/database.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) {
        alert('Please enter both email and password.');
        return;
      }

      try {
        const user = await getDataByKey('mydata', email);

        if (user && user.password === password) {
          // Note: Storing passwords in plain text is not secure.
          // This is for demonstration purposes only.
          alert('Login successful!');
          
          localStorage.setItem("mystaff_loggedin", "true");
          localStorage.setItem("mystaff_user", user.myId); // Store user's ID (email)

          window.location.href = './mystaff.html'; // Redirect to the main chat page
        } else {
          alert('Invalid email or password.');
        }
      } catch (error) {
        console.error('Login failed:', error);
        alert('An error occurred during login. Please try again.');
      }
    });
  }
});

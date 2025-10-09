import { getDataByKey, getAllData } from '../../js/database.js';

$(function() {
  const $loginForm = $('#loginForm');

  if ($loginForm.length) {
    $loginForm.on('submit', async function(e) {
      e.preventDefault();

      const email = $.trim($('#email').val() || '');
      const password = $('#password').val() || '';

      if (!email || !password) {
        alert('Please enter both email and password.');
        return;
      }

      try {
        // 먼저 키로 직접 조회
        let user = await getDataByKey('mydata', email);

        // 폴백: 키로 못찾으면 전체를 가져와 이메일(대소문자 구분 없이)으로 검색
        if (!user) {
          const allUsers = await getAllData('mydata');
          user = (allUsers || []).find(u => {
            return u && u.myId && u.myId.toLowerCase() === email.toLowerCase();
          });
        }

        const credentials = (user && user.credentials) || {};

        if (user && user.password === password) {
          alert('Login successful!');

          localStorage.setItem('mystaff_loggedin', 'true');
          localStorage.setItem('mystaff_user', user.myId);
          localStorage.setItem('mystaff_credentials', JSON.stringify(credentials));

          window.location.href = './mystaff.html';
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

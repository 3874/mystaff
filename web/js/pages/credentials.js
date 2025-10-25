import { getDataByKey, updateData } from '../database.js';
import { initAuthGuard } from '../auth-guard.js';
import { getCurrentUser } from '../utils.js';

$(document).ready(async function() {
    // 인증 체크
    if (!initAuthGuard()) {
        return;
    }

    const user = await getCurrentUser();
    if (!user) {
      console.error('User not found.');
      window.location.href = './signin.html';
      return;
    }

    const userId = user.email;
    const form = $('#credentials-form');
    let mydata;
    // Function to load credentials from IndexedDB
    const loadCredentials = async () => {
        try {
            mydata = await getDataByKey('mydata', userId);
            if (!mydata) {
                console.warn('No credentials found for user:', userId);
                return;
            }

            const credentials = mydata.credentials || {};
            if (credentials) {
                if (credentials.openai) $('#openai-key').val(credentials.openai);
                if (credentials.gemini) $('#gemini-key').val(credentials.gemini);
                if (credentials.claude) $('#claude-key').val(credentials.claude);
                if (credentials.grok) $('#grok-key').val(credentials.grok);
                if (credentials.llama) $('#llama-key').val(credentials.llama);
                if (credentials.deepseek) $('#deepseek-key').val(credentials.deepseek);
            }
        } catch (error) {
            console.error("Error loading credentials:", error);
        }
    };

    // Function to save credentials to IndexedDB
    form.on('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        const credentials = {
            openai: $('#openai-key').val(),
            gemini: $('#gemini-key').val(),
            claude: $('#claude-key').val(),
            grok: $('#grok-key').val(),
            llama3: $('#llama-key').val(),
            deepseek: $('#deepseek-key').val()
        };

        mydata.credentials = credentials;

        try {
            await updateData('mydata', userId, mydata);
            localStorage.setItem('mystaff_credentials', JSON.stringify(credentials));
            alert('Credentials saved successfully!');
            window.location.href = './mystaff.html'; // Redirect to staff page after saving
        } catch (error) {
            console.error("Error saving credentials:", error);
            alert('Error saving credentials.');
        }
    });

    // Add event listeners for password toggle buttons
    $('.toggle-password').on('click', function() {
        const button = $(this);
        const targetId = button.data('target');
        const passwordInput = $('#' + targetId);
        const icon = button.find('i');

        if (passwordInput.attr('type') === 'password') {
            passwordInput.attr('type', 'text');
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
            passwordInput.attr('type', 'password');
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        }
    });

    // Load credentials when the page loads
    loadCredentials();
});

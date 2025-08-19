import { getDataByKey, updateData } from '../database.js';

$(document).ready(function() {
    // Basic login check: Redirect to signin if no token is found
    const isLoggedIn = localStorage.getItem('mystaff_loggedin'); // Assuming 'mystaff_loggedin' is stored upon successful login
    if (!isLoggedIn) {
        window.location.href = './signin.html';
        return; // Stop execution if not authenticated
    }

    const userId = localStorage.getItem('mystaff_user');
    if (!userId) {
      console.error('User ID not found in localStorage.');
      window.location.href = './signin.html';
      return;
    }

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
                if (credentials.openaiKey) $('#openai-key').val(credentials.openaiKey);
                if (credentials.geminiKey) $('#gemini-key').val(credentials.geminiKey);
                if (credentials.claudeKey) $('#claude-key').val(credentials.claudeKey);
                if (credentials.grokKey) $('#grok-key').val(credentials.grokKey);
                if (credentials.llamaKey) $('#llama-key').val(credentials.llamaKey);
                if (credentials.deepseekKey) $('#deepseek-key').val(credentials.deepseekKey);
            }
        } catch (error) {
            console.error("Error loading credentials:", error);
        }
    };

    // Function to save credentials to IndexedDB
    form.on('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        const credentials = {
            openaiKey: $('#openai-key').val(),
            geminiKey: $('#gemini-key').val(),
            claudeKey: $('#claude-key').val(),
            grokKey: $('#grok-key').val(),
            llamaKey: $('#llama-key').val(),
            deepseekKey: $('#deepseek-key').val()
        };

        mydata.credentials = credentials;

        try {
            await updateData('mydata', userId, mydata);
            alert('Credentials saved successfully!');
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

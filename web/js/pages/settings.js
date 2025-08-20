import { getDataByKey, updateData } from '../../js/database.js';
import { signOut } from '../utils.js';

$(document).ready(function() {
    // Check for login status
    const isLoggedIn = localStorage.getItem('mystaff_loggedin');
    if (isLoggedIn !== 'true') {
        alert('You must be logged in to view this page.');
        window.location.href = './signin.html';
        return;
    }

    loadSettings();

    $('#settings-form').on('submit', function(e) {
        e.preventDefault();
        saveSettings();
    });

    $('#signOutBtn').on('click', function(e) {
        e.preventDefault();
        signOut();
    });
});

async function loadSettings() {
    try {
        const userId = localStorage.getItem('mystaff_user');
        if (!userId) {
            console.error('User ID not found.');
            return;
        }
        const userData = await getDataByKey('mydata', userId);
        if (userData && userData.settings) {
            $('#rag-switch').prop('checked', userData.settings.rag === true);
            $('#long-term-memory-switch').prop('checked', userData.settings.longTermMemory === true);
            $('#file-server-switch').prop('checked', userData.settings.fileServer === true);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        alert('Failed to load settings.');
    }
}

async function saveSettings() {
    try {
        const userId = localStorage.getItem('mystaff_user');
        if (!userId) {
            console.error('User ID not found.');
            alert('You must be logged in to save settings.');
            return;
        }

        const settings = {
            rag: $('#rag-switch').is(':checked'),
            longTermMemory: $('#long-term-memory-switch').is(':checked'),
            fileServer: $('#file-server-switch').is(':checked')
        };

        const userData = await getDataByKey('mydata', userId) || {};
        userData.settings = settings;

        await updateData('mydata', userId, userData);

        alert('Settings saved successfully!');
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings.');
    }
}

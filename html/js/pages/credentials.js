import { init, getApiKey, updateApiKey } from '../mystaffDB.js';

$(document).ready(function() {
    const myprofileJSON = CheckSignIn();
    console.log(myprofileJSON);
    init().then(() => {
        // Load existing API keys
        const providers = ['openai', 'gemini', 'claude', 'grok', 'llama', 'deepseek'];
        providers.forEach(async (provider) => {
            const apiKeyData = await getApiKey(provider);
            if (apiKeyData) {
                $(`#${provider}-key`).val(apiKeyData.key);
            }
        });
    }).catch(error => {
        console.error("Error initializing DB or loading API keys:", error);
        alert("Failed to load API keys.");
    });

    $('#credentials-form').on('submit', async function(event) {
        event.preventDefault();

        const providers = ['openai', 'gemini', 'claude', 'grok', 'llama', 'deepseek'];
        for (const provider of providers) {
            const key = $(`#${provider}-key`).val().trim();
            if (key) {
                try {
                    await updateApiKey({ serviceName: provider, key: key });
                    console.log(`API key for ${provider} saved.`);
                } catch (error) {
                    console.error(`Error saving API key for ${provider}:`, error);
                    alert(`Failed to save API key for ${provider}.`);
                }
            }
        }
        alert('API Credentials saved successfully!');
    });
});
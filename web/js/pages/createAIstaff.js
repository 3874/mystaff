import { addData } from '../database.js';

$(function() {
    const adapterSelect = $('#adapter');
    const serviceUrlInput = $('#service_url');
    const modelSelect = $('#model');
    const modelTextInput = $('#model_text');
    const tokenLimitInput = $('#token_limit');
    const systemPromptInput = $('#system_prompt');
    const staffNameInput = $('#staff_name');
    const outputTypeInput = $('#output_type');
    const agentForm = $('#agentForm');

    // Function to generate a unique staffId using crypto.getRandomValues
    function generateStaffId() {
        const randomBytes = new Uint8Array(16); // 16 bytes for a 32-character hex string
        crypto.getRandomValues(randomBytes);
        const hexString = Array.from(randomBytes, byte => {
            return ('0' + byte.toString(16)).slice(-2);
        }).join('');
        return `mystaff_${hexString}`;
    }

    $.getJSON('../json/adapter.json', function(data) {
        const defaultUrls = data.defaultUrls;
        const modelOptions = data.modelOptions;

        const updateFields = () => {
            const selectedAdapter = adapterSelect.val();

            if (defaultUrls[selectedAdapter]) {
                serviceUrlInput.val(defaultUrls[selectedAdapter]);
            } else {
                serviceUrlInput.val('');
            }

            if (selectedAdapter === 'http') {
                modelSelect.hide();
                modelTextInput.show();
                modelTextInput.val('');
                tokenLimitInput.val('');
            } else {
                modelSelect.show();
                modelTextInput.hide();
                modelTextInput.val('');

                modelSelect.empty();
                const models = modelOptions[selectedAdapter] || [];
                if (models.length === 0) {
                    modelSelect.append($('<option>').val('').text('-- No models available --'));
                }
                models.forEach(model => {
                    const option = $('<option>').val(model.value).text(model.text);
                    if (model.token_limit) {
                        option.data('token-limit', model.token_limit);
                    }
                    modelSelect.append(option);
                });

                if (models.length > 0) {
                    modelSelect.val(models[0].value);
                    const selectedOption = modelSelect.find('option:selected');
                    const tokenLimit = selectedOption.data('token-limit');
                    if (tokenLimit) {
                        tokenLimitInput.val(tokenLimit);
                    } else {
                        tokenLimitInput.val('');
                    }
                } else {
                    tokenLimitInput.val('');
                }
            }
        };

        modelSelect.on('change', function() {
            const selectedOption = $(this).find('option:selected');
            const tokenLimit = selectedOption.data('token-limit');
            if (tokenLimit) {
                tokenLimitInput.val(tokenLimit);
            } else {
                tokenLimitInput.val('');
            }
        });

        adapterSelect.on('change', updateFields);
        updateFields();

        if (!systemPromptInput.val()) {
            systemPromptInput.val("You are a helpful AI assistant. Please respond to user queries accurately and concisely.");
        }

        agentForm.on('submit', function(e) {
            e.preventDefault();

            if (!staffNameInput.val().trim()) {
                alert('Staff Name is required.');
                staffNameInput.focus();
                return;
            }

            let finalAdapter = adapterSelect.val();
            let finalModel;
            let finalServiceUrl = serviceUrlInput.val();
            let finalOutputType = outputTypeInput.val();
            let finalTokenLimit = parseInt(tokenLimitInput.val(), 10);

            if (!finalAdapter) {
                finalAdapter = 'openai';
                adapterSelect.val(finalAdapter);
            }

            if (finalAdapter === 'http') {
                finalModel = modelTextInput.val();
            } else {
                finalModel = modelSelect.val();
                if (!finalModel) {
                    finalModel = 'gpt-4o-mini';
                    modelSelect.val(finalModel);
                }
            }

            if (!finalServiceUrl && defaultUrls[finalAdapter]) {
                finalServiceUrl = defaultUrls[finalAdapter];
                serviceUrlInput.val(finalServiceUrl);
            }

            if (!finalOutputType) {
                finalOutputType = 'text';
                outputTypeInput.val(finalOutputType);
            }

            if (isNaN(finalTokenLimit) || finalTokenLimit <= 0) {
                const selectedModelOption = modelSelect.find('option:selected');
                const defaultModelTokenLimit = selectedModelOption.data('token-limit');
                finalTokenLimit = defaultModelTokenLimit || 128000;
                tokenLimitInput.val(finalTokenLimit);
            }

            const newStaffId = generateStaffId();

            const newStaff = {
                staffId: newStaffId,
                staff_name: staffNameInput.val(),
                role: $('#role').val(),
                summary: $('#summary').val(),
                service_url: finalServiceUrl,
                token_limit: finalTokenLimit,
                file_uploading: $('#file_uploading').prop('checked'),
                adapter: finalAdapter,
                model: finalModel,
                system_prompt: systemPromptInput.val(),
                rag_support: $('#rag_support').prop('checked'),
                output_type: finalOutputType,
                color: $('#color').val(),
                status: 'pending'
            };

            addData('diystaff', newStaff)
                .then(() => {
                    alert('New staff registered successfully!');
                    agentForm[0].reset();
                    updateFields();
                    window.location.href = './registstatus.html';
                })
                .catch(error => {
                    console.error("Error saving new staff to database:", error.name, error.message);
                    alert('Failed to register new staff.');
                });
        });

    }).fail(function(jqxhr, textStatus, error) {
        console.error("Error loading adapter.json: " + textStatus + ", " + error);
        alert('Failed to load adapter configuration.');
    });
});

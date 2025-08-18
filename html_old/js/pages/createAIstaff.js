$(document).ready(function() {
    const API_URL = 'https://yfef2g1t5g.execute-api.ap-northeast-2.amazonaws.com/default/myAIstaff';

    // 폼 제출 이벤트 핸들러
    $('#create-staff-form').on('submit', function(event) {
        event.preventDefault();

        // 현재 날짜를 ISO 형식으로 가져오기
        const currentDate = new Date().toISOString();

        // 폼 데이터로부터 JSON 페이로드 생성
        const payload = {
            staff_id: { S: $('#staff_id').val() },
            creation_date: { S: currentDate },
            description: { S: $('#description').val() },
            functionJSON: {
                M: {
                    ai_provider: { S: $('#ai_provider').val() },
                    service_model: { S: $('#service_model').val() },
                    service_type: { S: 'text' }, // 하드코딩된 값
                    system_prompts: { S: $('#system_prompts').val() }
                }
            },
            imgUrl: { S: $('#imgUrl').val() },
            lang: { S: $('#lang').val() },
            name: { S: $('#name').val() },
            provider_name: { S: $('#provider_name').val() },
            role: { S: $('#role').val() },
            staff_type: { S: $('#staff_type').val() },
            status: { S: $('#status').val() },
            update_date: { S: currentDate },
            version: { S: $('#version').val() }
        };

        console.log('Sending payload:', JSON.stringify(payload, null, 2));

        // PUT 요청 보내기
        $.ajax({
            url: API_URL,
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            success: function(response) {
                console.log('Success:', response);
                alert('AI Staff created/updated successfully!');
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error('Error:', textStatus, errorThrown);
                console.error('Response Text:', jqXHR.responseText);
                alert(`An error occurred: ${errorThrown}`);
            }
        });
    });
});

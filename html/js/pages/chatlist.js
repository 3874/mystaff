$(document).ready(function() {
// list-group-item 클릭 이벤트 핸들러
  $('.list-group-item').on('click', function() {
    // 클릭된 li 요소의 data-id 속성 값 가져오기
    var staffId = $(this).data('id');
    
    // staffId를 사용하여 필요한 작업 수행 (예: 상세 페이지로 이동)
    console.log('Selected Staff ID:', staffId);
    
    // 예시: 상세 페이지로 이동 (실제 URL은 필요에 따라 변경)
    window.location.href = './chat.html?id=' + staffId+'&name=' + encodeURIComponent($(this).text());
  });


});
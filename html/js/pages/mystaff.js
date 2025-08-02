const members = [
  { id: 1, name: '김성민', role: '회계관리', avatar: './img/avatar/avatar-1.png', roleClass: 'text-success font-600-bold' },
  { id: 2, name: '박광수', role: '영업', avatar: './img/avatar/avatar-2.png', roleClass: 'text-muted font-weight-600' },
  { id: 3, name: '노영준', role: '마케팅', avatar: './img/avatar/avatar-3.png', roleClass: 'text-success font-weight-600' },
  { id: 4, name: '고민수', role: 'C/S', avatar: './img/avatar/avatar-4.png', roleClass: 'text-success font-weight-600' }
];

// members를 localStorage에 저장
localStorage.setItem('members', JSON.stringify(members));$(function() {
  // 회사명 예시 (실제 데이터에 맞게 변경)
  const companyName = '도파라';
  $('#company-name').text(companyName);
});

function renderMembers() {
  const $list = $('#member-list');
  $list.empty();
  members.forEach(member => {
    $list.append(`
      <li class="media member-item" data-id="${member.id}" style="cursor:pointer;">
        <img alt="image" class="mr-3 rounded-circle" width="50" src="${member.avatar}">
        <div class="media-body">
          <div class="mt-0 mb-1 font-weight-bold">${member.name}</div>
          <div class="text-small ${member.roleClass}"><i class="fas fa-circle"></i> ${member.role}</div>
        </div>
      </li>
    `);
  });
}

$(document).ready(function() {
  renderMembers();

  // 클릭 시 고유 id 얻기 및 chat.html로 이동
  $('#member-list').on('click', '.member-item', function() {
    const memberId = $(this).data('id');
    location.href = 'chat.html?id=' + memberId;
  });
});


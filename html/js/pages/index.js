import { init, getUserData, updateUser } from '../mystaffDB.js';
import { CheckSignIn } from '../custom.js';

$(document).ready(function() {
  const myprofileJSON = CheckSignIn();
  const mystaff = JSON.parse(myprofileJSON || '{}');
  console.log('MyStaff Data:', mystaff);

  $('#company-name').text(mystaff.companyName || 'No Name');

  fetchStaff("mystaff")
    .then(staffList => {
      // id → staff 객체 맵
      let staffMap = new Map(staffList.map(s => [s.staff_id, s]));

      // 3) 고용 멤버 렌더 (mystaff.members의 id를 staffMap에서 매핑)
      renderMembers(mystaff.members || [], staffMap);
    })
    .catch(err => {
      console.error('Error loading hired staff:', err);
      $('#hired-member-list').html('<li class="list-group-item">Error loading hired staff.</li>');
    });

  fetchStaff("myAIstaff")
    .then(staffList => {
      // 기본 제공 멤버 렌더
      renderDefaultMembers(staffList);
    })
    .catch(err => {
      console.error('Error loading default staff:', err);
      $('#default-member-list').html('<li class="list-group-item">Error loading default staff.</li>');
    });
});

/** 공통 응답 정규화 */
function normalizeResponse(response) {
  if (response && typeof response.body === 'string') {
    return JSON.parse(response.body);
  }
  return response;
}

/** 전체 스태프를 한번에 가져오기 */
function fetchStaff(staffoption) {
  let Staffurl;
  if (staffoption === "mystaff") {
    Staffurl = 'https://r2jt9u3d5g.execute-api.ap-northeast-2.amazonaws.com/default/mystaff';
  } else if (staffoption === "myAIstaff") {
    Staffurl = 'https://yfef2g1t5g.execute-api.ap-northeast-2.amazonaws.com/default/myAIstaff';
  } else {
    throw new Error('Invalid staff option');
  }

  return new Promise((resolve, reject) => {
    $.ajax({
      url: Staffurl,
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ action: 'getall' }),
      success: function(resp) {
        try {
          const parsed = normalizeResponse(resp);
          if (!Array.isArray(parsed)) {
            reject(new Error('API response for getall is not an array'));
            return;
          }
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      },
      error: function(err) {
        reject(err);
      }
    });
  });
}

/** 기본 멤버 렌더링 (staff_type === 'default') */
function renderDefaultMembers(allStaff) {
  const $list = $('#default-member-list');
  $list.empty();

  const defaultStaff = allStaff.filter(s => s.staff_type === 'default');

  if (defaultStaff.length === 0) {
    $list.append('<li class="list-group-item">No Default Staff Members Found</li>');
    return;
  }

  defaultStaff.forEach(staffData => {
    const $item = $(`
      <li class="list-group-item d-flex justify-content-between align-items-center member-item" data-id="${staffData.staff_id}">
        <img alt="image" class="mr-3 rounded-circle" width="50" src="${staffData.imgUrl || './img/avatar/avatar-1.png'}">
        <div class="media-body">
          <div class="mt-0 mb-1 font-weight-bold">${staffData.name}</div>
          <div class="text-small">${staffData.description || ''}</div>
        </div>
      </li>
    `);

    $item.on('click', function() {
      localStorage.setItem('mystaff_staffData', JSON.stringify(staffData));
      window.location.href = `chat.html?staffId=${staffData.staff_id}`;
    });

    $list.append($item);
  });
}

/** 고용 멤버 렌더링: members: string[] (staff_id 배열), staffMap: Map */
function renderMembers(members, staffMap) {
  const $list = $('#hired-member-list');
  $list.empty();

  console.log('Rendering hired members:', members);
  if (!Array.isArray(members) || members.length === 0) {
    $list.append('<li class="list-group-item">No hired Staff</li>');
    return;
  }

  members.forEach(id => {
    const staffData = staffMap.get(id);
    if (!staffData) {
      // getall에 없을 수 있는 예외 케이스 대비 (옵션): 자리표시자 표시
      console.warn('Staff id not found in getall result:', id);
      const $fallback = $(`
        <li class="list-group-item d-flex justify-content-between align-items-center member-item" data-id="${id}">
          <div class="media-body">
            <div class="mt-0 mb-1 font-weight-bold">Unknown Staff (${id})</div>
            <div class="text-small">정보를 불러올 수 없습니다.</div>
          </div>
          <div class="btn-group" role="group">
            <button type="button" class="btn btn-sm btn-danger fire-btn">Fire</button>
          </div>
        </li>
      `);
      $fallback.find('.fire-btn').on('click', function(e) {
        e.stopPropagation();
        const staffId = $(this).closest('.member-item').data('id');
        fireStaff(staffId);
      });
      $list.append($fallback);
      return;
    }

    const $item = $(`
      <li class="list-group-item d-flex justify-content-between align-items-center member-item" data-id="${staffData.staff_id}">
        <img alt="image" class="mr-3 rounded-circle" width="50" src="${staffData.imgUrl || './img/avatar/avatar-1.png'}">
        <div class="media-body">
          <div class="mt-0 mb-1 font-weight-bold">${staffData.name}</div>
          <div class="text-small">${staffData.description || ''}</div>
        </div>
        <div class="btn-group" role="group">
          <button type="button" class="btn btn-sm btn-danger fire-btn">Fire</button>
        </div>
      </li>
    `);

    $item.find('.fire-btn').on('click', function(e) {
      e.stopPropagation();
      const staffId = $(this).closest('.member-item').data('id');
      fireStaff(staffId);
    });

    $item.on('click', function() {
      localStorage.setItem('mystaff_staffData', JSON.stringify(staffData));
      window.location.href = `detail.html`;
    });

    $list.append($item);
  });
}

function fireStaff(staffId) {
  if (confirm('Are you sure you want to fire this staff member?')) {
    init()
      .then(() => getUserData())
      .then(data => {
        const mystaff = data[0];
        if (!mystaff) throw new Error("User data not found. Please sign in again.");
        mystaff.members = (mystaff.members || []).filter(id => id !== staffId);
        return updateUser(mystaff);
      })
      .then(() => getUserData())
      .then(data => {
        const updatedMystaff = data[0];
        localStorage.setItem("mystaffInfo", JSON.stringify(updatedMystaff));
        $(`.member-item[data-id="${staffId}"]`).remove();
        alert('Staff member fired successfully.');
      })
      .catch(error => {
        console.error('Error firing staff member:', error.message);
        alert(error.message || 'Failed to fire staff member.');
      });
  }
}
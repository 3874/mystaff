import { signOut } from '../utils.js';
import { getAllData } from '../database.js';

$(document).ready(function() {
  // Check for login status
  const isLoggedIn = localStorage.getItem('mystaff_loggedin');

  if (isLoggedIn !== 'true') {
    alert('You must be logged in to view this page.');
    window.location.href = './signin.html';
  } else {
    initializeFindStaffPage();
  }
  $('#signOutBtn').on('click', function(e) {
    e.preventDefault();
    signOut();
  });
});


async function initializeFindStaffPage() {
  try {
    const userId = localStorage.getItem('mystaff_user');
    if (!userId) {
      console.error('User ID not found in localStorage.');
      window.location.href = './signin.html';
      return;
    }

    const $diyStaffList = $('#diy-staff-row');
    $diyStaffList.empty();

    // Fetch and display DIY staff
    const diyStaffs = await getAllData('diystaff');
    console.log('DIY Staffs:', diyStaffs);

    if (diyStaffs.length === 0) {
      $diyStaffList.append('<div class="col-12"><p>No DIY staff found.</p></div>');
    } else {
      diyStaffs.forEach((staff, index) => {
        const avatarNumber = (index % 5) + 1; // Use a generic avatar for DIY staff
        const avatarUrl = `../img/avatar/avatar-${avatarNumber}.png`;
        const listItem = `
              <div class="col-12 col-md-6 mb-4">
                <div class="card h-100">
                  <div class="card-body d-flex align-items-center">
                    <img src="${avatarUrl}" alt="${staff.staff_name || 'DIY Staff'}'s avatar" class="rounded-circle me-3" style="width: 60px; height: 60px;">
                    <div class="flex-grow-1">
                      <h5 class="card-title">${staff.staff_name || 'Unnamed DIY Staff'}</h5>
                      <p class="card-text text-muted">${staff.role || 'No role specified'}</p>
                      <p class="card-text">${staff.summary || 'No summary.'}</p>
                    </div>
                    <div class="d-flex flex-column align-items-end">
                      <p class="card-text mb-1"><small class="text-muted">${staff.status || 'N/A'}</small></p>
                      <a href="./diy-profile.html?staffId=${staff.staffId}" class="btn btn-sm btn-primary">Detail</a>
                    </div>
                  </div>
                </div>
              </div>
        `;
        $diyStaffList.append(listItem);
      });
    }

  } catch (error) {
    console.error('Failed to initialize find staff page:', error);
    alert('An error occurred while loading the page.');
  }
}



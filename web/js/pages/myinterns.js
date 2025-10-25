import { getAllData, getDataByKey, deleteData} from "../database.js";
import { FindUrl } from "../utils.js";
import { addAgent } from "../allAgentsCon.js";
import { initModeratorChat } from "../moderator-chat.js";
import { initAuthGuard } from "../auth-guard.js";

$(async function () {
  // 인증 체크
  if (!(await initAuthGuard())) {
    return;
  }

  // Initialize moderator chat functionality
  initModeratorChat();

  async function loadDIYStaffs() {
    const staffList = await getAllData("diystaff");
    const $staffRow = $("#diy-staff-row");
    $staffRow.empty();

    if (staffList && staffList.length > 0) {
      staffList.forEach((staff) => {
        const card = `
          <div class="col-12 col-sm-6 col-md-3">
            <div class="card h-100 position-relative">
              <div class="card-body">
                <button type="button" class="btn-close position-absolute top-0 end-0 p-3 delete-btn" data-staff-id="${staff.staffId}" aria-label="Delete staff"></button>
                <h5 class="card-title">${staff.staff_name}</h5>
                <p class="card-text text-muted">${staff.role}</p>
                <p class="card-text">${staff.summary}</p>
              </div>
              <div class="card-footer d-flex justify-content-end gap-2">
                <button class="btn btn-sm btn-success regist-btn" data-staff-id="${staff.staffId}">Regist</button>
                <button class="btn btn-sm btn-info detail-btn" data-staff-id="${staff.staffId}">Detail</button>
                <button class="btn btn-sm btn-primary edit-btn" data-staff-id="${staff.staffId}">Edit</button>
              </div>
            </div>
          </div>
        `;
        $staffRow.append(card);
      });
    } else {
      $staffRow.html(
        '<div class="col"><p class="text-center">No processing staffs found.</p></div>'
      );
    }
  }

  async function loadRegisteredStaff() {
    const staffList = await getAllData("myinterns");
    const $staffRow = $("#registered-staff-row");
    $staffRow.empty();

    if (staffList && staffList.length > 0) {
      staffList.forEach((staff) => {
        const card = `
          <div class="col-12 col-sm-6 col-md-3">
            <div class="card h-100 position-relative">
              <div class="card-body">
                <button type="button" class="btn-close position-absolute top-0 end-0 p-3 delete-intern-btn" data-staff-id="${staff.staffId}" aria-label="Delete intern"></button>
                <h5 class="card-title">${staff.staff_name}</h5>
                <p class="card-text text-muted">${staff.role}</p>
                <p class="card-text">${staff.summary}</p>
              </div>
              <div class="card-footer d-flex justify-content-end gap-2">
                <button class="btn btn-sm btn-info detail-intern-btn" data-staff-id="${staff.staffId}">Detail</button>
              </div>
            </div>
          </div>
        `;
        $staffRow.append(card);
      });
    } else {
      $staffRow.html(
        '<div class="col"><p class="text-center">No registered interns found.</p></div>'
      );
    }
  }


  $("#buildBtn").on("click", function () {
    // Navigate to the staff build page
    window.location.href = "./crew-build.html";
  });


  // Event listener for detail buttons
  $("#diy-staff-row").on("click", ".detail-btn", function () {
    const staffId = $(this).data("staff-id");
    window.location.href = `./staff-profile.html?staffId=${staffId}`;
  });

  // Event listener for chat buttons
  $("#diy-staff-row").on("click", ".chat-btn", async function () {
    const staffId = $(this).data("staff-id");
    const staffData = await getDataByKey("diystaff", staffId);
    if (staffData) {
      const tempStaff = { ...staffData };
      const finalUrl = await FindUrl(tempStaff);
      window.location.href = finalUrl;
    } else {
      alert("Could not find staff data.");
    }
  });

  // Event listener for edit buttons
  $("#diy-staff-row").on("click", ".edit-btn", async function () {
    const staffId = $(this).data("staff-id");
    // Navigate to crew-build page with staffId for editing
    window.location.href = `./crew-build.html?staffId=${staffId}`;
  });

  $("#diy-staff-row").on("click", ".regist-btn", async function () {
    const staffId = $(this).data("staff-id");
    const staffData = await getDataByKey("diystaff", staffId);

    if (staffData) {
      try {
        staffData.staff_id= "mystaff-" + Date.now();
        delete staffData.staffId;
        console.log(staffData); 
        await addAgent(staffData);
        alert(`Registered successfully.`);
      } catch (error) {
        console.error("Failed to register intern:", error);
        alert("Failed to register intern. See console for details.");
      }
    } else {
      alert("Could not find staff data.");
    }
  });

  // Event listener for delete buttons
  $("#diy-staff-row").on("click", ".delete-btn", async function () {
    const staffId = $(this).data("staff-id");
    if (confirm(`Are you sure you want to delete staff ${staffId}?`)) {
      try {
        await deleteData("diystaff", staffId);
        console.log("Staff deleted:", staffId);
        loadDIYStaffs(); // Refresh the list
      } catch (error) {
        console.error("Failed to delete staff data:", error);
        alert("Failed to delete data. See console for details.");
      }
    }
  });

  // Event listener for detail buttons on registered interns
  $("#registered-staff-row").on("click", ".detail-intern-btn", function () {
    const staffId = $(this).data("staff-id");
    window.location.href = `./staff-profile.html?staffId=${staffId}`;
  });

  // Event listener for chat buttons on registered interns
  $("#registered-staff-row").on("click", ".chat-intern-btn", async function () {
    const staffId = $(this).data("staff-id");
    const staffData = await getDataByKey("myinterns", staffId);
    if (staffData) {
      const tempStaff = { ...staffData };
      const finalUrl = await FindUrl(tempStaff);
      window.location.href = finalUrl;
    } else {
      alert("Could not find intern data.");
    }
  });

  // Event listener for delete buttons on registered interns
  $("#registered-staff-row").on("click", ".delete-intern-btn", async function () {
      const staffId = $(this).data("staff-id");
      if (confirm(`Are you sure you want to delete intern ${staffId}?`)) {
        try {
          await deleteData("myinterns", staffId);
          console.log("Intern deleted:", staffId);
          loadRegisteredStaff(); // Refresh the list
        } catch (error) {
          console.error("Failed to delete intern data:", error);
          alert("Failed to delete data. See console for details.");
        }
      }
    }
  );

  // Initial load
  loadDIYStaffs();
  loadRegisteredStaff();
});

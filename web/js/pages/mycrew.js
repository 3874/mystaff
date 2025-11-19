import { getDataByKey, updateData } from "../../js/database.js";
import { getAgentById } from "../allAgentsCon.js";
import { signOut, FindUrl } from "../utils.js";
import { initModeratorChat } from "../moderator-chat.js";
import { initAuthGuard } from "../auth-guard.js";

$(document).ready(async function () {
  // 인증 체크
  if (!(await initAuthGuard())) {
    return; // 인증 실패 시 리다이렉트됨
  }

  loadStaffAgents();

  // Initialize moderator chat functionality
  initModeratorChat();

  $("#hired-member-list").on("click", "a[data-id]", async function (event) {
    event.preventDefault();

    const agentId = $(this).data("id");

    let mycrew;
    if (agentId.startsWith("diystaff-")) {
      mycrew = await getDataByKey("diystaff", agentId);
    } else {
      mycrew = await getAgentById(agentId);
    }
    console.log(mycrew);

    const finalUrl = await FindUrl(mycrew);
    window.location.href = finalUrl;
  });

  $("#signOutBtn").on("click", function (e) {
    e.preventDefault();
    signOut();
  });

  // Event listener for the "Fire" button
  $("#hired-member-list").on(
    "click",
    ".fire-staff-btn",
    async function (event) {
      event.preventDefault();
      const staffIdToFire = $(this).data("staff-id");

      if (
        confirm(
          `Are you sure you want to fire this staff member (ID: ${staffIdToFire})?`
        )
      ) {
        try {
          const userId = localStorage.getItem("mystaff_user");
          if (!userId) {
            console.error("User ID not found in localStorage.");
            alert("An error occurred. Please sign in again.");
            return;
          }

          const userData = await getDataByKey("mydata", userId);
          if (userData && userData.mystaff) {
            const updatedMystaff = userData.mystaff.filter(
              (id) => id !== staffIdToFire
            );
            await updateData("mydata", userId, { mystaff: updatedMystaff });
            alert("Staff member fired successfully!");
            loadStaffAgents(); // Re-render the list
          } else {
            alert("Could not find staff data to update.");
          }
        } catch (error) {
          console.error("Error firing staff member:", error);
          alert("An error occurred while trying to fire the staff member.");
        }
      }
    }
  );

  // Event listener for the "Detail" button
  $("#hired-member-list").on("click", ".detail-btn", function (event) {
    event.preventDefault();
    const staffId = $(this).data("staff-id");
    setTimeout(() => {
      window.location.href = `./staff-profile.html?staffId=${staffId}`;
    }, 100);
  });


  $("#hired-member-list").on("click", ".chat-btn", async function (event) {
    event.preventDefault();
    const staffId = $(this).data("staff-id");
    console.log("staffId:", staffId);

    let mycrew;
    if (staffId.startsWith("diystaff-")) {
      mycrew = await getDataByKey("diystaff", staffId);
      console.log("diystaff:", mycrew);
    } else {
      mycrew = await getAgentById(staffId);
      console.log("staff:", mycrew);
    }

    const finalUrl = await FindUrl(mycrew);

    setTimeout(() => {
      window.location.href = finalUrl;
    }, 100);
  });
});

async function loadStaffAgents() {
  try {
    const userId = localStorage.getItem("mystaff_user");
    if (!userId) {
      console.error("User ID not found in localStorage.");
      alert("An error occurred. Please sign in again.");
      return;
    }

    const userData = await getDataByKey("mydata", userId);

    if (userData) {

      // Populate staff lists
      const $defaultList = $("#hired-member-list");

      $defaultList.empty();

      if (
        userData.mystaff &&
        Array.isArray(userData.mystaff) &&
        userData.mystaff.length > 0
      ) {
        // Use Promise.all to fetch all agent details concurrently
        const agentPromises = userData.mystaff.map((staffId) => {
          if (staffId.startsWith("diystaff-")) {
            return getDataByKey("diystaff", staffId);
          } else {
            return getAgentById(staffId);
          }
        });
        const agents = await Promise.all(agentPromises);

        agents.forEach((agent) => {
          if (agent) {
            const listItem = `
              <div class="col-12 col-md-3 mb-4">
                <div class="card h-100">
                  <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${agent.staff_name || "Unnamed Agent"
              }</h5>
                    <p class="card-text text-muted">${agent.role || "No role specified"
              }</p>
                    <p class="card-text flex-grow-1">${agent.summary || "No description."
              }</p>
                    <div class="d-flex flex-row gap-2 mt-auto">
                      <button type="button" class="btn btn-sm btn-warning detail-btn" data-staff-id="${agent.staff_id ? agent.staff_id : agent.staffId
              }">Detail</button>
                      <button type="button" class="btn btn-sm btn-primary chat-btn" data-staff-id="${agent.staff_id ? agent.staff_id : agent.staffId
              }">Chat</button>
                      <button type="button" class="btn btn-sm btn-danger fire-staff-btn" data-staff-id="${agent.staff_id ? agent.staff_id : agent.staffId
              }">Fire</button>
                    </div>
                  </div>
                </div>
              </div>
            `;
            $defaultList.append(listItem);
          }
        });
      } else {
        $defaultList.html(
          '<div class="col-12"><p class="text-center">You have no staff agents.</p></div>'
        );
      }
    } else {
      console.error("Could not find user data for ID:", userId);
      alert("Could not load your profile. Please sign in again.");
    }
  } catch (error) {
    console.error("Failed to load staff agents:", error);
    alert("An error occurred while loading your staff agents.");
  }
}

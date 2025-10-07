import { getDataByKey, updateData } from "../../js/database.js"; // Import getAllData
import { getAgentById } from "../allAgentsCon.js"; // Import the function
import { signOut, FindUrl } from "../utils.js";
import { moderatorAdapter } from "../adapters/moderator.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

$(document).ready(function () {
  // Check for login status
  const isLoggedIn = localStorage.getItem("mystaff_loggedin");

  if (isLoggedIn !== "true") {
    // If not logged in, redirect to the sign-in page
    alert("You must be logged in to view this page.");
    window.location.href = "./signin.html";
  } else {
    loadStaffAgents();
  }

  const qaBotButton = `
    <button id="qa-bot-fab" class="btn btn-primary rounded-circle shadow" style="position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; font-size: 24px; z-index: 1000; display: flex; align-items: center; justify-content: center;">
      <i class="fas fa-question"></i>
    </button>
  `;

  $("body").append(qaBotButton);

  $("#send-btn").on("click", async function (event) {
    event.preventDefault();
    const userInput = $("#user-input").val().trim();
    if (!userInput) return;

    renderMessages([{ user: userInput, date: new Date() }]);
    $("#user-input").val("");

    const response = await moderatorAdapter({
      prompt: userInput,
      history: [],
      sessionId: "test-session",
    });

    if (response) {
      renderMessages([{ system: response, date: new Date() }]);
    }
  });

  // Click event for the QA bot button
  $("#qa-bot-fab").on("click", function (event) {
    event.preventDefault();
    $("#chatModal").modal("show");
  });

  $("#hired-member-list").on("click", "a[data-id]", async function (event) {
    event.preventDefault();

    const agentId = $(this).data("id");

    let mystaff;
    if (agentId.startsWith("diystaff-")) {
      mystaff = await getDataByKey("diystaff", agentId);
    } else {
      mystaff = await getAgentById(agentId);
    }
    console.log(mystaff);

    const finalUrl = await FindUrl(mystaff);
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

  // Event listener for the "Chat" button
  $("#hired-member-list").on("click", ".chat-btn", async function (event) {
    event.preventDefault();
    const staffId = $(this).data("staff-id");
    console.log("staffId:", staffId);

    let mystaff;
    if (staffId.startsWith("diystaff-")) {
      mystaff = await getDataByKey("diystaff", staffId);
      console.log("diystaff:", mystaff);
    } else {
      mystaff = await getAgentById(staffId);
      console.log("staff:", mystaff);
    }

    const finalUrl = await FindUrl(mystaff);
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
      // Populate company name
      if (userData.company) {
        $("#company-name").text(userData.company);
      }

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
              <div class="col-12 col-md-6 mb-4">
                <div class="card h-100">
                  <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${
                      agent.staff_name || "Unnamed Agent"
                    }</h5>
                    <p class="card-text text-muted">${
                      agent.role || "No role specified"
                    }</p>
                    <p class="card-text flex-grow-1">${
                      agent.summary || "No description."
                    }</p>
                    <div class="d-flex flex-row gap-2 mt-auto">
                      <button type="button" class="btn btn-sm btn-warning detail-btn" data-staff-id="${
                        agent.staff_id ? agent.staff_id : agent.staffId
                      }">Detail</button>
                      <button type="button" class="btn btn-sm btn-primary chat-btn" data-staff-id="${
                        agent.staff_id ? agent.staff_id : agent.staffId
                      }">Chat</button>
                      <button type="button" class="btn btn-sm btn-danger fire-staff-btn" data-staff-id="${
                        agent.staff_id ? agent.staff_id : agent.staffId
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

function renderMessages(msgs) {
  const $container = $("#chatMessages");
  if (!$container.length) return;

  let messagesHtml = "";
  const copyIcon = '<i class="fas fa-copy"></i>';

  for (const m of msgs) {
    if (m.user) {
      const userTextForCopy = encodeURIComponent(m.user);
      messagesHtml += `
        <div class="msg-container mb-3">
            <div class="msg-content msg-user position-relative">
                <button class="btn btn-sm btn-outline-light copy-btn position-absolute top-0 end-0 mt-1 me-1" data-copytext="${userTextForCopy}" title="Copy">${copyIcon}</button>
                <p><b>User:</b></p>
                <div class="message-text">${m.user}</div>
                <span class="msg-date text-muted small" hidden>${new Date(
                  m.date
                ).toLocaleString()}</span>
            </div>
        </div>`;
    }
    if (m.system) {
      const speakerName = m.speaker || "Moderator";
      let bgColor = "#6c757d";
      const systemHtml = marked.parse(m.system);
      const systemTextForCopy = encodeURIComponent(m.system);
      messagesHtml += `
        <div class="msg-container mb-3">
            <div class="msg-content msg-system position-relative" style="background-color: ${bgColor};">
                <button class="btn btn-sm btn-outline-light copy-btn position-absolute top-0 end-0 mt-1 me-1" data-copytext="${systemTextForCopy}" title="Copy">${copyIcon}</button>
                <p><b>${speakerName}:</b></p>
                <div class="message-text">${systemHtml}</div>
                <span class="msg-date text-muted small" style="color: #ccc;" hidden>${new Date(
                  m.date
                ).toLocaleString()}</span>
            </div>
        </div>`;
    }
  }
  $container.append(messagesHtml);
  $container.prop("scrollTop", $container.prop("scrollHeight"));
}

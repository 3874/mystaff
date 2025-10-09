import { handleMsg } from "../agents.js";
import { addData, updateData, getAllData, getDataByKey, deleteData} from "../database.js";
import { FindUrl } from "../utils.js";
import { addAgent } from "../allAgentsCon.js"; 

$(function () {
  // Short for $(document).ready()
  const registModal = new bootstrap.Modal($("#registModal")[0]);

  const defaultJsonData = {
    staffId: "",
    adapter: {
      fileupload: false,
      host: "http://ai.yleminvest.com:5678/webhook/mystaff-llm",
      headers: {
        Authorization: "mystaff",
        "Content-Type": "application/json",
      },
      language: "ko",
      method: "POST",
      name: "http",
      token_limit: 1000000,
      uploadUrl: "",
    },
    role: "test",
    staff_name: "test",
    summary: "test",
  };

  function toggleUploadUrl() {
    const isChecked = $("#fileupload").is(":checked");
    $("#adapter_uploadUrl").prop("disabled", !isChecked);
    $("#input_file").prop("disabled", !isChecked);
  }

  function populateForm(data) {
    // Handle staffId visibility and state
    if (data && data.staffId) {
      // Modify Mode
      $("#staffId").val(data.staffId).prop("disabled", true);
      $("#staffId").closest(".mb-3").show();
    } else {
      // Regist Mode
      $("#staffId").val("").prop("disabled", false);
      $("#staffId").closest(".mb-3").hide();
    }

    $("#staff_name").val(data.staff_name || "");
    $("#role").val(data.role || "");
    $("#summary").val(data.summary || "");

    const adapter = data.adapter || {};
    const adapterName = adapter.name || "http";
    $("#adapter_name").val(adapterName);

    // Show/hide fields based on adapter type
    if (adapterName === "openai" || adapterName === "gemini") {
      $(".http-fields").hide();
      $(".llm-fields").show();
    } else {
      $(".http-fields").show();
      $(".llm-fields").hide();
    }

    // Populate common and adapter-specific fields
    $("#adapter_apiUrl").val(adapter.host || "");
    $("#adapter_token_limit").val(adapter.token_limit || 0);

    const headers = adapter.headers || {};
    $("#adapter_headers_Authorization").val(headers.Authorization || "");
    $("#adapter_headers_Content-Type").val(headers["Content-Type"] || "");

    if (adapterName === "http") {
      $("#fileupload").prop("checked", adapter.fileupload || false);
      $("#adapter_uploadUrl").val(adapter.uploadUrl || "");
      $("#adapter_method").val(adapter.method || "");
      $("#adapter_language").val(adapter.language || "");
      toggleUploadUrl(); // Ensure upload URL field state is correct
    } else if (adapterName === "openai" || adapterName === "gemini") {
      $("#adapter_model").val(adapter.model || "");
      $("#adapter_system_prompt").val(adapter.system_prompt || "");
    }
  }

  function getJsonFromForm() {
    const staffIdField = $("#staffId");
    const staffId = staffIdField.is(":disabled") ? staffIdField.val() : ""; // Only include staffId if in modify mode

    return {
      staffId: staffId,
      staff_name: $("#staff_name").val(),
      role: $("#role").val(),
      summary: $("#summary").val(),
      adapter: {
        fileupload: $("#fileupload").is(":checked"),
        name: $("#adapter_name").val(),
        host: $("#adapter_apiUrl").val(),
        uploadUrl: $("#adapter_uploadUrl").val(),
        method: $("#adapter_method").val(),
        language: $("#adapter_language").val(),
        token_limit: parseInt($("#adapter_token_limit").val(), 10),
        headers: {
          Authorization: $("#adapter_headers_Authorization").val(),
          "Content-Type": $("#adapter_headers_Content-Type").val(),
        },
      },
    };
  }

  const adapterConfigs = {
    openai: {
      host: "https://api.openai.com/v1/chat/completions",
      authorization: "Bearer ",
      contentType: "application/json",
    },
    gemini: {
      host:
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
      authorization: "Bearer ",
      contentType: "application/json",
    },
  };

  $("#adapter_name").on("change", function () {
    const selectedAdapter = $(this).val();
    const config = adapterConfigs[selectedAdapter];

    if (selectedAdapter === "openai" || selectedAdapter === "gemini") {
      $(".http-fields").hide();
      $(".llm-fields").show();
    } else {
      $(".http-fields").show();
      $(".llm-fields").hide();
    }

    if (config) {
      $("#adapter_apiUrl").val(config.host);
      $("#adapter_headers_Authorization").val(config.authorization);
      $("#adapter_headers_Content-Type").val(config.contentType);
      if (selectedAdapter === "openai") {
        $("#adapter_model").val("gpt-4-turbo-preview");
      } else if (selectedAdapter === "gemini") {
        $("#adapter_model").val("gemini-pro");
      }
    }
  });

  async function loadDIYStaffs() {
    const staffList = await getAllData("diystaff");
    const $staffRow = $("#diy-staff-row");
    $staffRow.empty();

    if (staffList && staffList.length > 0) {
      staffList.forEach((staff) => {
        const card = `
          <div class="col">
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
          <div class="col">
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

  $("#fileupload").on("change", toggleUploadUrl);

  $("#buildBtn").on("click", function () {
    populateForm(defaultJsonData);
    toggleUploadUrl();
    registModal.show();
  });

  $("#saveJson").on("click", async function () {
    const newJsonData = getJsonFromForm();

    // Validation
    if (!newJsonData.staff_name) {
      alert("Staff Name is required.");
      return;
    }
    if (!newJsonData.adapter.name) {
      alert("Adapter Name is required.");
      return;
    }
    if (!newJsonData.adapter.host) {
      alert("Adapter API URL is required.");
      return;
    }
    if (!newJsonData.adapter.method) {
      alert("Adapter Method is required.");
      return;
    }

    try {
      if (newJsonData.staffId) {
        // Update existing staff
        await updateData("diystaff", newJsonData.staffId, newJsonData);
        console.log("Staff updated:", newJsonData.staffId);
      } else {
        // Add new staff
        newJsonData.staffId = "diystaff-" + Date.now(); // Generate a simple unique ID
        await addData("diystaff", newJsonData);
        console.log("New staff added:", newJsonData.staffId);
      }
      registModal.hide();
      loadDIYStaffs(); // Refresh the list
    } catch (error) {
      console.error("Failed to save staff data:", error);
      alert("Failed to save data. See console for details.");
    }
  });

  $("#testJson").on("click", async function () {
    if (!$("#input_prompt").val()) {
      alert("Please enter a test prompt.");
      return;
    }
    const responder = getJsonFromForm();
    const processedInput = {
      prompt: $("#input_prompt").val(),
      history: $("#input_history").val() || "",
      ltm: $("#input_ltm").val() || "",
      file: $("#input_file").val() || "",
    };
    const sessionId = $("#input_sessionId").val();

    try {
      $("#output").val("Testing...");
      const response = await handleMsg(processedInput, responder, sessionId);
      $("#output").val(JSON.stringify(response, null, 2));
    } catch (error) {
      console.error("Test failed:", error);
      $("#output").val(`Error: ${error.message}`);
      alert("Test failed. See console for details.");
    }
  });

  $("#input_file").on("change", function (e) {
    const uploadUrl = $("#adapter_uploadUrl").val();
    if (!uploadUrl) {
      alert("Please enter an Upload URL first.");
      $(this).val(''); // Clear the file input
      return;
    }

    const file = e.target.files[0];
    if (!file) {
      return; // No file selected
    }

    const formData = new FormData();
    formData.append("file", file);

    // Get headers from the form
    const headers = new Headers();
    const authorization = $("#adapter_headers_Authorization").val();
    if (authorization) {
      headers.append("Authorization", authorization);
    }
    // Do NOT set Content-Type for FormData, the browser does it.

    console.log(`Uploading ${file.name} to ${uploadUrl}...`);
    $(this).prop('disabled', true);

    fetch(uploadUrl, {
      method: "POST",
      body: formData,
      headers: headers, // Add headers to the request
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Upload successful", data);
        alert("File uploaded successfully!");
      })
      .catch((error) => {
        console.error("Error uploading file:", error);
        alert(`File upload failed: ${error.message}`);
      })
      .finally(() => {
        $(this).prop('disabled', false);
      });
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
    const staffData = await getDataByKey("diystaff", staffId);
    if (staffData) {
      populateForm(staffData);
      toggleUploadUrl();
      registModal.show();
    } else {
      alert("Could not find staff data.");
    }
  });

  $("#diy-staff-row").on("click", ".regist-btn", async function () {
    const staffId = $(this).data("staff-id");
    const staffData = await getDataByKey("diystaff", staffId);

    if (staffData) {
      try {
        staffData.staff_id= "mystaff-" + Date.now();
        delete staffData.staffId;
        if (!staffData.input_format) staffData.input_format = "";
        if (!staffData.output_format) staffData.output_format = "";
        staffData.output_format = "";
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
  $("#registered-staff-row").on(
    "click",
    ".delete-intern-btn",
    async function () {
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

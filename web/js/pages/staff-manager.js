import { getAllAgents, updateAgentById, deleteAgentById, addAgent } from "../allAgentsCon.js";
import { handleMsg } from "../agents.js";

// Move these variables to the top-level scope
let currentStaffId = null;
let currentUpdateData = null;

$(document).ready(function () {
  getAllAgents()
    .then((items) => {
      const table = $("#staffTable").DataTable({
        data: items,
        columns: [
          { data: "staff_name", title: "Name" },
          { data: "role", title: "Role" },
          { data: "status", title: "Status", "defaultContent": "pending" },
          {
            data: "adapter",
            title: "Adapter",
            render: function (data) {
              let str =
                typeof data === "object" ? JSON.stringify(data) : data ?? "";
              if (str.length > 50) {
                return str.slice(0, 50) + "...";
              }
              return str;
            },
          },
          {
            data: "input_format",
            title: "Input Format",
            visible: false,
            render: function (data) {
              let str =
                typeof data === "object" ? JSON.stringify(data) : data ?? "";
              if (str.length > 25) {
                return str.slice(0, 25) + "...";
              }
              return str;
            },
          },
          {
            data: "output_format",
            title: "Output Format",
            visible: false,
            render: function (data) {
              let str =
                typeof data === "object" ? JSON.stringify(data) : data ?? "";
              if (str.length > 25) {
                return str.slice(0, 25) + "...";
              }
              return str;
            },
          },
          {
            data: "summary",
            title: "Summary",
            render: function (data) {
              let str = data ?? "";
              if (str.length > 50) {
                return str.slice(0, 50) + "...";
              }
              return str;
            },
          },
        ],
        responsive: true,
        order: [[0, "asc"]],
      });

      $("#staffTable tbody").on("click", "td", function () {
        const row = table.row($(this).closest("tr"));
        const rowData = row.data();

        // Prevent error if clicking on a non-data row
        if (!rowData) {
          return;
        }

        // Manage selected class
        table.$("tr.selected").removeClass("selected");
        $(row.node()).addClass("selected");

        const cell = table.cell(this);
        const columns = table.settings()[0].aoColumns;

        currentStaffId = rowData.staff_id;
        currentUpdateData = {};

        let html = "";
        columns.forEach((col) => {
          const field = col.data;
          let value = rowData[field];

          if (field === "adapter" && typeof value === "object" && value !== null) {
            html += `
              <div class="card mb-3">
                <div class="card-header">Adapter</div>
                <div class="card-body" id="adapter-fields">
            `;
            Object.entries(value).forEach(([key, val]) => {
              let strVal =
                val === null || val === undefined
                  ? ""
                  : typeof val === "object"
                  ? JSON.stringify(val, null, 2)
                  : String(val);
              html += `
                <div class="mb-2">
                  <label class="form-label">${key}</label>
                  <input type="text" class="form-control adapter-input" data-key="${key}" value="${strVal.replace(/"/g, "&quot;" )}" >
                </div>
              `;
            });
            html += `
                </div>
              </div>
            `;
            // Store original adapter for later update
            currentUpdateData["adapter"] = value;
          } else if (field === "status") {
            html += `
              <div class="mb-3">
                <label class="form-label" for="statusSelect">Status</label>
                <select class="form-select" id="statusSelect">
                  <option value="approved" ${value === 'approved' ? 'selected' : ''}>Approved</option>
                  <option value="pending" ${value === 'pending' ? 'selected' : ''}>Pending</option>
                  <option value="rejected" ${value === 'rejected' ? 'selected' : ''}>Rejected</option>
                </select>
              </div>
            `;
            currentUpdateData["status"] = value;
          } else {
            if (typeof value === "object" && value !== null) {
              value = JSON.stringify(value, null, 2);
            }
            html += `
              <div class="mb-3">
                <label class="form-label">${col.title}</label>
                <input type="text" class="form-control" data-field="${field}" value="${( value ?? "").replace(/"/g, "&quot;")}" >
              </div>
            `;
            currentUpdateData[field] = value;
          }
        });

        $("#cellDetailModalBody").html(html);



        const modal = new bootstrap.Modal(
          document.getElementById("cellDetailModal")
        );
        modal.show();
      });
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      alert("데이터를 불러오는 중 오류가 발생했습니다.");
    });

  // Update 버튼 클릭 이벤트
  $(document).on("click", "#UpdateBtn", async function () {
    if (!currentStaffId) {
      alert("업데이트할 데이터를 찾을 수 없습니다.");
      return;
    }

    // 기존 rowData에서 누락된 필드 보완
    const rowData = $("#staffTable").DataTable().row(".selected").data() || {};

    const updateData = {
      staff_name: rowData.staff_name || "",
      summary: rowData.summary || "",
      role: rowData.role || "",
      adapter: rowData.adapter || {},
      input_format: rowData.input_format || "",
      output_format: rowData.output_format || "",
      status: $("#statusSelect").val(),
    };


    // 일반 필드 덮어쓰기
    $("#cellDetailModalBody input[data-field]").each(function () {
      const field = $(this).data("field");
      let value = $(this).val();
      try {
        value = JSON.parse(value);
      } catch (e) {}
      updateData[field] = value;
    });

    // adapter 필드 덮어쓰기
    if ($("#cellDetailModalBody #adapter-fields").length) {
      const adapterObj = {};
      $("#cellDetailModalBody .adapter-input").each(function () {
        const key = $(this).data("key");
        let value = $(this).val();
        try {
          value = JSON.parse(value);
        } catch (e) {}
        adapterObj[key] = value;
      });
      updateData["adapter"] = adapterObj;
    }

    console.log("최종 updateData:", updateData);

    try {
      await updateAgentById(currentStaffId, updateData);
      alert("업데이트 완료!");
      // 모달 닫기
      const modalEl = document.getElementById("cellDetailModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      // DataTable 새로고침
      const table = $("#staffTable").DataTable();
      const items = await getAllAgents();
      table.clear().rows.add(items).draw();
    } catch (err) {
      alert("업데이트 실패: " + err.message);
    }
  });

  $(document).on("click", "#deleteBtn", async function () {
    if (!currentStaffId) {
      alert("삭제할 대상을 선택하세요.");
      return;
    }

    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      await deleteAgentById(currentStaffId);
      alert("삭제 완료!");

      // 모달 닫기
      const modalEl = document.getElementById("cellDetailModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      // DataTable 새로고침
      const table = $("#staffTable").DataTable();
      const items = await getAllAgents();
      table.clear().rows.add(items).draw();
    } catch (err) {
      alert("삭제 실패: " + err.message);
    }
  });

  $(document).on("click", "#addModalBtn", function () {
    const modal = new bootstrap.Modal(document.getElementById("registModal"));
    const staffId = `mystaff-${Date.now()}`;
    $("#staffId").val(staffId);
    modal.show();
  });

  function getJsonFromForm() {
    return {
      staff_id: $("#staffId").val(),
      staff_name: $("#staff_name").val(),
      role: $("#role").val(),
      summary: $("#summary").val(),
      adapter: {
        fileupload: $("#fileupload").is(":checked"),
        name: $("#adapter_name").val(),
        apiUrl: $("#adapter_apiUrl").val(),
        uploadUrl: $("#adapter_uploadUrl").val(),
        method: $("#adapter_method").val(),
        language: $("#adapter_language").val(),
        token_limit: parseInt($("#adapter_token_limit").val(), 10),
      },
      input_format: $("#input_format").val() || "",
      output_format: $("#output_format").val() || "",
      status: "pending",
    };
  }

  const adapterConfigs = {
    http: {
      apiUrl: "http://ai.yleminvest.com:5678/webhook/mystaff-llm",
      authorization: "mystaff",
      contentType: "application/json",
    },
    openai: {
      apiUrl: "https://api.openai.com/v1/chat/completions",
      authorization: "Bearer ",
      contentType: "application/json",
    },
    gemini: {
      apiUrl:
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
      authorization: "Bearer ",
      contentType: "application/json",
    },
  };

  function toggleUploadUrl() {
    const isChecked = $("#fileupload").is(":checked");
    $("#adapter_uploadUrl").prop("disabled", !isChecked);
    $("#input_file").prop("disabled", !isChecked);
  }

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
      $("#adapter_apiUrl").val(config.apiUrl);
      $("#adapter_headers_Authorization").val(config.authorization);
      $("#adapter_headers_Content-Type").val(config.contentType);
      if (selectedAdapter === "openai") {
        $("#adapter_model").val("gpt-4o-mini");
      } else if (selectedAdapter === "gemini") {
        $("#adapter_model").val("gemini-2.5-flash");
      }
    }
  });

  $("#fileupload").on("change", toggleUploadUrl);

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
    if (!newJsonData.adapter.apiUrl) {
      alert("Adapter API URL is required.");
      return;
    }
    if (!newJsonData.adapter.method) {
      alert("Adapter Method is required.");
      return;
    }

    try {
      await addAgent(newJsonData);

      const modalEl = document.getElementById("registModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      // DataTable 새로고침
      const table = $("#staffTable").DataTable();
      const items = await getAllAgents();
      table.clear().rows.add(items).draw();
    } catch (error) {
      console.error("Failed to save staff data:", error);
      alert("Failed to save data. See console for details.");
    }
  });

  $("#input_file").on("change", function (e) {
    const uploadUrl = $("#adapter_uploadUrl").val();
    if (!uploadUrl) {
      alert("Please enter an Upload URL first.");
      $(this).val(""); // Clear the file input
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
    $(this).prop("disabled", true);

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
        $(this).prop("disabled", false);
      });
  });
});

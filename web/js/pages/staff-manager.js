import { getAllAgents, updateAgentById, deleteAgentById } from "../allAgentsCon.js";
import { initAuthGuard } from "../auth-guard.js";

// Move these variables to the top-level scope
let currentStaffId = null;
let currentUpdateData = null;

$(document).ready(async function () {
  // 인증 체크
  if (!(await initAuthGuard())) {
    return;
  }

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
        let adapterHtml = "";
        
        columns.forEach((col) => {
          const field = col.data;
          let value = rowData[field];

          if (field === "adapter" && typeof value === "object" && value !== null) {
            adapterHtml += `
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
              adapterHtml += `
                <div class="mb-2">
                  <label class="form-label">${key}</label>
                  <input type="text" class="form-control adapter-input" data-key="${key}" value="${strVal.replace(/"/g, "&quot;" )}" >
                </div>
              `;
            });
            adapterHtml += `
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
        
        // adapter를 가장 아래에 추가
        html += adapterHtml;

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
});

import { getAllData, updateData, deleteData } from "../database.js";
import { initAuthGuard } from "../auth-guard.js";

// Move these variables to the top-level scope
let currentFileId = null;
let currentUpdateData = null;

$(document).ready(async function () {
  // 인증 체크
  if (!(await initAuthGuard())) {
    return;
  }

  getAllData("myfiles")
    .then((items) => {
      const table = $("#staffTable").DataTable({
        data: items,
        pageLength: 50,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
        columns: [
          { data: "fileName", title: "File Name",
            render: function (data) {
              let str = data ?? "";
              if (str.length > 30) {
                return str.slice(0, 27) + "...";
              }
              return str;
            }
          },
          { data: "sessionId", title: "Session ID",
            render: function (data) {
              let str = data ?? "";
              if (str.length > 12) {
                return str.slice(0, 8) + "..." + str.slice(-4);
              }
              return str;
            }
          },
          { data: "staffId", title: "Staff ID", "defaultContent": "", visible: false },
          { data: "uploadSuccess", title: "Upload Status", 
            render: function (data) {
              return data ? '<span class="badge bg-success">Success</span>' : '<span class="badge bg-warning">Failed</span>';
            }
          },
          { data: "driveFileId", title: "Drive File ID", visible: false },
          {
            data: "contents",
            title: "Contents",
            render: function (data) {
              let str = data ?? "";
              if (str.length > 50) {
                return str.slice(0, 50) + "...";
              }
              return str;
            },
          },
          { data: "summary", title: "Summary", visible: false },
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

        currentFileId = rowData.id;
        currentUpdateData = {};

        let html = "";
        
        columns.forEach((col) => {
          const field = col.data;
          let value = rowData[field];

          if (field === "uploadSuccess") {
            html += `
              <div class="mb-3">
                <label class="form-label" for="uploadSuccessSelect">Upload Status</label>
                <select class="form-select" id="uploadSuccessSelect" disabled>
                  <option value="true" ${value === true ? 'selected' : ''}>Success</option>
                  <option value="false" ${value === false ? 'selected' : ''}>Failed</option>
                </select>
              </div>
            `;
            currentUpdateData["uploadSuccess"] = value;
          } else if (field === "contents") {
            html += `
              <div class="mb-3">
                <label class="form-label">${col.title}</label>
                <textarea class="form-control" data-field="${field}" rows="10">${(value ?? "")}</textarea>
              </div>
            `;
            currentUpdateData[field] = value;
          } else if (field === "summary") {
            html += `
              <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <label class="form-label mb-0">${col.title}</label>
                  <button type="button" class="btn btn-sm btn-primary" id="autoSummaryBtn">
                    <i class="fas fa-magic"></i> Auto Summary
                  </button>
                </div>
                <textarea class="form-control" id="summaryTextarea" data-field="${field}" rows="8">${(value ?? "")}</textarea>
              </div>
            `;
            currentUpdateData[field] = value;
          } else if (field === "driveFileId") {
            // Drive File ID는 다운로드 링크로 표시
            const driveFileId = value || "";
            const downloadUrl = driveFileId ? `https://drive.google.com/uc?export=download&id=${driveFileId}` : "";
            html += `
              <div class="mb-3">
                <label class="form-label">${col.title}</label>
                <div class="input-group">
                  <input type="text" class="form-control" data-field="${field}" value="${driveFileId.replace(/"/g, "&quot;")}" readonly>
                  ${driveFileId ? `<a href="${downloadUrl}" target="_blank" class="btn btn-outline-primary" title="Download from Google Drive">
                    <i class="fas fa-download"></i>
                  </a>` : ''}
                </div>
              </div>
            `;
            currentUpdateData[field] = value;
          } else {
            if (typeof value === "object" && value !== null) {
              value = JSON.stringify(value, null, 2);
            }
            html += `
              <div class="mb-3">
                <label class="form-label">${col.title}</label>
                <input type="text" class="form-control" data-field="${field}" value="${( value ?? "").replace(/"/g, "&quot;")}" readonly>
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

  $(document).on("click", "#UpdateBtn", async function () {
    if (!currentFileId) {
      alert("업데이트할 데이터를 찾을 수 없습니다.");
      return;
    }

    const rowData = $("#staffTable").DataTable().row(".selected").data() || {};

    const updateDataObj = {
      id: currentFileId,
      fileName: rowData.fileName || "",
      sessionId: rowData.sessionId || "",
      staffId: rowData.staffId || null,
      uploadSuccess: $("#uploadSuccessSelect").val() === 'true',
    };

    $("#cellDetailModalBody input[data-field]").each(function () {
      const field = $(this).data("field");
      let value = $(this).val();
      try {
        value = JSON.parse(value);
      } catch (e) {}
      updateDataObj[field] = value;
    });

    $("#cellDetailModalBody textarea[data-field]").each(function () {
      const field = $(this).data("field");
      let value = $(this).val();
      updateDataObj[field] = value;
    });

    console.log("현재 file id:", currentFileId);
    console.log("최종 updateData:", updateDataObj);

    try {
      await updateData("myfiles", currentFileId, updateDataObj);
      console.log("업데이트 결과: 성공");
      alert("업데이트 완료!");
      // 모달 닫기
      const modalEl = document.getElementById("cellDetailModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      // DataTable 새로고침
      const table = $("#staffTable").DataTable();
      const items = await getAllData("myfiles");
      table.clear().rows.add(items).draw();
    } catch (err) {
      console.error("업데이트 에러:", err);
      alert("업데이트 실패: " + err.message);
    }
  });

  $(document).on("click", "#deleteBtn", async function () {
    if (!currentFileId) {
      alert("삭제할 대상을 선택하세요.");
      return;
    }

    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      await deleteData("myfiles", currentFileId);
      alert("삭제 완료!");

      // 모달 닫기
      const modalEl = document.getElementById("cellDetailModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      // DataTable 새로고침
      const table = $("#staffTable").DataTable();
      const items = await getAllData("myfiles");
      table.clear().rows.add(items).draw();
    } catch (err) {
      alert("삭제 실패: " + err.message);
    }
  });

  // Auto Summary 버튼 클릭 이벤트
  $(document).on("click", "#autoSummaryBtn", async function () {
    const $btn = $(this);
    const originalHtml = $btn.html();
    
    // 버튼 비활성화 및 로딩 표시
    $btn.prop("disabled", true).html('<i class="fas fa-spinner fa-spin"></i> Generating...');
    
    try {
      // contents 필드에서 텍스트 가져오기
      const contents = $("textarea[data-field='contents']").val();
      
      if (!contents || contents.trim() === "") {
        alert("요약할 내용이 없습니다.");
        return;
      }
      
      const summary = await generateSimpleSummary(contents);
      $("#summaryTextarea").val(summary);
      
    } catch (error) {
      console.error("Auto summary error:", error);
      alert("요약 생성 중 오류가 발생했습니다: " + error.message);
    } finally {
      // 버튼 원래 상태로 복구
      $btn.prop("disabled", false).html(originalHtml);
    }
  });

  // Sign-Out 버튼
  $("#signOutBtn").on("click", function () {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "./signin.html";
  });
});

// AI 기반 요약 생성 함수
async function generateSimpleSummary(text) {
  try {
    const response = await fetch('https://qvo09bdcwd.execute-api.ap-northeast-2.amazonaws.com/prod/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: text
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.text(); 
    
    // API 응답에서 요약 텍스트 추출
    console.log('Summary API response:', result);
    return result;
    
  } catch (error) {
    console.error('Summary API error:', error);
    throw error;
  }
}

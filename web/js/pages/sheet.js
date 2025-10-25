import { getAgentById } from "../allAgentsCon.js";
import { normalizeApiResponse, apiPost } from "../utils.js";
import { initModeratorChat } from "../moderator-chat.js";
import { initAuthGuard } from "../auth-guard.js";
/* dynamic ESM import helper for ag-grid */

let host = "";
let currentSearchTerm = "";

$(document).ready(async function () {
  // 인증 체크
  if (!(await initAuthGuard())) {
    return;
  }

  // Initialize moderator chat functionality
  initModeratorChat();
  const urlParams = new URLSearchParams(window.location.search);
  const staffId = urlParams.get("staffId");
  let mystaff;

  if (!staffId) {
    alert("Invalid staff ID");
    location.href = "./mystaff.html";
    return;
  }

  getAgentById(staffId)
    .then((items) => {
      mystaff = items;
      if (!mystaff) {
        alert("Invalid staff ID");
        location.href = "./mystaff.html";
        return;
      }
      $("#title").text(mystaff.name);
      $("#summary").text(mystaff.summary || "");
      host = mystaff?.adapter?.host || "";
      console.log("sheet:init - staffId, host", staffId, host);
      if (!host) {
        alert("API URL not found for this staff member.");
        return;
      }

      initTableForStaff(staffId);
    })
    .catch((error) => {
      console.error("Error getting agent by ID:", error);
      alert("Failed to get staff details.");
      location.href = "./mystaff.html";
    });
});


/* ---------- Grid initialization (ag-grid) ---------- */

async function initTableForStaff(staffId) {
  try {
    const firstPageItems = await getFirstPageDataForColumns();

    let columns = [];
    if (firstPageItems && firstPageItems.length > 0) {
      columns = Object.keys(firstPageItems[0]).map((key) => ({
        headerName: key.toUpperCase(),
        field: key,
        filter: 'agTextColumnFilter', // 컬럼별 텍스트 필터 활성화
        resizable: true,
        sortable: true,
      }));
    } else {
      columns = [
        {
          headerName: "No Data",
          field: "no_data",
          valueGetter: () => "N/A",
          cellClass: "dt-small",
        },
      ];
    }

    // Ensure ag-grid styles/class injection for small text
    if (!$("#dt-small-style").length) {
      $("<style>")
        .attr("id", "dt-small-style")
        .text(".dt-small { font-size: 12px !important; line-height: 1.2 !important; }")
        .appendTo($(document.head));
    }

    // Prepare grid container: reuse #staffTable element (use jQuery but keep raw DOM for ag-grid)
    const $container = $("#staffTable");
    if (!$container.length) {
      throw new Error("#staffTable element not found");
    }
    const container = $container[0]; // raw DOM for ag-grid
    // Clear previous content and ensure it's a div for ag-grid
    $container.empty();
    $container.addClass("ag-theme-alpine");
    if (!$container.css("width")) $container.css("width", "100%");
    // 하단 여백(padding)을 추가해 마지막 로우가 바닥에 붙지 않게 함
    $container.css("box-sizing", "border-box");
    if (!$container.css("padding-bottom")) $container.css("padding-bottom", "24px");

    // 화면 하단까지 그리드가 채워지도록 높이 자동 조정
    function setGridHeightToViewport() {
      try {
        // container의 상단 위치를 기준으로 남은 뷰포트 높이를 계산
        const top = container.getBoundingClientRect().top;
        const bottomMargin = 16; // 하단 여유(필요시 조정)
        const minHeight = 200; // 최소 높이
        const height = Math.max(minHeight, window.innerHeight - top - bottomMargin);
        $container.css("height", height + "px");
      } catch (e) {
        // 실패 시 기본 높이 유지
        if (!$container.css("height")) $container.css("height", "600px");
      }
    }

    // 초기 설정 및 반응형 처리
    setGridHeightToViewport();
    $(window).on("resize orientationchange", setGridHeightToViewport);
    // 레이아웃 변동을 대비한 지연 재계산
    setTimeout(setGridHeightToViewport, 120);

    // gridOptions for infinite row model
    const gridOptions = {
      columnDefs: columns,
      defaultColDef: {
        sortable: true,
        resizable: true,
        filter: false,
        suppressMenu: true,
      },
      rowModelType: "infinite",
      cacheBlockSize: 50,
      maxBlocksInCache: 5,
      animateRows: false,
      suppressCellFocus: true,
      onRowClicked: function (event) {
        const data = event.data;
        if (!data) return;
        const $form = $("#rowDetailForm");
        renderRowFormForAgGrid($form, data, columns);
        $("#rowModalLabel").text("Row Details");
        const $modalEl = $("#rowModal");
        if ($modalEl.length) {
          const bsModal = new bootstrap.Modal($modalEl[0]);
          bsModal.show();
        }
      },
      // make sure each row uses class for small text
      getRowStyle: function () {
        return { "font-size": "12px", "line-height": "1.2" };
      },
    };

    // datasource: maps ag-grid requests to apiPost
    const datasource = {
      getRows: async (params) => {
        try {
          // ag-grid provides startRow and endRow
          const start = params.startRow || 0;
          const length = (params.endRow || 0) - start || gridOptions.cacheBlockSize || 50;
          console.log("ag-grid:getRows", { start, length, sortModel: params.sortModel });

          // translate sort model (take first) and send column info
          let orderColumn = null;
          let orderDir = null;
          if (params.sortModel && params.sortModel.length > 0) {
            const s = params.sortModel[0];
            orderColumn = { columnId: s.colId, sort: s.sort };
            orderDir = s.sort;
          }

          // requests can process pagination/search state even though client uses ag-Grid
          const apiRequestBody = {
            action: "query",
            start,
            length,
            search: currentSearchTerm || "",
            orderColumn,
            orderDir,
          };

          const raw = await apiPost(host, apiRequestBody);
          console.log("ag-grid:raw response", raw);

          // normalize only to extract rows array
          const finalResponse = normalizeApiResponse(raw, { start, length });
          const rows = Array.isArray(finalResponse.data) ? finalResponse.data : [];

          // IMPORTANT:
          // Use server-provided totals only if the raw response explicitly provides them.
          // If server does NOT report recordsTotal/recordsFiltered, pass -1 so ag-grid
          // treats total as unknown and will continue requesting further blocks on scroll.
          let total = -1;
          if (raw && typeof raw.recordsFiltered === "number") {
            total = raw.recordsFiltered;
          } else if (raw && typeof raw.recordsTotal === "number") {
            total = raw.recordsTotal;
          } else if (finalResponse && typeof finalResponse.recordsFiltered === "number" && (raw && (raw.recordsFiltered || raw.recordsTotal))) {
            // defensive: prefer real raw fields, but fallback if raw wrapped those fields oddly
            total = finalResponse.recordsFiltered;
          } else {
            total = -1;
          }

          params.successCallback(rows, total);
        } catch (err) {
          console.error("ag-grid datasource error:", err);
          params.failCallback();
        }
      },
    };

    // onGridReady: ensure datasource is set only when api exists
    gridOptions.onGridReady = function (params) {
      console.log("ag-grid onGridReady", { apiReady: !!params.api, columnApiReady: !!params.columnApi });
      gridOptions.api = params.api;
      gridOptions.columnApi = params.columnApi;
      try {
        if (datasource && params.api && typeof params.api.setDatasource === "function") {
          params.api.setDatasource(datasource);
          console.log("ag-grid datasource attached onGridReady");
        }
      } catch (e) {
        console.error("Failed to attach datasource in onGridReady", e);
      }
    };

    // create the grid using UMD build exposed on window.agGrid.Grid (sheet.html must include UMD script)
      // create the grid using constructor resolved by helper (tries globals then dynamic ESM)
      const GridConstructor = await resolveAgGridConstructor();
      if (!GridConstructor || typeof GridConstructor !== "function") {
        console.error("ag-grid Grid constructor not available. Include ag-grid script or allow dynamic import.");
        throw new Error("ag-grid Grid constructor not available.");
      }
      new GridConstructor(container, gridOptions);
    // datasource is attached in onGridReady

    // quick search handler: update currentSearchTerm and trigger client quickFilter + server re-fetch
    (function attachQuickFilter() {
      const $input = $("#quickFilter");
      if (!$input.length) return;
      const applySearch = () => {
        currentSearchTerm = $input.val() || "";
        // client-side quick filter (applies to loaded rows)
        try {
          if (gridOptions.api && typeof gridOptions.api.setQuickFilter === "function") {
            gridOptions.api.setQuickFilter(currentSearchTerm);
          }
        } catch (e) {
          console.warn("setQuickFilter failed:", e);
        }
        // server-side re-query for infinite model: purge cache so datasource.getRows runs again from start
        try {
          if (gridOptions.api && typeof gridOptions.api.purgeInfiniteCache === "function") {
            gridOptions.api.purgeInfiniteCache();
          } else if (gridOptions.api && typeof gridOptions.api.setDatasource === "function") {
            // fallback: re-attach datasource to force reload
            gridOptions.api.setDatasource(gridOptions.api.getDatasource ? gridOptions.api.getDatasource() : datasource);
          }
        } catch (e) {
          console.warn("failed to refresh grid after search:", e);
        }
      };

      // ensure CSS for inside-button layout exists
      if (!$("#quick-filter-styles").length) {
        $("<style>")
          .attr("id", "quick-filter-styles")
          .text(`
          .quick-filter-wrap{ position:relative; display:inline-block; }
          .quick-filter-wrap #quickFilter{ padding-right:32px; }
          #quickFilterClearBtn{ position:absolute; right:6px; top:50%; transform:translateY(-50%); border:none; background:transparent; padding:0 6px; line-height:1; font-size:16px; color:#fff; cursor:pointer; }
          #quickFilterClearBtn:focus{ outline:none; box-shadow:none; }
        `)
          .appendTo($(document.head));
      }

      // wrap the input so we can absolutely position the clear button inside
      let $wrap = $input.parent();
      if (!$wrap.length || !$wrap.hasClass('quick-filter-wrap')) {
        $wrap = $("<span>").addClass('quick-filter-wrap');
        try { $wrap.css('display', getComputedStyle($input[0]).display === 'block' ? 'block' : 'inline-block'); } catch (e) {}
        $input.before($wrap);
        $wrap.append($input);
      }

      // create or reuse clear button inside the wrapper
      let $clearBtn = $("#quickFilterClearBtn");
      if (!$clearBtn.length || $clearBtn.parent()[0] !== $wrap[0]) {
        if ($clearBtn.length && $clearBtn.parent().length) $clearBtn.remove();
        $clearBtn = $("<button>")
          .attr({ type: 'button', id: 'quickFilterClearBtn', title: 'Clear search', 'aria-label': 'Clear search' })
          .text('×');
        $wrap.append($clearBtn);
      }

      const toggleClearBtn = () => {
        try {
          $clearBtn.css('display', ($input.val() && String($input.val()).length > 0) ? 'inline-block' : 'none');
        } catch (e) {
          // ignore
        }
      };

      $clearBtn.off('click').on('click', (ev) => {
        ev.preventDefault();
        $input.val('');
        toggleClearBtn();
        applySearch();
        try { $input.focus(); } catch (e) {}
      });

      // input events: instant on input, also apply on Enter (keypress)
      $input.off('input').on('input', () => {
        toggleClearBtn();
        applySearch();
      });
      $input.off('keydown').on('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          applySearch();
        }
      });

      // initial visibility
      toggleClearBtn();
    })();

    // columns persistence wiring
    setupColumnsPersistence(gridOptions, columns, staffId, container);
    
    // helper to render row form moved here so it is available to onRowClicked
    function renderRowFormForAgGrid($form, rowData, columnsDef) {
      $form.empty();
      // get editableKey from rowData.editableKey or global
      let editableKey = [];
      if (rowData && Array.isArray(rowData.editableKey)) {
        editableKey = rowData.editableKey;
      } else if (Array.isArray(window._sheetEditableKey)) {
        editableKey = window._sheetEditableKey;
      }
      // Use static Save button in modal-footer
      const $modal = $form.closest('.modal');
      const $saveBtn = $modal.find('#rowModalSaveBtn');
      $saveBtn.off('click').on('click', async function () {
        // Collect editable fields
        const payload = { action: 'update' };
        // Use _id if present
        if (rowData && rowData._id) payload.id = rowData._id;
        $form.find('input, textarea').each(function (i, el) {
          const $el = $(el);
          // Always use columnsDef[i].field as the key for update
          const key = columnsDef[i] && columnsDef[i].field ? columnsDef[i].field : $el.attr('name');
          if (editableKey.includes(key)) {
            payload[key] = $el.val();
          }
        });
        try {
          const result = await apiPost(host, payload);
          // Optionally show success/fail message
          if (result && result.success) {
            alert('Saved successfully');
            $modal.modal('hide');
          } else {
            alert('Save failed');
          }
        } catch (err) {
          alert('Save error: ' + err);
        }
      });
      columnsDef.forEach((col, idx) => {
        const key = col.field || col.headerName || `col${idx}`;
        let value = rowData && Object.prototype.hasOwnProperty.call(rowData, key) ? rowData[key] : "";
        if (value === null || typeof value === "undefined") value = "";
        let asString;
        if (typeof value === "object") {
          try {
            asString = JSON.stringify(value, null, 2);
          } catch {
            asString = String(value);
          }
        } else {
          asString = String(value);
        }

        const labelText = col.headerName || key;
        const $wrap = $('<div class="col-12"></div>');
        const $label = $(`<label class="form-label fw-bold mb-1">${labelText}</label>`);
        const useTextarea = asString.length > 120 || asString.includes("\n");
        let $control;
        // editable if key is in editableKey
        const isEditable = editableKey.includes(key);
        if (useTextarea) {
          $control = $(`<textarea class="form-control" rows="5" ${isEditable ? "" : "readonly"}></textarea>`).val(asString);
        } else {
          $control = $(`<input class="form-control form-control-sm" ${isEditable ? "" : "readonly"} />`).val(asString);
        }
        if (!isEditable) {
          $control.attr("readonly", "readonly");
          $control.addClass("readonly");
        } else {
          $control.removeAttr("readonly");
          $control.removeClass("readonly");
        }
        $wrap.append($label).append($control);
        $form.append($wrap);
      });
      $form.find("select, input[type=checkbox], input[type=radio], button").attr("disabled", "disabled");
    }
  } catch (err) {
    console.error("Error initializing ag-grid table:", err);
    const tbl = $("#staffTable");
    tbl.html(
      '<div style="padding:12px;color:#a00">Failed to initialize grid. See console for details.</div>'
    );
  }
}

/* ---------- Columns dropdown persistence (adapted for ag-grid) ---------- */

function setupColumnsPersistence(gridOptionsOrApi, columns, staffId, containerEl) {
  const wrapper = $("#columnsDropdownWrapper");
  if (!wrapper || !wrapper.length) return;
  const menu = wrapper.find(".dropdown-menu");
  const storageKey = `columns_${staffId}`;

  function readSaved() {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function findGridColumnById(colApi, colId) {
    if (!colApi) return null;
    const all = colApi.getAllGridColumns() || [];
    return all.find((c) => {
      try {
        const def = c.getColDef && c.getColDef();
        return (
          (def && def.field === colId) ||
          (def && def.headerName === colId) ||
          c.getColId && c.getColId() === colId
        );
      } catch (e) {
        return false;
      }
    });
  }

  function saveState() {
    try {
      const columnApi = gridOptionsOrApi.columnApi;
      if (!columnApi) return;
      const all = columnApi.getAllGridColumns() || [];
      const colState = columns.map((c, idx) => {
        const colId = c.field || c.headerName || `col${idx}`;
        const found = findGridColumnById(columnApi, colId);
        return !!(found && found.isVisible && found.isVisible());
      });
      localStorage.setItem(storageKey, JSON.stringify(colState));
    } catch (e) {
      console.warn("Failed to save column state", e);
    }
  }

  const saved = readSaved();

  function buildMenu() {
    menu.empty();
    const colApi = gridOptionsOrApi.columnApi;
    columns.forEach((col, idx) => {
      const title = col.headerName || col.field || `Col ${idx}`;
      const chkId = `colchk_ag_${idx}`;
      const li = $(
        '<li>' +
          '<div class="form-check px-2 py-1">' +
            `<input class="form-check-input col-toggle" type="checkbox" id="${chkId}" data-idx="${idx}">` +
            `<label class="form-check-label" for="${chkId}" style="margin-left:6px;">${title}</label>` +
          '</div>' +
        '</li>'
      );
      menu.append(li);
      // set checked state: prefer saved, else use grid's current visibility
      try {
        if (saved && typeof saved[idx] !== "undefined") {
          li.find("input.col-toggle").prop("checked", !!saved[idx]);
        } else if (colApi) {
          const colId = col.field || col.headerName || `col${idx}`;
          const found = findGridColumnById(colApi, colId);
          li.find("input.col-toggle").prop("checked", !!(found && found.isVisible && found.isVisible()));
        } else {
          li.find("input.col-toggle").prop("checked", true);
        }
      } catch {
        li.find("input.col-toggle").prop("checked", true);
      }
    });
  }

  wrapper.off("show.bs.dropdown").on("show.bs.dropdown", buildMenu);

  menu.off("change", ".col-toggle").on("change", ".col-toggle", function () {
    const idx = parseInt($(this).attr("data-idx"), 10);
    const visible = $(this).is(":checked");
    try {
      const colApi = gridOptionsOrApi.columnApi;
      if (colApi) {
        const colId = columns[idx].field || columns[idx].headerName || `col${idx}`;
        const found = findGridColumnById(colApi, colId);
        if (found) {
          colApi.setColumnVisible(found.getColId(), visible);
        } else {
          // fallback try by index
          const defs = gridOptionsOrApi.columnDefs || [];
          if (defs[idx] && defs[idx].field) {
            colApi.setColumnVisible(defs[idx].field, visible);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to toggle column visibility", err);
    }
    saveState();
  });

  buildMenu();

  // apply saved state immediately if possible
  if (saved && gridOptionsOrApi.columnApi) {
    try {
      const colApi = gridOptionsOrApi.columnApi;
      for (let i = 0; i < Math.min(saved.length, columns.length); i++) {
        const shouldShow = !!saved[i];
        const colId = columns[i].field || columns[i].headerName || `col${i}`;
        const found = findGridColumnById(colApi, colId);
        if (found) {
          colApi.setColumnVisible(found.getColId(), shouldShow);
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

/* ---------- API convenience wrappers (use apiPost + minimal parsing) ---------- */

export async function getFirstPageDataForColumns() {
  try {
    const raw = await apiPost(host, { action: "query", start: 0, length: 1, search: "", orderColumn: "", orderDir: "" });
    // expected raw: [{meta:{}, output:{}}]
    let editableKey = [];
    let outputData = [];
    if (Array.isArray(raw) && raw.length > 0) {
      const item = raw[0];
      if (item.meta && item.meta.resource === "database") {
        // collect keys except 'resource' where value is true
        editableKey = Object.keys(item.meta)
          .filter(k => k !== "resource" && item.meta[k] === true);
      }
      if (item.output && Array.isArray(item.output)) {
        outputData = item.output;
      }
    }
    // fallback for other shapes
    if (outputData.length === 0 && raw && Array.isArray(raw.data)) {
      outputData = raw.data;
    }
    if (outputData.length === 0) {
      const normalized = normalizeApiResponse(raw, { start: 0, length: 1 });
      outputData = Array.isArray(normalized.data) ? normalized.data : [];
    }
    // attach editableKey to output for later use
    outputData.editableKey = editableKey;
    // store globally for later use in form rendering
    window._sheetEditableKey = editableKey;
    return outputData;
  } catch (err) {
    console.error("getFirstPageDataForColumns failed:", err);
    return [];
  }
}

async function fetchAndExtract(actionBody) {
  const raw = await apiPost(host, actionBody);
  // try common shapes
  if (Array.isArray(raw) && raw.length > 0 && raw[0].output) return raw[0].output;
  if (raw && typeof raw.body !== "undefined") return typeof raw.body === "string" ? JSON.parse(raw.body) : raw.body;
  if (raw && Array.isArray(raw)) return raw;
  return raw;
}

export async function createData(addData) {
  try {
    return await fetchAndExtract({ action: "create", ...addData });
  } catch (err) {
    console.error("createData failed:", err);
    throw err;
  }
}

export async function updateDataById(id, updateData) {
  try {
    return await fetchAndExtract({ action: "update", id, ...updateData });
  } catch (err) {
    console.error("updateDataById failed:", err);
    throw err;
  }
}

export async function deleteDataById(id) {
  try {
    return await fetchAndExtract({ action: "delete", id });
  } catch (err) {
    console.error("deleteDataById failed:", err);
    throw err;
  }
}

/* ---------- ag-grid constructor resolver (async, robust with ESM fallback) ---------- */
async function resolveAgGridConstructor() {
  try {
    const gw = (typeof agGrid !== "undefined") ? agGrid : (typeof window !== "undefined" ? window.agGrid : null);
    console.log("resolveAgGridConstructor: agGrid global (raw):", gw);

    if (gw) {
      // direct shapes
      if (typeof gw === "function") return gw;
      if (typeof gw.Grid === "function") return gw.Grid;
      if (gw.default && typeof gw.default.Grid === "function") return gw.default.Grid;
      if (gw.default && typeof gw.default === "function") return gw.default;

      // prefer keys that include 'grid'
      for (const k of Object.keys(gw)) {
        try {
          const val = gw[k];
          if (typeof val === "function" && k.toLowerCase().includes("grid")) return val;
          if (val && typeof val.Grid === "function") return val.Grid;
          if (typeof val === "function" && (val.name && val.name.toLowerCase().includes("grid"))) return val;
        } catch (e) {}
      }
    }

    // search window globals
    for (const k of Object.keys(window)) {
      try {
        const v = window[k];
        if (!v) continue;
        if (v && typeof v.Grid === "function") return v.Grid;
        if (typeof v === "function" && (k.toLowerCase().includes("grid") || (v.name && v.name.toLowerCase().includes("grid")))) return v;
      } catch (e) {}
    }

    // Fallback: attempt dynamic ESM import from CDN and inspect exports
    try {
      console.log("resolveAgGridConstructor: attempting dynamic ESM import of ag-grid");
      const mod = await import("https://cdn.jsdelivr.net/npm/ag-grid-community/dist/ag-grid-community.min.mjs");
      console.log("resolveAgGridConstructor: dynamic import result keys:", Object.keys(mod));
      // common export shapes
      if (typeof mod.Grid === "function") return mod.Grid;
      if (mod.default && typeof mod.default.Grid === "function") return mod.default.Grid;
      if (mod.default && typeof mod.default === "function") return mod.default;
      // attach to window for later debugging/inspection
      window.agGrid = window.agGrid || mod;
    } catch (impErr) {
      console.warn("resolveAgGridConstructor: dynamic import failed", impErr);
    }
  } catch (e) {
    console.error("resolveAgGridConstructor: unexpected error", e);
  }
  return null;
}

import { getAgentById } from "../allAgentsCon.js";
/* dynamic ESM import helper for ag-grid */
async function dynamicImportAgGridModule() {
  const candidates = [
    "https://unpkg.com/ag-grid-community@latest/dist/ag-grid-community.min.mjs",
    "https://cdn.jsdelivr.net/npm/ag-grid-community@latest/dist/ag-grid-community.min.mjs",
  ];
  for (const url of candidates) {
    try {
      console.log("Attempting dynamic import ag-grid from", url);
      const mod = await import(url);
      console.log("Dynamic import succeeded:", url, Object.keys(mod));
      return mod;
    } catch (e) {
      console.warn("Dynamic import failed for", url, e);
    }
  }
  throw new Error("Unable to dynamically import ag-grid ESM module from known CDNs.");
}

let apiUrl = "";
let currentSearchTerm = "";

$(document).ready(function () {
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
      $("#description").text(mystaff.summary || "");
      apiUrl = mystaff?.adapter?.apiUrl || "";
      console.log("sheet:init - staffId, apiUrl", staffId, apiUrl);
      if (!apiUrl) {
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

/* ---------- Helper utilities (unified) ---------- */

/**
 * POST to apiUrl with given body and return parsed JSON.
 * Throws on network or HTTP errors with helpful message.
 */
async function apiPost(body) {
  if (!apiUrl) throw new Error("API URL not configured");
  console.log("apiPost =>", apiUrl, body);
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // try parse error body, else use status text
    let errBody;
    try {
      errBody = await res.json();
    } catch {
      errBody = res.statusText;
    }
    console.error("apiPost error response:", res.status, errBody);
    throw new Error(`API error: ${res.status} - ${JSON.stringify(errBody)}`);
  }
  const parsed = await res.json();
  console.log("apiPost <-", parsed);
  return parsed;
}

/**
 * Normalize various API response shapes into:
 * { draw?, recordsTotal?, recordsFiltered?, data: [...] }
 */
function normalizeForDataTable(raw, requestData) {
  // If server already returns DataTables format
  if (
    raw &&
    typeof raw.draw !== "undefined" &&
    typeof raw.recordsTotal !== "undefined" &&
    typeof raw.recordsFiltered !== "undefined" &&
    Array.isArray(raw.data)
  ) {
    return raw;
  }

  // If raw is an array of rows or wrapped forms
  let rows = [];
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first) {
      if (Array.isArray(first.output)) rows = first.output;
      else if (first.output && Array.isArray(first.output.data)) rows = first.output.data;
      else if (first.body) {
        try {
          const parsed = typeof first.body === "string" ? JSON.parse(first.body) : first.body;
          if (Array.isArray(parsed.data)) rows = parsed.data;
          else if (Array.isArray(parsed)) rows = parsed;
        } catch (e) {
          // ignore
        }
      } else if (raw.every((r) => r && typeof r === "object" && !Array.isArray(r))) {
        rows = raw;
      }
    }
  } else if (raw && typeof raw === "object") {
    // raw might have body or data directly
    if (Array.isArray(raw.data)) rows = raw.data;
    else if (raw.body) {
      try {
        const parsed = typeof raw.body === "string" ? JSON.parse(raw.body) : raw.body;
        if (Array.isArray(parsed.data)) rows = parsed.data;
        else if (Array.isArray(parsed)) rows = parsed;
      } catch (e) {
        // ignore
      }
    }
  }

  rows = Array.isArray(rows) ? rows : [];

  // Estimate totals conservatively
  const returned = rows.length;
  const estimatedTotal =
    typeof requestData?.length === "number" && returned === requestData.length
      ? requestData.start + returned
      : requestData?.start + returned || returned;

  return {
    draw: requestData?.draw || 0,
    recordsTotal: estimatedTotal,
    recordsFiltered: estimatedTotal,
    data: rows,
  };
}

/* ---------- DataTable initialization (converted to ag-grid) ---------- */

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
    if (!document.getElementById("dt-small-style")) {
      const s = document.createElement("style");
      s.id = "dt-small-style";
      s.textContent = ".dt-small { font-size: 12px !important; line-height: 1.2 !important; }";
      document.head.appendChild(s);
    }

    // Prepare grid container: reuse #staffTable element
    const container = document.getElementById("staffTable");
    if (!container) {
      throw new Error("#staffTable element not found");
    }
    // Clear previous content and ensure it's a div for ag-grid
    container.innerHTML = "";
    container.classList.add("ag-theme-alpine");
    container.style.width = container.style.width || "100%";
    // 하단 여백(padding)을 추가해 마지막 로우가 바닥에 붙지 않게 함
    container.style.boxSizing = "border-box";
    container.style.paddingBottom = container.style.paddingBottom || "24px";

    // 화면 하단까지 그리드가 채워지도록 높이 자동 조정
    function setGridHeightToViewport() {
      try {
        // container의 상단 위치를 기준으로 남은 뷰포트 높이를 계산
        const top = container.getBoundingClientRect().top;
        const bottomMargin = 16; // 하단 여유(필요시 조정)
        const minHeight = 200; // 최소 높이
        const height = Math.max(minHeight, window.innerHeight - top - bottomMargin);
        container.style.height = height + "px";
      } catch (e) {
        // 실패 시 기본 높이 유지
        container.style.height = container.style.height || "600px";
      }
    }

    // 초기 설정 및 반응형 처리
    setGridHeightToViewport();
    window.addEventListener("resize", setGridHeightToViewport);
    window.addEventListener("orientationchange", setGridHeightToViewport);
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
        const modalEl = document.getElementById("rowModal");
        if (modalEl) {
          const bsModal = new bootstrap.Modal(modalEl);
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

          const apiRequestBody = {
            action: "query",
            draw: 0,
            start,
            length,
            search: currentSearchTerm || "",
            orderColumn,
            orderDir,
          };

          const raw = await apiPost(apiRequestBody);
          console.log("ag-grid:raw response", raw);

          // normalize only to extract rows array
          const finalResponse = normalizeForDataTable(raw, { start, length, draw: 0 });
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
    if (!window || !window.agGrid || typeof window.agGrid.Grid !== "function") {
      console.error("ag-grid UMD not found. Include the ag-grid UMD script (e.g. ag-grid-community.min.js) before sheet.js.");
      throw new Error("ag-grid Grid constructor not available.");
    }
    new window.agGrid.Grid(container, gridOptions);
    // datasource is attached in onGridReady

    // quick search handler: update currentSearchTerm and trigger client quickFilter + server re-fetch
    (function attachQuickFilter() {
      const input = document.getElementById("quickFilter");
      if (!input) return;
      const applySearch = () => {
        currentSearchTerm = input.value || "";
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

      // input events: instant on input, also apply on Enter (keypress)
      input.addEventListener("input", () => applySearch());
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          applySearch();
        }
      });
    })();

    // columns persistence wiring
    setupColumnsPersistence(gridOptions, columns, staffId, container);
    
    // helper to render row form moved here so it is available to onRowClicked
    function renderRowFormForAgGrid($form, rowData, columnsDef) {
      $form.empty();
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
        if (useTextarea) {
          $control = $(`<textarea class="form-control" rows="5" readonly></textarea>`).val(asString);
        } else {
          $control = $(`<input class="form-control form-control-sm" readonly />`).val(asString);
        }
        $wrap.append($label).append($control);
        $form.append($wrap);
      });
      $form.find("input, textarea").attr("readonly", "readonly");
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

  function saveState() {
    try {
      const colState = [];
      const columnApi = gridOptionsOrApi.columnApi || (gridOptionsOrApi.api && gridOptionsOrApi.api.getColumnApi && gridOptionsOrApi.api);
      if (!columnApi && containerEl && containerEl.__agGridInstance) {
        // fallback not likely needed
      }
      // try to use gridOptions.api.columnController / columnApi
      if (gridOptionsOrApi.api && gridOptionsOrApi.columnApi) {
        const all = gridOptionsOrApi.columnApi.getAllGridColumns() || [];
        for (let i = 0; i < columns.length; i++) {
          try {
            const colId = columns[i].field || columns[i].headerName || `col${i}`;
            const col = all.find((c) => c.getColDef().field === colId || c.getColId() === colId || c.getColDef().headerName === colId);
            colState.push(!!(col && col.isVisible && col.isVisible()));
          } catch {
            colState.push(true);
          }
        }
        localStorage.setItem(storageKey, JSON.stringify(colState));
      }
    } catch (e) {
      console.warn("Failed to save column state", e);
    }
  }

  const saved = readSaved();

  function buildMenu() {
    menu.empty();
    columns.forEach((col, idx) => {
      const title = col.headerName || col.field || `Col ${idx}`;
      const chkId = `colchk_ag_${idx}`;
      const li = $(`
        <li>
          <div class="form-check px-2 py-1">
            <input class="form-check-input col-toggle" type="checkbox" id="${chkId}" data-idx="${idx}">
            <label class="form-check-label" for="${chkId}" style="margin-left:6px;">${title}</label>
          </div>
        </li>
      `);
      menu.append(li);
      // set checked state: prefer saved, else use grid's current visibility
      try {
        if (saved && typeof saved[idx] !== "undefined") {
          li.find("input.col-toggle").prop("checked", !!saved[idx]);
        } else if (gridOptionsOrApi.columnApi) {
          const colApi = gridOptionsOrApi.columnApi;
          const colId = col.field || col.headerName || `col${idx}`;
          const all = colApi.getAllGridColumns() || [];
          const found = all.find((c) => c.getColDef().field === colId || c.getColId() === colId || c.getColDef().headerName === colId);
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
        // find real column id from grid
        const all = colApi.getAllGridColumns() || [];
        const found = all.find((c) => c.getColDef().field === colId || c.getColId() === colId || c.getColDef().headerName === colId);
        if (found) {
          colApi.setColumnVisible(found.getColId(), visible);
        } else {
          // fallback try by index
          const defs = gridOptionsOrApi.columnDefs || [];
          if (defs[idx]) {
            colApi.setColumnVisible(defs[idx].field || defs[idx].colId || idx, visible);
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
      const all = colApi.getAllGridColumns() || [];
      for (let i = 0; i < Math.min(saved.length, columns.length); i++) {
        const shouldShow = !!saved[i];
        const colId = columns[i].field || columns[i].headerName || `col${i}`;
        const found = all.find((c) => c.getColDef().field === colId || c.getColId() === colId || c.getColDef().headerName === colId);
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
    const raw = await apiPost({ action: "query", start: 0, length: 1, search: "", orderColumn: "", orderDir: "" });
    // try normalize to plain rows array
    if (raw && Array.isArray(raw.data)) return raw.data;
    const normalized = normalizeForDataTable(raw, { start: 0, length: 1, draw: 0 });
    return Array.isArray(normalized.data) ? normalized.data : [];
  } catch (err) {
    console.error("getFirstPageDataForColumns failed:", err);
    return [];
  }
}

async function fetchAndExtract(actionBody) {
  const raw = await apiPost(actionBody);
  // try common shapes
  if (Array.isArray(raw) && raw.length > 0 && raw[0].output) return raw[0].output;
  if (raw && typeof raw.body !== "undefined") return typeof raw.body === "string" ? JSON.parse(raw.body) : raw.body;
  if (raw && Array.isArray(raw)) return raw;
  return raw;
}

export async function getDataById(id) {
  try {
    return await fetchAndExtract({ action: "read", id });
  } catch (err) {
    console.error("getDataById failed:", err);
    throw err;
  }
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

import { normalizeApiResponse, apiPost } from "../utils.js";
import { initAuthGuard } from "../auth-guard.js";

let host = "";
let mystaff = null;
let currentSearchTerm = "";

$(document).ready(async function () {
  // 인증 체크
  if (!(await initAuthGuard())) {
    return;
  }

  // Load test configuration from sessionStorage
  const testConfigStr = sessionStorage.getItem("testStaffConfig");
  if (!testConfigStr) {
    alert("No test configuration found. Please initiate test from crew-build page.");
    return;
  }

  try {
    const testConfig = JSON.parse(testConfigStr);
    mystaff = {
      id: testConfig.staffId,
      name: testConfig.staff_name,
      summary: testConfig.adapter?.system_prompt || "Test Configuration",
      adapter: testConfig.adapter,
      resource: testConfig.resource,
      language: testConfig.language
    };
    
    $("#title").text(mystaff.name);
    $("#summary").text(mystaff.summary || "Testing database resource configuration");
    host = mystaff?.adapter?.host || "";
    
    console.log("test-sheet:init - staffId, host", mystaff.id, host);
    
    if (!host) {
      alert("API URL not found in test configuration.");
      return;
    }

    initTableForStaff(mystaff.id);
  } catch (error) {
    console.error("Error parsing test configuration:", error);
    alert("Invalid test configuration.");
  }
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
        filter: 'agTextColumnFilter',
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

    // Prepare grid container
    const $container = $("#staffTable");
    if (!$container.length) {
      throw new Error("#staffTable element not found");
    }
    const container = $container[0];
    $container.empty();
    $container.addClass("ag-theme-alpine");
    if (!$container.css("width")) $container.css("width", "100%");
    $container.css("box-sizing", "border-box");
    if (!$container.css("padding-bottom")) $container.css("padding-bottom", "24px");

    // Auto-adjust grid height to viewport
    function setGridHeightToViewport() {
      try {
        const top = container.getBoundingClientRect().top;
        const bottomMargin = 16;
        const minHeight = 200;
        const height = Math.max(minHeight, window.innerHeight - top - bottomMargin);
        $container.css("height", height + "px");
      } catch (e) {
        if (!$container.css("height")) $container.css("height", "500px");
      }
    }

    setGridHeightToViewport();
    $(window).on("resize orientationchange", setGridHeightToViewport);
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
      getRowStyle: function () {
        return { "font-size": "12px", "line-height": "1.2" };
      },
    };

    // datasource
    const datasource = {
      getRows: async (params) => {
        try {
          const start = params.startRow || 0;
          const length = (params.endRow || 0) - start || gridOptions.cacheBlockSize || 50;
          console.log("ag-grid:getRows", { start, length, sortModel: params.sortModel });

          let orderColumn = null;
          let orderDir = null;
          if (params.sortModel && params.sortModel.length > 0) {
            const s = params.sortModel[0];
            orderColumn = { columnId: s.colId, sort: s.sort };
            orderDir = s.sort;
          }

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

          const finalResponse = normalizeApiResponse(raw, { start, length });
          const rows = Array.isArray(finalResponse.data) ? finalResponse.data : [];

          let total = -1;
          if (raw && typeof raw.recordsFiltered === "number") {
            total = raw.recordsFiltered;
          } else if (raw && typeof raw.recordsTotal === "number") {
            total = raw.recordsTotal;
          } else if (finalResponse && typeof finalResponse.recordsFiltered === "number" && (raw && (raw.recordsFiltered || raw.recordsTotal))) {
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

    // onGridReady
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

    // Create the grid
    const GridConstructor = await resolveAgGridConstructor();
    if (!GridConstructor || typeof GridConstructor !== "function") {
      console.error("ag-grid Grid constructor not available. Include ag-grid script or allow dynamic import.");
      throw new Error("ag-grid Grid constructor not available.");
    }
    new GridConstructor(container, gridOptions);

    // Quick search handler
    (function attachQuickFilter() {
      const $input = $("#quickFilter");
      if (!$input.length) return;
      
      const applySearch = () => {
        currentSearchTerm = $input.val() || "";
        try {
          if (gridOptions.api && typeof gridOptions.api.setQuickFilter === "function") {
            gridOptions.api.setQuickFilter(currentSearchTerm);
          }
        } catch (e) {
          console.warn("setQuickFilter failed:", e);
        }
        try {
          if (gridOptions.api && typeof gridOptions.api.purgeInfiniteCache === "function") {
            gridOptions.api.purgeInfiniteCache();
          } else if (gridOptions.api && typeof gridOptions.api.setDatasource === "function") {
            gridOptions.api.setDatasource(gridOptions.api.getDatasource ? gridOptions.api.getDatasource() : datasource);
          }
        } catch (e) {
          console.warn("failed to refresh grid after search:", e);
        }
      };

      // Add clear button CSS if not exists
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

      // Wrap input
      let $wrap = $input.parent();
      if (!$wrap.length || !$wrap.hasClass('quick-filter-wrap')) {
        $wrap = $("<span>").addClass('quick-filter-wrap');
        try { $wrap.css('display', getComputedStyle($input[0]).display === 'block' ? 'block' : 'inline-block'); } catch (e) {}
        $input.before($wrap);
        $wrap.append($input);
      }

      // Create clear button
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
        } catch (e) {}
      };

      $clearBtn.off('click').on('click', (ev) => {
        ev.preventDefault();
        $input.val('');
        toggleClearBtn();
        applySearch();
        try { $input.focus(); } catch (e) {}
      });

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

      toggleClearBtn();
    })();
    
    // Helper to render row form
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
        const $wrap = $('<div class="col-12 mb-2"></div>');
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
    }
  } catch (err) {
    console.error("Error initializing ag-grid table:", err);
    const tbl = $("#staffTable");
    tbl.html(
      '<div style="padding:12px;color:#a00">Failed to initialize grid. See console for details.</div>'
    );
  }
}

/* ---------- API helpers ---------- */

export async function getFirstPageDataForColumns() {
  try {
    const raw = await apiPost(host, { action: "query", start: 0, length: 1, search: "", orderColumn: "", orderDir: "" });
    let editableKey = [];
    let outputData = [];
    
    if (Array.isArray(raw) && raw.length > 0) {
      const item = raw[0];
      if (item.meta && item.meta.resource === "database") {
        editableKey = Object.keys(item.meta)
          .filter(k => k !== "resource" && item.meta[k] === true);
      }
      if (item.output && Array.isArray(item.output)) {
        outputData = item.output;
      }
    }
    
    if (outputData.length === 0 && raw && Array.isArray(raw.data)) {
      outputData = raw.data;
    }
    if (outputData.length === 0) {
      const normalized = normalizeApiResponse(raw, { start: length });
      outputData = Array.isArray(normalized.data) ? normalized.data : [];
    }
    
    outputData.editableKey = editableKey;
    window._sheetEditableKey = editableKey;
    return outputData;
  } catch (err) {
    console.error("getFirstPageDataForColumns failed:", err);
    return [];
  }
}

/* ---------- ag-grid constructor resolver ---------- */
async function resolveAgGridConstructor() {
  try {
    const gw = (typeof agGrid !== "undefined") ? agGrid : (typeof window !== "undefined" ? window.agGrid : null);
    console.log("resolveAgGridConstructor: agGrid global (raw):", gw);

    if (gw) {
      if (typeof gw === "function") return gw;
      if (typeof gw.Grid === "function") return gw.Grid;
      if (gw.default && typeof gw.default.Grid === "function") return gw.default.Grid;
      if (gw.default && typeof gw.default === "function") return gw.default;

      for (const k of Object.keys(gw)) {
        try {
          const val = gw[k];
          if (typeof val === "function" && k.toLowerCase().includes("grid")) return val;
          if (val && typeof val.Grid === "function") return val.Grid;
          if (typeof val === "function" && (val.name && val.name.toLowerCase().includes("grid"))) return val;
        } catch (e) {}
      }
    }

    for (const k of Object.keys(window)) {
      try {
        const v = window[k];
        if (!v) continue;
        if (v && typeof v.Grid === "function") return v.Grid;
        if (typeof v === "function" && (k.toLowerCase().includes("grid") || (v.name && v.name.toLowerCase().includes("grid")))) return v;
      } catch (e) {}
    }

    try {
      console.log("resolveAgGridConstructor: attempting dynamic ESM import of ag-grid");
      const mod = await import("https://cdn.jsdelivr.net/npm/ag-grid-community/dist/ag-grid-community.min.mjs");
      console.log("resolveAgGridConstructor: dynamic import result keys:", Object.keys(mod));
      if (typeof mod.Grid === "function") return mod.Grid;
      if (mod.default && typeof mod.default.Grid === "function") return mod.default.Grid;
      if (mod.default && typeof mod.default === "function") return mod.default;
      window.agGrid = window.agGrid || mod;
    } catch (impErr) {
      console.warn("resolveAgGridConstructor: dynamic import failed", impErr);
    }
  } catch (e) {
    console.error("resolveAgGridConstructor: unexpected error", e);
  }
  return null;
}

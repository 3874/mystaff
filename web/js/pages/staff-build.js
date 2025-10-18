import { handleMsg } from "../agents.js";
import { addData, updateData, getDataByKey } from "../database.js";

$(function () {
  // Check if we're editing an existing staff (staffId in URL)
  const urlParams = new URLSearchParams(window.location.search);
  const staffId = urlParams.get('staffId');

  // Adapter configurations
  const adapterConfigs = {
    http: {
      host: "https://",
      authorization: "Bearer ",
      contentType: "application/json",
    },
    openai: {
      host: "https://api.openai.com/v1/chat/completions",
      authorization: "Bearer ",
      contentType: "application/json",
    },
    gemini: {
      host: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
      authorization: "Bearer ",
      contentType: "application/json",
    },
  };

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
    $("#adapter_language").val(adapter.language || "");
    $("#adapter_resource").val(adapter.resource || "");

    const headers = adapter.headers || {};
    $("#adapter_headers_Authorization").val(headers.Authorization || "");
    $("#adapter_headers_Content-Type").val(headers["Content-Type"] || "");

    if (adapterName === "http") {
      $("#adapter_method").val(adapter.method || "");
    } else if (adapterName === "openai" || adapterName === "gemini") {
      $("#adapter_model").val(adapter.model || "");
      $("#adapter_system_prompt").val(adapter.system_prompt || "");
    }
  }

  function getJsonFromForm() {
    const staffIdField = $("#staffId");
    const staffIdValue = staffIdField.is(":disabled") ? staffIdField.val() : ""; // Only include staffId if in modify mode

    return {
      staffId: staffIdValue,
      staff_name: $("#staff_name").val(),
      role: $("#role").val(),
      summary: $("#summary").val(),
      language: $("#adapter_language").val(),
      resource: $("#adapter_resource").val(),
      adapter: {
        name: $("#adapter_name").val(),
        host: $("#adapter_apiUrl").val(),
        method: $("#adapter_method").val(),
        model: $("#adapter_model").val(),
        system_prompt: $("#adapter_system_prompt").val(),
        token_limit: parseInt($("#adapter_token_limit").val(), 10) || 0,
        headers: {
          Authorization: $("#adapter_headers_Authorization").val(),
          "Content-Type": $("#adapter_headers_Content-Type").val(),
        },
      },
    };
  }

  // Adapter change handler
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
        $("#adapter_model").val("gpt-4o-mini");
      } else if (selectedAdapter === "gemini") {
        $("#adapter_model").val("gemini-2.0-flash-exp");
      }
    }
  });

  // Save button handler
  $("#saveBtn").on("click", async function () {
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

    // Only validate method for HTTP adapter
    if (newJsonData.adapter.name === "http" && !newJsonData.adapter.method) {
      alert("Adapter Method is required for HTTP adapter.");
      return;
    }

    try {
      if (newJsonData.staffId) {
        // Update existing staff
        await updateData("diystaff", newJsonData.staffId, newJsonData);
        console.log("Staff updated:", newJsonData.staffId);
        alert("Staff updated successfully!");
      } else {
        // Add new staff
        newJsonData.staffId = "diystaff-" + Date.now(); // Generate a simple unique ID
        await addData("diystaff", newJsonData);
        console.log("New staff added:", newJsonData.staffId);
        alert("Staff created successfully!");
      }
      // Redirect back to myinterns page
      window.location.href = "./myinterns.html";
    } catch (error) {
      console.error("Failed to save staff data:", error);
      alert("Failed to save data. See console for details.");
    }
  });

  // Test button handler
  $("#testBtn").on("click", async function () {
    if (!$("#input_prompt").val()) {
      alert("Please enter a test prompt.");
      return;
    }
    const responder = getJsonFromForm();
    const processedInput = {
      action: 'chat',
      prompt: $("#input_prompt").val(),
      history: $("#input_history").val() || "",
      ltm: $("#input_ltm").val() || "",
      file: "",
    };
    const sessionId = $("#input_sessionId").val();
    console.log("Testing with input:", processedInput, "and responder:", responder);

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

  // Initialize form
  if (staffId) {
    // Load existing staff data for editing
    getDataByKey("diystaff", staffId).then(staffData => {
      if (staffData) {
        populateForm(staffData);
      } else {
        alert("Could not find staff data.");
        window.location.href = "./myinterns.html";
      }
    }).catch(error => {
      console.error("Failed to load staff data:", error);
      alert("Failed to load staff data.");
      window.location.href = "./myinterns.html";
    });
  } else {
    // New staff - initialize with defaults
    populateForm({});
    $("#adapter_name").val('http').trigger('change');
  }
});

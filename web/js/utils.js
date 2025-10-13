// utils.js
import { getAllData, addData } from "./database.js";
import { getAgentById } from "./allAgentsCon.js";
import { getDataByKey } from "./database.js";

// Generic JSON POST helper for server APIs
export async function apiPost(host, body) {
  if (!host) throw new Error("API URL not configured");
  const res = await fetch(host, {
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
  return parsed;
}

export async function signOut() {
  localStorage.clear(); // Clears all items from localStorage
  window.location.href = "./signin.html"; // Redirects to the sign-in page
}

export async function handleFileUploadToServer(event, sessionId, mystaff) {
  const file = event.target.files[0];
  const url = mystaff?.adapter?.host;
  if (!file) return;
  const fileName = file.name || "";
  const formData = new FormData();

  // 안전하게 헤더 복사 (존재하지 않으면 빈 객체)
  const fetchHeaders = mystaff?.adapter?.headers ? { ...mystaff.adapter.headers } : {};
  // 브라우저가 boundary를 붙이도록 Content-Type 제거
  Object.keys(fetchHeaders).forEach((k) => {
    if (k.toLowerCase() === "content-type") delete fetchHeaders[k];
  });

  formData.append("file", file);
  formData.append("sessionId", sessionId);
  formData.append("fileName", fileName);
  formData.append("action", "upload");

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      headers: fetchHeaders,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Upload failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    // 안전한 응답 파싱: 빈본문 / 비-JSON도 처리
    const text = await response.text();
    if (!text) {
      console.log("File uploaded successfully (empty response body).");
      alert("File uploaded successfully!");
      return {};
    }
    try {
      const responseData = JSON.parse(text);
      console.log("File uploaded successfully:", responseData);
      alert("File uploaded successfully!");
      return responseData;
    } catch (parseErr) {
      console.warn("Upload response is not valid JSON, returning raw text.", parseErr);
      console.log("Response text:", text);
      alert("File uploaded successfully!");
      return text;
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    alert(`File upload failed: ${error.message}`);
    return null;
  }
}

export async function handleFileUpload(event, sessionId, mystaff) {
  const file = event.target.files[0];
  if (!file) return;
  console.log(file);

  let content = "";
  const fileName = file.name || "";
  const fileExtension = fileName.split(".").pop().toLowerCase();

  const fileExtensionPool = [
    "doc",
    "docx",
    "pdf",
    "pptx",
    "txt",
    "rtf",
    "csv",
    "xls",
    "xlsx",
  ];

  if (!fileExtensionPool.includes(fileExtension)) {
    // fileExtensionPook에 없는 확장자를 가지면 alert띄워서 저장이 불가하다가 하자
    alert("docx, pdf, txt, xlsx, pptx 파일만 저장 가능합니다.");
    return;
  }

  try {
    switch (fileExtension) {
      case "pdf":
        const pdfReader = new FileReader();
        pdfReader.readAsArrayBuffer(file);
        content = await new Promise((resolve, reject) => {
          pdfReader.onload = async (e) => {
            try {
              if (!window.pdfjsLib) {
                throw new Error("PDF.js library is not loaded.");
              }
              const pdf = await window.pdfjsLib.getDocument(e.target.result)
                .promise;
              let pdfText = "";
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                pdfText +=
                  textContent.items.map((item) => item.str).join(" ") + "\n";
              }
              resolve(pdfText);
            } catch (error) {
              console.error("PDF parsing error:", error);
              reject(new Error(`Failed to parse PDF file: ${error.message}`));
            }
          };
          pdfReader.onerror = () =>
            reject(new Error("Failed to read PDF file."));
        });
        break;

      case "docx":
        const docxReader = new FileReader();
        docxReader.readAsArrayBuffer(file);
        content = await new Promise((resolve, reject) => {
          docxReader.onload = async (e) => {
            try {
              const result = await mammoth.extractRawText({
                arrayBuffer: e.target.result,
              });
              resolve(result.value);
            } catch (error) {
              reject(new Error("Failed to parse .docx file."));
            }
          };
          docxReader.onerror = () =>
            reject(new Error("Failed to read .docx file."));
        });
        break;

      default:
        // 다른 모든 파일은 일반 텍스트로 처리합니다.
        content = await file.text();
        break;
    }

    // Generate a unique ID for the file record.
    const fileId = Array.from(
      crypto.getRandomValues(new Uint8Array(16)),
      (byte) => ("0" + byte.toString(16)).slice(-2)
    ).join("");
    const fileData = {
      id: fileId,
      sessionId: sessionId,
      staffId: mystaff?.staff_id || null,
      fileName: fileName,
      contents: content,
    };

    await addData("myfiles", fileData);
    alert("File processed and uploaded successfully!");
    return fileData;
  } catch (error) {
    console.error("Error processing file:", error);
    alert(`File processing failed: ${error.message}`);
  }
}

export async function FindUrl(mystaff, Fset = 0) {
  const staffId = mystaff.staff_id ? mystaff.staff_id : mystaff.staffId;
  const resource = mystaff.resource ? mystaff.resource : "chat";

  if (resource === "database") {
    const Finalurl = `./sheet.html?staffId=${staffId}`;
    return Finalurl;
  } 

  let Furl = "";
  if (Fset === 1) {
    Furl = "./chat_moderator.html";
  } else {
    Furl = "./chat.html";
  }

  if (!staffId) {
    window.location.href = "mystaff.html";
    return;
  }

  let finalSessionId = null;

  // Get all chat sessions
  const allChats = await getAllData("chat"); // getAllData is already imported

  if (allChats && allChats.length > 0) {
    // Find a session with the matching staffId
    const foundSession = allChats.find(
      (session) => session.staffId === staffId
    );
    if (foundSession) {
      finalSessionId = foundSession.sessionId;
    }
  }

  if (!finalSessionId) {
    // If no existing session found, create a new one
    finalSessionId = Array.from(
      crypto.getRandomValues(new Uint8Array(32)),
      (byte) => {
        return ("0" + byte.toString(16)).slice(-2);
      }
    ).join("");
    await addData("chat", {
      sessionId: finalSessionId,
      staffId: staffId,
      title: "No Title",
      msg: [],
      attendants: [],
    });
  }

  const Finalurl = `${Furl}?sessionId=${finalSessionId}`;
  return Finalurl;
}

export async function historyToString(history) {
  if (!Array.isArray(history)) return "";

  return history
    .map((item) => {
      let parts = [];
      if (item.date) parts.push(`[${item.date}]`);
      if (item.speakerId) parts.push(`(${item.speakerId})`);
      if (item.speacker) parts.push(item.speacker);

      let header = parts.join(" ") || "Unknown";

      let system = item.system ? `system="${item.system}"` : "";
      let user = item.user ? `user="${item.user}"` : "";

      return `${header}: ${[system, user].filter(Boolean).join(", ")}`;
    })
    .join("\n");
}

export async function getAnyAgentById(staffId) {
  let agent = null;
  if (staffId.startsWith("diystaff-")) {
    agent = (await getDataByKey("diystaff", staffId)) || {};
  } else {
    agent = (await getAgentById(staffId)) || {};
  }
  return agent;
}

export function estimateTokens(text) {
  if (!text) return 0;
  // 평균 4 chars per token (조정 가능)
  return Math.ceil(text.length / 4);
}

export function checkLanguage(text) {
  let lang;
  switch (text) {
    case "ko":
      lang = "Korean";
      break;
    case "en":
      lang = "English";
      break;
    case "ch":
      lang = "Chinese";
      break;
    case "jp":
      lang = "Japanese";
      break;
    default:
      lang = "English";
  }

  return lang;
}

export function normalizeApiResponse(raw, requestData) {
  // If server already returns a tabular format with totals
  if (
    raw &&
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
    recordsTotal: estimatedTotal,
    recordsFiltered: estimatedTotal,
    data: rows,
  };
}
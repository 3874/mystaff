// utils.js
import { getAllData, addData } from "./database.js";
import { getAgentById } from "./allAgentsCon.js";
import { getDataByKey } from "./database.js";

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
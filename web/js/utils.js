// utils.js
import { getAllData, addData } from "./database.js";
import { getAgentById } from "./allAgentsCon.js";
import { getDataByKey } from "./database.js";
import { uploadFileToDrive } from "./google-drive.js";

// ========== 인증 관련 함수 ==========

/**
 * 로그인 상태 확인
 * @returns {boolean} 로그인 여부
 */
export function isLoggedIn() {
  return localStorage.getItem('mystaff_loggedin') === 'true';
}

/**
 * 현재 로그인한 사용자 정보 가져오기
 * IndexedDB에서 사용자 정보를 조회
 * @returns {Promise<Object|null>} 사용자 정보 또는 null
 */
export async function getCurrentUser() {
  if (!isLoggedIn()) return null;
  
  const email = localStorage.getItem('mystaff_user');
  if (!email) return null;
  
  try {
    // IndexedDB에서 사용자 정보 조회
    const userData = await getDataByKey('mydata', email);
    
    if (!userData) {
      console.error('User data not found in database');
      return null;
    }
    
    return {
      email: userData.myId,
      nick: userData.nick,
      company: userData.company,
      secretKey: userData.secretKey,
      mystaff: userData.mystaff || [],
      credentials: userData.credentials || {},
      googleUser: userData.googleUser,
      isGoogleUser: !!userData.googleUser
    };
  } catch (e) {
    console.error('Failed to get user data from database:', e);
    return null;
  }
}

/**
 * 페이지 접근 권한 확인 (로그인 필수 페이지용)
 * 로그인하지 않은 경우 signin.html로 리다이렉트
 */
export function requireAuth() {
  if (!isLoggedIn()) {
    console.warn('Authentication required. Redirecting to sign-in page...');
    window.location.href = './signin.html';
    return false;
  }
  return true;
}

/**
 * 사용자 표시 이름 가져오기
 * @returns {Promise<string>} 표시할 사용자 이름
 */
export async function getUserDisplayName() {
  const user = await getCurrentUser();
  if (!user) return 'Guest';
  
  if (user.googleUser?.name) return user.googleUser.name;
  if (user.nick) return user.nick;
  return user.email || 'User';
}

/**
 * 사용자 프로필 이미지 가져오기
 * @returns {Promise<string|null>} 프로필 이미지 URL 또는 null
 */
export async function getUserProfilePicture() {
  const user = await getCurrentUser();
  if (!user) return null;
  
  return user.googleUser?.picture || null;
}

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

/**
 * 파일 확장자에 따라 내용을 추출하는 함수
 * @param {File} file - 처리할 파일 객체
 * @param {string} fileExtension - 파일 확장자
 * @returns {Promise<string>} 추출된 파일 내용
 */
async function extractFileContent(file, fileExtension) {
  let content = "";

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
  } catch (error) {
    console.error(`Error extracting content from ${fileExtension} file:`, error);
    throw error;
  }

  return content;
}

export async function handleFileUpload(event, sessionId, mystaff) {

  const file = event.target.files[0];
  if (!file) return;
  
  // 파일 input 초기화 (중요: 이렇게 해야 팝업 차단이 안됨)
  event.target.value = '';
  
  console.log(file);

  let content = "";
  const fileName = file.name || "";
  const fileExtension = fileName.split(".").pop().toLowerCase();

  // 1단계: 확장자 확인
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
    alert("docx, pdf, txt, xlsx, pptx 파일만 저장 가능합니다.");
    return;
  }

  // 2단계: 약간의 지연 후 Google Drive 업로드 시도 (팝업 차단 방지)
  let driveFileInfo = null;
  let uploadSuccess = false;
  
  // 50ms 지연을 주어 파일 선택 다이얼로그가 완전히 닫히도록 함
  await new Promise(resolve => setTimeout(resolve, 50));
  
  try {
    console.log('Attempting to upload file to Google Drive...');
    // sessionId를 전달하여 files/{sessionId}/ 폴더에 저장
    driveFileInfo = await uploadFileToDrive(file, fileName, sessionId);
    console.log('File uploaded to Google Drive:', driveFileInfo);
    uploadSuccess = true;
    
    // 같은 파일이 이미 있는지 확인
    if (driveFileInfo.isDuplicate || driveFileInfo.alreadyExists) {
      alert(`ℹ️ 같은 이름의 파일이 이미 Google Drive에 존재합니다.\n\n파일명: ${fileName}\n\n중복 업로드를 방지했습니다.`);
      // 중복 파일인 경우 여기서 함수 종료 (다음 프로세스 진행하지 않음)
      return {
        fileName: fileName,
        isDuplicate: true,
        message: '파일이 이미 존재하여 업로드를 건너뛰었습니다.'
      };
    } else {
      alert(`✅ Google Drive 업로드 성공!\n\n파일명: ${fileName}`);
    }
  } catch (driveError) {
    console.error('Google Drive upload failed:', driveError);
    alert(`❌ Google Drive 업로드 실패\n\n계속 진행합니다.\n\n오류: ${driveError.message}`);
    uploadSuccess = false;
  }
  
  // 3단계: 업로드 실패 여부와 관계없이 파일 처리 진행
  const fileId = Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    (byte) => ("0" + byte.toString(16)).slice(-2)
  ).join("");

  try {
    // 파일 내용 추출
    content = await extractFileContent(file, fileExtension);
    
    const fileData = {
      id: fileId,
      sessionId: sessionId,
      staffId: mystaff?.staff_id || null,
      fileName: fileName,
      contents: content,
      uploadSuccess: uploadSuccess,
      // Google Drive 정보 포함 (업로드 성공 시에만 유효)
      driveFileId: driveFileInfo?.fileId || null,
      driveWebViewLink: driveFileInfo?.webViewLink || null,
      driveWebContentLink: driveFileInfo?.webContentLink || null,
      driveMimeType: driveFileInfo?.mimeType || null,
      driveSize: driveFileInfo?.size || null,
    };

    await addData("myfiles", fileData);
    
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


export function generateSecretKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => {
    return ('0' + byte.toString(16)).slice(-2);
  }).join('');
}
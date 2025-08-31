// utils.js
import {  getAllData, addData } from './database.js';
import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
// mammoth.js is loaded via <script> tag in chat.html, creating a global 'mammoth' object.

// PDF.js가 백그라운드에서 작동하려면 worker 설정이 필요합니다.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';


export async function signOut() {
    localStorage.clear(); // Clears all items from localStorage
    window.location.href = './signin.html'; // Redirects to the sign-in page
}

export async function handleFileUpload(event, sessionId, mystaff) {
    const file = event.target.files[0];
    if (!file) return;

    let content = '';
    const fileName = file.name || '';
    const fileExtension = fileName.split('.').pop().toLowerCase();

    try {
        switch (fileExtension) {
            case 'pdf':
                const pdfReader = new FileReader();
                pdfReader.readAsArrayBuffer(file);
                content = await new Promise((resolve, reject) => {
                    pdfReader.onload = async (e) => {
                        try {
                            const pdf = await pdfjsLib.getDocument(e.target.result).promise;
                            let pdfText = '';
                            for (let i = 1; i <= pdf.numPages; i++) {
                                const page = await pdf.getPage(i);
                                const textContent = await page.getTextContent();
                                pdfText += textContent.items.map(item => item.str).join(' ') + '\n';
                            }
                            resolve(pdfText);
                        } catch (error) {
                            reject(new Error('Failed to parse PDF file.'));
                        }
                    };
                    pdfReader.onerror = () => reject(new Error('Failed to read PDF file.'));
                });
                break;

            case 'docx':
                const docxReader = new FileReader();
                docxReader.readAsArrayBuffer(file);
                content = await new Promise((resolve, reject) => {
                    docxReader.onload = async (e) => {
                        try {
                            const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
                            resolve(result.value);
                        } catch (error) {
                            reject(new Error('Failed to parse .docx file.'));
                        }
                    };
                    docxReader.onerror = () => reject(new Error('Failed to read .docx file.'));
                });
                break;
            
            case 'doc':
                // .doc 파일은 브라우저에서 직접 파싱하기 매우 어렵습니다.
                throw new Error(".doc files are not supported. Please convert to .docx or .pdf and try again.");

            default:
                // 다른 모든 파일은 일반 텍스트로 처리합니다.
                content = await file.text();
                break;
        }

        // Generate a unique ID for the file record.
        const fileId = crypto.randomUUID();
        const fileData = {
            id: fileId,
            sessionId: sessionId,
            staffId: mystaff?.staffId || null,
            fileName: fileName,
            contents: content
        };

        await addData('myfiles', fileData);
        alert('File processed and uploaded successfully!');

    } catch (error) {
        console.error('Error processing file:', error);
        alert(`File processing failed: ${error.message}`);
    }
}


export async function FindUrl(mystaff) {
  const outputType = mystaff.output_type;
  const staffId = mystaff.staffId;
  let Furl;

  if (!staffId) {
    window.location.href = 'mystaff.html';
    return;
  } else if (!outputType || outputType === 'text') {
    Furl = `chat.html`;
  } else {
    Furl = `chat-${outputType}.html`;
  } 

  let finalSessionId = null;

  // Get all chat sessions
  const allChats = await getAllData('chat'); // getAllData is already imported

  if (allChats && allChats.length > 0) {
    // Find a session with the matching staffId
    const foundSession = allChats.find(session => session.staffId === staffId);
    if (foundSession) {
      finalSessionId = foundSession.sessionId;
    }
  }

  if (!finalSessionId) {
    // If no existing session found, create a new one
    finalSessionId = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => {
        return ('0' + byte.toString(16)).slice(-2);
      }).join('');
    await addData('chat', {
        sessionId: finalSessionId,
        staffId: staffId,
        title: 'No Title',
        msg: [],
        attendants: [],
    });
  }

  Furl = `${Furl}?sessionId=${finalSessionId}`;
  return Furl;
}
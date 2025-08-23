// utils.js

export function signOut() {
    localStorage.clear(); // Clears all items from localStorage
    window.location.href = './signin.html'; // Redirects to the sign-in page
}

export async function handleFileUpload(event, sessionId, mystaff) {
    const file = event.target.files[0];
    if (!file) return;
    const content = await file.text();
    await addData('myfiles', { sessionId, staffId: mystaff?.staff_id?.S || null, contents: content });
}

// async function handleFileUploadtoServer(event) {
//     const file = event.target.files[0];
//     if (!file) return;

//     const formData = new FormData();
//     formData.append('file', file);
//     const fileUrl = 'http://172.30.1.84:5678/webhook/mystaff-file';

//     try {
//         // IMPORTANT: Replace '/api/upload' with your actual server endpoint
//         const response = await fetch(fileUrl, {
//             method: 'POST',
//             headers: {
//                 'Authorization': 'mystaff'
//             },
//             body: formData,
//         });

//         if (response.ok) {
//             const responseText = await response.text();
//             if (responseText) {
//                 const result = JSON.parse(responseText);
//                 console.log('File uploaded successfully:', result);
//             } else {
//                 console.log('File uploaded successfully: Server returned an empty response.');
//             }
//             alert('File uploaded successfully!');
//             // Optionally, add code here to display the file in the chat
//         } else {
//             const errorText = await response.text();
//             console.error('File upload failed:', errorText);
//             alert(`File upload failed: ${errorText}`);
//          }
//     } catch (error) {
//         console.error('Error uploading file:', error);
//         alert('An error occurred while uploading the file.');
//     }
// }


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
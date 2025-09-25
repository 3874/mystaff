// utils.js
import { getAllData, addData } from "./database.js";

export async function signOut() {
  localStorage.clear(); // Clears all items from localStorage
  window.location.href = "./signin.html"; // Redirects to the sign-in page
}

export async function handleFileUpload(event, sessionId, mystaff) {

  const file = event.target.files[0];
  const url = mystaff?.adapter?.uploadUrl;
  if (!file) return;
  const fileName = file.name || "";
  const formData = new FormData();
  const headers = {
    "Authorization": mystaff?.adapter?.headers.Authorization || ""
  }

  formData.append("file", file);
  formData.append("sessionId", sessionId);
  formData.append("fileName", fileName);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      headers: headers,
    });

    if (!response.ok) {
      // Throw an error with the response status text
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log("File uploaded successfully:", responseData);
    alert("File uploaded successfully!");
    return responseData; // Return the server response

  } catch (error) {
    console.error("Error uploading file:", error);
    alert(`File upload failed: ${error.message}`);
    return null;
  }

}

export async function FindUrl(mystaff, Fset = 0) {
  const staffId = mystaff.staff_id;
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

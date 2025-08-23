// utils.js

export function signOut() {
    localStorage.clear(); // Clears all items from localStorage
    window.location.href = './signin.html'; // Redirects to the sign-in page
}

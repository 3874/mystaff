export function CheckSignIn() {
    const userData = localStorage.getItem('mystaffInfo');
    if (!userData) {
        window.location.href = './signin.html';
        return null; // Added to prevent further execution
    }
    return userData;
}
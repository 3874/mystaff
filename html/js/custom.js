export function initializeSignOut() {
    $('#signout-btn').on('click', function() {
        localStorage.removeItem("mystaffInfo");
        location.href = "./signin.html";
    });
}

export function CheckSignIn() {
    const userData = localStorage.getItem('mystaffInfo');
    if (!userData) {
        window.location.href = './signin.html';
        return null; // Added to prevent further execution
    }
    return userData;
}
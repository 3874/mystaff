$(document).ready(function() {
    MystaffDB.init().catch(error => {
        console.error("Error while initializing DB:", error);
    });

    $("form").submit(function(event) {
        event.preventDefault();

        const email = $("#email").val();
        const password = $("#password").val();

        if (!email || !password) {
            alert("Please enter both email and password.");
            return;
        }

        MystaffDB.getAllData().then(users => {
            const user = users.find(u => u.email === email && u.password === password);

            if (user) {
                alert("Login successful!");
                window.location.href = "mystaff.html";
            } else {
                alert("Invalid email or password.");
            }
        }).catch(error => {
            console.error("Error fetching data:", error);
            alert("An error occurred during login. Please try again.");
        });
    });
});

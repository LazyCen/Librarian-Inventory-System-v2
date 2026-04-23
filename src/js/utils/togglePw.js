/**
 * Toggles the visibility of a password input field.
 * Changes the input type between 'password' and 'text', and updates the toggle icon.
 * 
 * @param {string} inputId - The HTML ID of the password input element.
 * @param {HTMLElement} btn - The button element containing the toggle icon.
 */
function togglePw(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

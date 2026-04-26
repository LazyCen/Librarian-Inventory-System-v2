/**
 * Toggles the visibility of a password input field.
 * @param {string} inputId - The ID of the input element to toggle.
 * @param {HTMLElement} btn - The button element that triggered the toggle.
 */
function togglePw(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const isPw = input.type === 'password';
    input.type = isPw ? 'text' : 'password';

    const icon = btn.querySelector('i');
    if (icon) {
        icon.className = isPw ? 'fas fa-eye-slash' : 'fas fa-eye';
    }
}

/**
 * Handles UI animations for the login/signup screens using GSAP.
 */
document.addEventListener('DOMContentLoaded', () => {
    const card = document.querySelector('.glass-container');
    if (!card) return;

    // Ensure the card is visible and animate it in
    if (typeof gsap !== 'undefined') {
        gsap.to(card, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1,
            ease: 'power4.out',
            delay: 0.2,
            onStart: () => {
                card.style.visibility = 'visible';
            }
        });
    } else {
        // Fallback if GSAP is not loaded
        card.style.opacity = '1';
        card.style.visibility = 'visible';
    }
});

/**
 * Opens the "Add Item" modal overlay by removing its 'hidden' class.
 * This function allows users to upload or add new items/documents to their inventory.
 */
function openAddItemModal() {
    if (typeof setItemFormMode === 'function') {
        setItemFormMode('add');
    }
    const modal = document.getElementById('addItemModal');
    modal.classList.remove('hidden');
    
    if (typeof gsap !== 'undefined') {
        const modalContent = modal.querySelector('.modal-content');
        gsap.fromTo(modalContent, 
            { y: -50, opacity: 0, scale: 0.95 },
            { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.2)" }
        );
    }
}

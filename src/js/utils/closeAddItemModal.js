/**
 * Closes the "Add Item" modal overlay by adding the 'hidden' class.
 * This is triggered upon successful item addition or when the user manually closes the modal.
 */
function closeAddItemModal() {
    const form = document.getElementById('addItemForm');
    if (form) form.reset();
    if (typeof setItemFormMode === 'function') {
        setItemFormMode('add');
    }
    document.getElementById('addItemModal').classList.add('hidden');
}

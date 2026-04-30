/**
 * InventoryHelpers
 * Generic utility functions for the Librarian Inventory System
 */
window.InventoryHelpers = {
    /**
     * Safely parse a date value into a numeric timestamp
     * @param {string|number} dateValue 
     * @returns {number}
     */
    getDateValue(dateValue) {
        if (!dateValue) return 0;
        const parsed = Date.parse(dateValue);
        return Number.isNaN(parsed) ? 0 : parsed;
    },

    /**
     * Check if a date string represents today
     * @param {string} dateValue 
     * @returns {boolean}
     */
    isRecentDate(dateValue) {
        const addedAt = this.getDateValue(dateValue);
        if (!addedAt) return false;

        const addedDate = new Date(addedAt);
        const today = new Date();

        return addedDate.getFullYear() === today.getFullYear() &&
               addedDate.getMonth() === today.getMonth() &&
               addedDate.getDate() === today.getDate();
    },

    /**
     * Format a date for display in the UI (DD/MM/YYYY)
     * @param {string} dateValue 
     * @returns {string}
     */
    formatDisplayDate(dateValue) {
        const value = this.getDateValue(dateValue);
        if (!value) return 'No date';
        return new Date(value).toLocaleDateString('en-GB');
    },

    /**
     * Generate a unique 4-digit numeric ID for a book
     * @param {Object} inventory - The current inventory object to check against
     * @returns {string} 
     */
    generateUniqueId(inventory) {
        let id;
        let attempts = 0;
        const existingIds = Object.values(inventory).map(item => item.id?.toString());

        do {
            id = Math.floor(1000 + Math.random() * 9000).toString();
            attempts++;
        } while (existingIds.includes(id) && attempts < 100);

        return id;
    },

    /**
     * Get the effective bin/status of an item, accounting for legacy isBorrowed flag
     * @param {Object} details 
     * @returns {string} One of: 'Added', 'Borrowed', 'Returned', 'Books'
     */
    getEffectiveBin(details) {
        return details.bin || (details.isBorrowed ? 'Borrowed' : 'Added');
    }
};

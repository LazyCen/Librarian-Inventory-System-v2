/**
 * StorageManager
 * Handles all interactions with localStorage for the Librarian Inventory System
 */
window.StorageManager = {
    KEYS: {
        INVENTORY: 'chaosInventory',
        REQUESTS: 'librarianRequests'
    },

    saveRequests(requests) {
        localStorage.setItem(this.KEYS.REQUESTS, JSON.stringify(requests));
    },

    loadRequests() {
        const saved = localStorage.getItem(this.KEYS.REQUESTS);
        return saved ? JSON.parse(saved) : {};
    },

    /**
     * Save the entire inventory object to storage
     * @param {Object} inventory 
     */
    saveInventory(inventory) {
        try {
            localStorage.setItem(this.KEYS.INVENTORY, JSON.stringify(inventory));
        } catch (error) {
            console.error('Error saving inventory:', error);
            if (typeof showMessage === 'function') {
                showMessage('Error saving data', 'error');
            }
        }
    },

    /**
     * Load inventory from storage and run necessary migrations
     * @returns {Object}
     */
    loadInventory() {
        const savedInventory = localStorage.getItem(this.KEYS.INVENTORY);
        if (!savedInventory) return {};

        try {
            let inventory = JSON.parse(savedInventory);
            return this.migrateInventory(inventory);
        } catch (error) {
            console.error('Error loading inventory:', error);
            return {};
        }
    },

    /**
     * Data Migration: Ensure all items have necessary fields and correct formats
     * @param {Object} inventory 
     * @returns {Object}
     */
    migrateInventory(inventory) {
        let migrated = false;
        
        Object.keys(inventory).forEach(name => {
            const item = inventory[name];
            
            if (!item.id) {
                // Rely on InventoryHelpers if available globally
                if (window.InventoryHelpers) {
                    item.id = window.InventoryHelpers.generateUniqueId(inventory);
                } else {
                    item.id = Math.floor(1000 + Math.random() * 9000).toString();
                }
                migrated = true;
            }
            if (item.author === undefined) {
                item.author = '';
                migrated = true;
            }
            if (!item.tags) {
                item.tags = [];
                migrated = true;
            }
            if (item.isBorrowed === undefined) {
                item.isBorrowed = false;
                migrated = true;
            }
            if (item.borrower === undefined) {
                item.borrower = '';
                migrated = true;
            }
            if (item.bin && item.bin.startsWith('Bin-')) {
                item.bin = item.isBorrowed ? 'Borrowed' : 'Added';
                migrated = true;
            }
            if (item.tags && Array.isArray(item.tags)) {
                const originalTags = JSON.stringify(item.tags);
                item.tags = item.tags.map(tag => {
                    const lowTag = tag.toLowerCase();
                    if (lowTag === 'non-fiction') return 'Non-Fiction';
                    if (lowTag === 'academic works' || lowTag === 'academic work') return 'Academic Work';
                    return tag;
                });
                if (originalTags !== JSON.stringify(item.tags)) {
                    migrated = true;
                }
            }
        });

        if (migrated) {
            this.saveInventory(inventory);
        }
        
        return inventory;
    },

};

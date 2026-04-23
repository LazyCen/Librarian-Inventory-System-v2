/**
 * Book Manager Component
 * Handles CRUD (Create, Read, Update, Delete) operations for books/items
 * This component manages the core business logic for inventory items
 */

/**
 * BookManager class encapsulates all book/item management functionality
 */
class BookManager {
    constructor() {
        this.items = {}; // Local reference to inventory items
        console.log(' BookManager initialized');
    }

    /**
     * Add a new book/item to the inventory
     * @param {string} name - The name of the item
     * @param {string} bin - The assigned storage bin
     * @param {Array} tags - Array of tag strings
     * @returns {Object} Result object with success status and message
     */
    addBook(name, bin, tags = []) {
        // Validate input
        if (!name || !name.trim()) {
            return {
                success: false,
                message: 'Item name is required'
            };
        }

        // Check for duplicates
        if (this.items[name]) {
            return {
                success: false,
                message: 'Item already exists'
            };
        }

        // Create new item entry
        this.items[name] = {
            bin: bin,
            tags: tags,
            dateAdded: new Date().toISOString()
        };

        console.log(`Book added: ${name} in ${bin}`);

        return {
            success: true,
            message: `Item '${name}' added successfully`,
            item: this.items[name]
        };
    }

    /**
     * Get details of a specific book/item
     * @param {string} name - The name of the item to retrieve
     * @returns {Object|null} Item details or null if not found
     */
    getBook(name) {
        return this.items[name] || null;
    }

    /**
     * Get all books/items in the inventory
     * @returns {Object} All inventory items
     */
    getAllBooks() {
        return this.items;
    }

    /**
     * Update an existing book/item
     * @param {string} name - The name of the item to update
     * @param {Object} updates - Object containing fields to update
     * @returns {Object} Result object with success status
     */
    updateBook(name, updates) {
        if (!this.items[name]) {
            return {
                success: false,
                message: 'Item not found'
            };
        }

        // Merge updates with existing data
        this.items[name] = {
            ...this.items[name],
            ...updates,
            dateModified: new Date().toISOString()
        };

        console.log(`Book updated: ${name}`);

        return {
            success: true,
            message: `Item '${name}' updated successfully`,
            item: this.items[name]
        };
    }

    /**
     * Delete a book/item from inventory
     * @param {string} name - The name of the item to delete
     * @returns {Object} Result object with success status
     */
    deleteBook(name) {
        if (!this.items[name]) {
            return {
                success: false,
                message: 'Item not found'
            };
        }

        // Remove the item
        delete this.items[name];

        console.log(`Book deleted: ${name}`);

        return {
            success: true,
            message: `Item '${name}' deleted successfully`
        };
    }

    /**
     * Search for books by name or tags
     * @param {string} query - Search query string
     * @returns {Array} Array of matching items
     */
    searchBooks(query) {
        const searchTerm = query.toLowerCase().trim();
        const results = [];

        // Search through all items
        for (const [name, details] of Object.entries(this.items)) {
            // Check name match
            if (name.toLowerCase().includes(searchTerm)) {
                results.push({ name, ...details, matchType: 'name' });
                continue;
            }

            // Check tags match
            const tagMatch = details.tags.some(tag =>
                tag.toLowerCase().includes(searchTerm)
            );

            if (tagMatch) {
                results.push({ name, ...details, matchType: 'tag' });
            }
        }

        console.log(`Search for "${query}" returned ${results.length} results`);

        return results;
    }

    /**
     * Get statistics about the inventory
     * @returns {Object} Statistics object
     */
    getStatistics() {
        const items = Object.entries(this.items);
        const totalItems = items.length;

        // Count items per bin
        const binCounts = {};

        // Count total tags
        let totalTags = 0;

        items.forEach(([name, details]) => {
            // Count bin usage
            binCounts[details.bin] = (binCounts[details.bin] || 0) + 1;

            // Count tags
            totalTags += details.tags.length;
        });

        return {
            totalItems,
            binCounts,
            totalTags,
            averageTagsPerItem: totalItems > 0 ? (totalTags / totalItems).toFixed(2) : 0
        };
    }

    /**
     * Export inventory data as JSON
     * @returns {string} JSON string of inventory
     */
    exportData() {
        return JSON.stringify(this.items, null, 2);
    }

    /**
     * Import inventory data from JSON
     * @param {string} jsonData - JSON string to import
     * @returns {Object} Result object with success status
     */
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            this.items = data;

            console.log('Data imported successfully');

            return {
                success: true,
                message: 'Data imported successfully'
            };
        } catch (error) {
            console.error('Import error:', error);

            return {
                success: false,
                message: 'Invalid JSON data'
            };
        }
    }
}

// Create a global instance of BookManager
const bookManager = new BookManager();

console.log('book_manager.js loaded successfully');

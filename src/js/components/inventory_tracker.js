/**
 * Inventory Tracker Component
 * Handles real-time tracking of inventory items and bin assignments
 * Provides functionality for monitoring inventory levels and locations
 */

/**
 * InventoryTracker class manages tracking and monitoring of inventory
 */
class InventoryTracker {
    constructor() {
        this.bins = ["Bin-A", "Bin-B", "Bin-C", "Bin-D"];
        this.currentPointer = 0;
        this.history = []; // Track all inventory changes
        console.log('InventoryTracker initialized');
    }

    /**
     * Get the next available bin for assignment
     * @returns {string} The next bin identifier
     */
    getNextBin() {
        return this.bins[this.currentPointer];
    }

    /**
     * Advance the bin pointer to the next bin in rotation
     * Uses modulo to wrap around to the beginning after the last bin
     */
    advanceBinPointer() {
        this.currentPointer = (this.currentPointer + 1) % this.bins.length;
        console.log(`Bin pointer advanced to: ${this.bins[this.currentPointer]}`);
    }

    /**
     * Get the current bin pointer position
     * @returns {number} Current pointer index
     */
    getCurrentPointer() {
        return this.currentPointer;
    }

    /**
     * Set the bin pointer to a specific position
     * @param {number} position - The index to set the pointer to
     */
    setPointer(position) {
        if (position >= 0 && position < this.bins.length) {
            this.currentPointer = position;
            console.log(`Bin pointer set to: ${this.bins[this.currentPointer]}`);
        }
    }

    /**
     * Count items in a specific bin
     * @param {string} binName - The bin identifier to count
     * @param {Object} inventory - The inventory object to search
     * @returns {number} Number of items in the bin
     */
    countItemsInBin(binName, inventory) {
        let count = 0;

        // Iterate through inventory and count items in specified bin
        for (const details of Object.values(inventory)) {
            if (details.bin === binName) {
                count++;
            }
        }

        return count;
    }

    /**
     * Get distribution of items across all bins
     * @param {Object} inventory - The inventory object to analyze
     * @returns {Object} Object with bin names as keys and counts as values
     */
    getBinDistribution(inventory) {
        const distribution = {};

        // Initialize all bins with zero count
        this.bins.forEach(bin => {
            distribution[bin] = 0;
        });

        // Count items in each bin
        for (const details of Object.values(inventory)) {
            if (distribution.hasOwnProperty(details.bin)) {
                distribution[details.bin]++;
            }
        }

        console.log('Bin distribution:', distribution);

        return distribution;
    }

    /**
     * Get items located in a specific bin
     * @param {string} binName - The bin to search
     * @param {Object} inventory - The inventory object to search
     * @returns {Array} Array of item names in the specified bin
     */
    getItemsInBin(binName, inventory) {
        const items = [];

        for (const [name, details] of Object.entries(inventory)) {
            if (details.bin === binName) {
                items.push(name);
            }
        }

        return items;
    }

    /**
     * Check if bin capacity is balanced
     * @param {Object} inventory - The inventory object to analyze
     * @returns {Object} Analysis result with balance status and recommendations
     */
    checkBalance(inventory) {
        const distribution = this.getBinDistribution(inventory);
        const counts = Object.values(distribution);

        // Calculate statistics
        const max = Math.max(...counts);
        const min = Math.min(...counts);
        const average = counts.reduce((a, b) => a + b, 0) / counts.length;

        // Determine if balanced (difference between max and min is <= 2)
        const isBalanced = (max - min) <= 2;

        const analysis = {
            isBalanced,
            max,
            min,
            average: average.toFixed(2),
            distribution,
            recommendation: isBalanced
                ? 'Bins are well balanced'
                : 'Consider redistributing items for better balance'
        };

        console.log('Balance check:', analysis);

        return analysis;
    }

    /**
     * Record an inventory action in history
     * @param {string} action - The action type (add, delete, update)
     * @param {string} itemName - The item involved
     * @param {Object} details - Additional details about the action
     */
    logAction(action, itemName, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action,
            itemName,
            details
        };

        this.history.push(logEntry);

        // Keep only last 100 entries to prevent memory issues
        if (this.history.length > 100) {
            this.history.shift();
        }

        console.log(`Action logged: ${action} - ${itemName}`);
    }

    /**
     * Get the action history
     * @param {number} limit - Maximum number of entries to return
     * @returns {Array} Array of history entries
     */
    getHistory(limit = 10) {
        return this.history.slice(-limit).reverse();
    }

    /**
     * Clear the action history
     */
    clearHistory() {
        this.history = [];
        console.log('History cleared');
    }

    /**
     * Find the least used bin for optimization
     * @param {Object} inventory - The inventory object to analyze
     * @returns {string} The bin name with the least items
     */
    findLeastUsedBin(inventory) {
        const distribution = this.getBinDistribution(inventory);

        let leastUsedBin = this.bins[0];
        let minCount = distribution[leastUsedBin];

        // Find bin with minimum items
        for (const bin of this.bins) {
            if (distribution[bin] < minCount) {
                minCount = distribution[bin];
                leastUsedBin = bin;
            }
        }

        console.log(`Least used bin: ${leastUsedBin} with ${minCount} items`);

        return leastUsedBin;
    }

    /**
     * Generate a summary report of inventory tracking
     * @param {Object} inventory - The inventory object to analyze
     * @returns {Object} Comprehensive tracking report
     */
    generateReport(inventory) {
        const totalItems = Object.keys(inventory).length;
        const distribution = this.getBinDistribution(inventory);
        const balance = this.checkBalance(inventory);
        const recentHistory = this.getHistory(5);

        const report = {
            timestamp: new Date().toISOString(),
            totalItems,
            distribution,
            balance,
            currentBin: this.getNextBin(),
            recentActions: recentHistory,
            binsAvailable: this.bins.length
        };

        console.log('Tracking report generated');

        return report;
    }
}

// Create a global instance of InventoryTracker
const inventoryTracker = new InventoryTracker();

console.log('inventory_tracker.js loaded successfully');

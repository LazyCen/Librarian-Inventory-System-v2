/**
 * Reports Component
 * Handles generation and display of various inventory reports
 * Provides analytics and insights about inventory data
 */

/**
 * ReportGenerator class creates various types of reports
 */
class ReportGenerator {
    constructor() {
        this.reportTypes = ['summary', 'detailed', 'bins', 'tags'];
        console.log('ReportGenerator initialized');
    }

    /**
     * Generate a summary report of the entire inventory
     * @param {Object} inventory - The inventory object to analyze
     * @returns {Object} Summary report with key metrics
     */
    generateSummaryReport(inventory) {
        const items = Object.entries(inventory);
        const totalItems = items.length;

        // Count total tags
        let totalTags = 0;
        let uniqueTags = new Set();

        items.forEach(([name, details]) => {
            totalTags += details.tags.length;
            details.tags.forEach(tag => uniqueTags.add(tag));
        });

        const report = {
            type: 'summary',
            generatedAt: new Date().toISOString(),
            metrics: {
                totalItems,
                totalTags,
                uniqueTags: uniqueTags.size,
                averageTagsPerItem: totalItems > 0 ? (totalTags / totalItems).toFixed(2) : 0,
                itemsWithoutTags: items.filter(([n, d]) => d.tags.length === 0).length
            }
        };

        console.log('Summary report generated:', report.metrics);

        return report;
    }

    /**
     * Generate a detailed report with all item information
     * @param {Object} inventory - The inventory object to analyze
     * @returns {Object} Detailed report with full item listings
     */
    generateDetailedReport(inventory) {
        const items = Object.entries(inventory);

        // Sort items alphabetically by name
        items.sort((a, b) => a[0].localeCompare(b[0]));

        const itemDetails = items.map(([name, details]) => ({
            name,
            bin: details.bin,
            tags: details.tags,
            tagCount: details.tags.length
        }));

        const report = {
            type: 'detailed',
            generatedAt: new Date().toISOString(),
            totalItems: items.length,
            items: itemDetails
        };

        console.log(`Detailed report generated with ${items.length} items`);

        return report;
    }

    /**
     * Generate a bin utilization report
     * @param {Object} inventory - The inventory object to analyze
     * @param {Array} bins - Array of bin names
     * @returns {Object} Bin utilization report
     */
    generateBinReport(inventory, bins) {
        const binData = {};

        // Initialize bins
        bins.forEach(bin => {
            binData[bin] = {
                itemCount: 0,
                items: [],
                utilizationPercentage: 0
            };
        });

        // Count items per bin
        Object.entries(inventory).forEach(([name, details]) => {
            if (binData[details.bin]) {
                binData[details.bin].itemCount++;
                binData[details.bin].items.push(name);
            }
        });

        // Calculate utilization percentages
        const totalItems = Object.keys(inventory).length;

        Object.keys(binData).forEach(bin => {
            binData[bin].utilizationPercentage = totalItems > 0
                ? ((binData[bin].itemCount / totalItems) * 100).toFixed(1)
                : 0;
        });

        // Find most and least used bins
        const sortedBins = Object.entries(binData).sort((a, b) => b[1].itemCount - a[1].itemCount);

        const report = {
            type: 'bins',
            generatedAt: new Date().toISOString(),
            totalBins: bins.length,
            binData,
            mostUsed: sortedBins[0] ? sortedBins[0][0] : null,
            leastUsed: sortedBins[sortedBins.length - 1] ? sortedBins[sortedBins.length - 1][0] : null
        };

        console.log('Bin report generated:', report);

        return report;
    }

    /**
     * Generate a tag analysis report
     * @param {Object} inventory - The inventory object to analyze
     * @returns {Object} Tag analysis report
     */
    generateTagReport(inventory) {
        const tagFrequency = {};
        const taggedItems = {};

        // Count tag frequencies
        Object.entries(inventory).forEach(([name, details]) => {
            details.tags.forEach(tag => {
                // Count frequency
                tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;

                // Track which items have this tag
                if (!taggedItems[tag]) {
                    taggedItems[tag] = [];
                }
                taggedItems[tag].push(name);
            });
        });

        // Sort tags by frequency
        const sortedTags = Object.entries(tagFrequency)
            .sort((a, b) => b[1] - a[1])
            .map(([tag, count]) => ({
                tag,
                count,
                percentage: ((count / Object.keys(inventory).length) * 100).toFixed(1),
                items: taggedItems[tag]
            }));

        const report = {
            type: 'tags',
            generatedAt: new Date().toISOString(),
            totalUniqueTags: sortedTags.length,
            tagAnalysis: sortedTags,
            mostCommonTag: sortedTags[0] || null,
            leastCommonTag: sortedTags[sortedTags.length - 1] || null
        };

        console.log('Tag report generated with', sortedTags.length, 'unique tags');

        return report;
    }

    /**
     * Format a report for display in the console
     * @param {Object} report - The report object to format
     * @returns {string} Formatted report string
     */
    formatReportForConsole(report) {
        let output = '\n' + '='.repeat(60) + '\n';
        output += `REPORT: ${report.type.toUpperCase()}\n`;
        output += `Generated: ${new Date(report.generatedAt).toLocaleString()}\n`;
        output += '='.repeat(60) + '\n\n';

        if (report.type === 'summary') {
            output += `Total Items: ${report.metrics.totalItems}\n`;
            output += `Unique Tags: ${report.metrics.uniqueTags}\n`;
            output += `Average Tags per Item: ${report.metrics.averageTagsPerItem}\n`;
            output += `Items without Tags: ${report.metrics.itemsWithoutTags}\n`;
        }

        output += '\n' + '='.repeat(60) + '\n';

        return output;
    }

    /**
     * Export report as downloadable JSON file
     * @param {Object} report - The report to export
     * @param {string} filename - Name for the exported file
     */
    exportReportAsJSON(report, filename = 'inventory_report.json') {
        const dataStr = JSON.stringify(report, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        // Create download link
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;

        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`Report exported as ${filename}`);
    }

    /**
     * Export report as CSV format
     * @param {Object} report - The report to export
     * @param {string} filename - Name for the exported file
     */
    exportReportAsCSV(report, filename = 'inventory_report.csv') {
        let csvContent = '';

        if (report.type === 'detailed' && report.items) {
            // Header
            csvContent = 'Item Name,Bin,Tags,Tag Count\n';

            // Data rows
            report.items.forEach(item => {
                csvContent += `"${item.name}","${item.bin}","${item.tags.join(', ')}",${item.tagCount}\n`;
            });
        }

        // Create download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`Report exported as ${filename}`);
    }

    /**
     * Print report to console with formatting
     * @param {Object} report - The report to print
     */
    printReport(report) {
        const formatted = this.formatReportForConsole(report);
        console.log(formatted);
    }

    /**
     * Generate all available reports
     * @param {Object} inventory - The inventory object to analyze
     * @param {Array} bins - Array of bin names
     * @returns {Object} Object containing all report types
     */
    generateAllReports(inventory, bins) {
        console.log('Generating all reports...');

        const reports = {
            summary: this.generateSummaryReport(inventory),
            detailed: this.generateDetailedReport(inventory),
            bins: this.generateBinReport(inventory, bins),
            tags: this.generateTagReport(inventory)
        };

        console.log('All reports generated successfully');

        return reports;
    }
}

// Create a global instance of ReportGenerator
const reportGenerator = new ReportGenerator();

console.log('reports.js loaded successfully');

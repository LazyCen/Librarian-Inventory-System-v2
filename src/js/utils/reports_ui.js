/**
 * Reports UI Utility
 * Connects the UI events to the ReportGenerator logic
 */

/**
 * Handle triggering a summary report display in the console and via message
 */
function handleShowSummaryReport() {
    if (typeof reportGenerator === 'undefined') {
        console.error('ReportGenerator not found. Make sure reports.js is loaded.');
        return;
    }

    const report = reportGenerator.generateSummaryReport(inventory);
    reportGenerator.printReport(report);
    
    // Show a summary message to the user
    const metrics = report.metrics;
    const msg = `Analytics Summary: ${metrics.totalItems} Titles, ${metrics.uniqueTags} Categories. Detailed report printed to console.`;
    
    if (typeof showMessage === 'function') {
        showMessage(msg, 'success', 5000);
    } else {
        alert(msg);
    }
}

/**
 * Handle downloading the full inventory report as JSON
 */
function handleDownloadReport() {
    if (typeof reportGenerator === 'undefined') {
        console.error('ReportGenerator not found. Make sure reports.js is loaded.');
        return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `librarian_report_${timestamp}.json`;
    
    // Generate all reports and export the summary/detailed bundle
    const allReports = reportGenerator.generateAllReports(inventory, bins);
    reportGenerator.exportReportAsJSON(allReports, filename);
    
    if (typeof showMessage === 'function') {
        showMessage(`Report generated and downloading: ${filename}`, 'info');
    }
}

console.log('Reports UI utility loaded');

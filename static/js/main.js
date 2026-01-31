// ==========================================
// FinSight Premium - Frontend Logic
// Supports PDF and Image upload with preview
// ==========================================

let trendChart = null;
let categoryChart = null;
let pendingFiles = [];  // Files waiting to be analyzed
let currentReportData = null;  // Store report data for export
let currentReportMarkdown = null;  // Store raw markdown report

// Fixed categories with assigned colors
const CATEGORY_CONFIG = {
    "Food & Dining": { color: "rgb(99, 102, 241)", order: 0 },
    "Transportation": { color: "rgb(245, 158, 11)", order: 1 },
    "Shopping": { color: "rgb(236, 72, 153)", order: 2 },
    "Entertainment": { color: "rgb(139, 92, 246)", order: 3 },
    "Utilities": { color: "rgb(239, 68, 68)", order: 4 },
    "Healthcare": { color: "rgb(16, 185, 129)", order: 5 },
    "Education": { color: "rgb(59, 130, 246)", order: 6 },
    "Travel": { color: "rgb(20, 184, 166)", order: 7 },
    "Transfer": { color: "rgb(107, 114, 128)", order: 8 },
    "Other": { color: "rgb(156, 163, 175)", order: 9 }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeUpload();
});

// === Initialize Upload === //
function initializeUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadBox = document.getElementById('uploadBox');

    // File selection event
    fileInput.addEventListener('change', handleFileSelect);

    // Click to open file dialog
    uploadBox.addEventListener('click', function(e) {
        if (e.target.tagName !== 'BUTTON') {
            fileInput.click();
        }
    });

    // Setup drag and drop
    setupDragDrop(uploadBox);
}

// === Setup Drag and Drop === //
function setupDragDrop(area) {
    if (!area) return;

    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.style.borderColor = '#6366f1';
        area.style.background = 'rgba(99, 102, 241, 0.02)';
    });

    area.addEventListener('dragleave', (e) => {
        e.preventDefault();
        area.style.borderColor = '#d1d5db';
        area.style.background = '#ffffff';
    });

    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.style.borderColor = '#d1d5db';
        area.style.background = '#ffffff';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            addFilesToList(files);
        }
    });
}

// === Handle File Selection === //
function handleFileSelect() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;

    if (files.length > 0) {
        addFilesToList(files);
    }

    // Reset input so same file can be selected again
    fileInput.value = '';
}

// === Add Files to Pending List === //
function addFilesToList(files) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!isValidFile(file)) continue;

        // Check for duplicates
        const isDuplicate = pendingFiles.some(f => f.name === file.name && f.size === file.size);
        if (isDuplicate) continue;

        pendingFiles.push(file);
    }

    if (pendingFiles.length > 0) {
        showPreviewSection();
    }
}

// === Check if file is valid === //
function isValidFile(file) {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

    if (!validTypes.includes(file.type)) {
        showStatus('Please upload a PDF or image file (JPG, PNG)', 'error');
        return false;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showStatus('File too large. Please select a file under 10MB.', 'error');
        return false;
    }

    return true;
}

// === Show Preview Section === //
function showPreviewSection() {
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('previewSection').style.display = 'flex';

    renderFileList();
}

// === Render File List === //
function renderFileList() {
    const fileListEl = document.getElementById('fileList');
    fileListEl.innerHTML = '';

    pendingFiles.forEach((file, index) => {
        const isPDF = file.type === 'application/pdf';
        const fileSize = formatFileSize(file.size);

        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';

        if (isPDF) {
            fileItem.innerHTML = `
                <div class="file-icon pdf">
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0H4z"/>
                        <path d="M9.5 0v4a.5.5 0 0 0 .5.5h4"/>
                    </svg>
                </div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
                <button class="file-remove" onclick="removeFileFromList(${index})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            `;
        } else {
            // For images, create a thumbnail preview
            const reader = new FileReader();
            reader.onload = function(e) {
                const thumbImg = fileItem.querySelector('.file-preview-thumb');
                if (thumbImg) {
                    thumbImg.src = e.target.result;
                }
            };
            reader.readAsDataURL(file);

            fileItem.innerHTML = `
                <img class="file-preview-thumb" src="" alt="Preview">
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
                <button class="file-remove" onclick="removeFileFromList(${index})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            `;
        }

        fileListEl.appendChild(fileItem);
    });
}

// === Remove File from List === //
function removeFileFromList(index) {
    pendingFiles.splice(index, 1);

    if (pendingFiles.length === 0) {
        cancelUpload();
    } else {
        renderFileList();
    }
}

// === Format File Size === //
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// === Add More Files === //
function addMoreFiles() {
    document.getElementById('fileInput').click();
}

// === Cancel Upload === //
function cancelUpload() {
    pendingFiles = [];
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'flex';
    showStatus('', '');
}

// === Start Analysis === //
async function startAnalysis() {
    if (pendingFiles.length === 0) return;

    // For now, analyze only the first file
    // Future: could combine multiple files
    const file = pendingFiles[0];
    const type = file.type === 'application/pdf' ? 'pdf' : 'image';

    // Hide preview, show loading
    document.getElementById('previewSection').style.display = 'none';
    showLoading(true);

    await uploadFile(file, type);
}

// === Switch to Screenshot Upload (from encrypted warning) === //
function switchToScreenshot() {
    document.getElementById('encryptedWarning').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'flex';
    showStatus('Please upload a screenshot of your bank statement', 'info');
}

// === Show Status Message === //
function showStatus(message, type) {
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.textContent = message;
    statusDiv.className = 'upload-status';
    if (type) {
        statusDiv.classList.add(type);
    }
}

// === Upload File === //
async function uploadFile(file, type) {
    const formData = new FormData();

    if (type === 'pdf') {
        formData.append('pdf', file);
    } else {
        formData.append('image', file);
    }
    formData.append('type', type);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        // Hide loading state
        showLoading(false);

        if (response.ok) {
            // Store data for export
            currentReportData = data;
            currentReportMarkdown = data.report;

            // Clear pending files
            pendingFiles = [];

            // Render data
            renderData(data);
        } else {
            // Check if PDF is encrypted
            if (data.error && (data.error.includes('encrypt') || data.error.includes('Encrypt'))) {
                showEncryptedWarning();
            } else {
                alert(data.error || 'Analysis failed. Please try again.');
                resetUpload();
            }
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed. Please try again.');
        showLoading(false);
        resetUpload();
    }
}

// === Show PDF Encrypted Warning === //
function showEncryptedWarning() {
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('encryptedWarning').style.display = 'flex';
}

// === Show/Hide Loading State === //
function showLoading(show) {
    document.getElementById('loadingSection').style.display = show ? 'flex' : 'none';
}

// === Reset Upload Area === //
function resetUpload() {
    pendingFiles = [];
    currentReportData = null;
    currentReportMarkdown = null;

    document.getElementById('uploadSection').style.display = 'flex';
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('encryptedWarning').style.display = 'none';
    document.getElementById('dataSection').style.display = 'none';
    document.getElementById('fileInput').value = '';
    document.getElementById('uploadStatus').textContent = '';
}

// === Render All Data === //
function renderData(data) {
    // Show data section
    document.getElementById('dataSection').style.display = 'block';

    // Render summary cards
    renderSummary(data.summary);

    // Render transaction table
    renderTransactionTable(data.transactions);

    // Render charts
    renderCharts(data);

    // Render AI report
    renderAIReport(data.report);
}

// === Render Summary Cards === //
function renderSummary(summary) {
    document.getElementById('startBalance').textContent = formatCurrency(summary.start_balance);
    document.getElementById('endBalance').textContent = formatCurrency(summary.end_balance);
    document.getElementById('totalIncome').textContent = formatCurrency(summary.total_income);
    document.getElementById('totalExpense').textContent = formatCurrency(summary.total_expense);
}

// === Render Transaction Table === //
function renderTransactionTable(transactions) {
    const tbody = document.getElementById('transactionTableBody');
    tbody.innerHTML = '';

    transactions.forEach(transaction => {
        const row = document.createElement('tr');

        const amountClass = transaction.amount > 0 ? 'amount-positive' : 'amount-negative';
        const amountDisplay = formatAmountWithSign(transaction.amount);
        const category = transaction.category || 'Other';

        row.innerHTML = `
            <td>${transaction.date}</td>
            <td>${transaction.description}</td>
            <td><span class="category-badge" data-category="${category}">${category}</span></td>
            <td class="text-end ${amountClass}">${amountDisplay}</td>
            <td class="text-end">${formatCurrency(transaction.balance)}</td>
        `;

        tbody.appendChild(row);
    });
}

// === Render Charts === //
function renderCharts(data) {
    renderTrendChart(data.transactions);
    renderCategoryChart(data.categories);
}

// === Render Balance Trend Chart === //
function renderTrendChart(transactions) {
    const ctx = document.getElementById('trendChart').getContext('2d');

    // Destroy old chart
    if (trendChart) {
        trendChart.destroy();
    }

    // Extract date and balance data
    const labels = transactions.map(t => t.date);
    const balances = transactions.map(t => t.balance);

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Account Balance',
                data: balances,
                borderColor: 'rgb(99, 102, 241)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2.5,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: 'rgb(99, 102, 241)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12,
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: {
                        size: 13
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return 'Balance: $' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// === Render Category Pie Chart === //
function renderCategoryChart(categories) {
    const ctx = document.getElementById('categoryChart').getContext('2d');

    // Destroy old chart
    if (categoryChart) {
        categoryChart.destroy();
    }

    // Filter out categories with 0 value and sort by fixed order
    const filteredCategories = Object.entries(categories)
        .filter(([_, value]) => value > 0)
        .sort((a, b) => {
            const orderA = CATEGORY_CONFIG[a[0]]?.order ?? 99;
            const orderB = CATEGORY_CONFIG[b[0]]?.order ?? 99;
            return orderA - orderB;
        });

    const labels = filteredCategories.map(([key, _]) => key);
    const values = filteredCategories.map(([_, value]) => value);
    const colors = filteredCategories.map(([key, _]) =>
        CATEGORY_CONFIG[key]?.color || 'rgb(156, 163, 175)'
    );

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12,
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return label + ': $' + value.toFixed(2) + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

// === Render AI Report === //
function renderAIReport(report) {
    const reportDiv = document.getElementById('aiReport');

    // Convert Markdown report to HTML
    const htmlReport = convertMarkdownToHTML(report);
    reportDiv.innerHTML = htmlReport;
}

// === Export Report === //
function exportReport() {
    if (!currentReportData || !currentReportMarkdown) {
        alert('No report available to export.');
        return;
    }

    // 检查html2pdf库是否加载
    if (typeof html2pdf === 'undefined') {
        alert('PDF library not loaded. Please refresh the page and try again.');
        console.error('html2pdf is not defined');
        return;
    }

    // Generate PDF report
    exportToPDF();
}

// === Export to PDF === //
function exportToPDF() {
    console.log('Starting PDF export...');
    console.log('Report data:', currentReportData);

    // 创建PDF内容
    const htmlContent = generatePDFHTML();
    console.log('Generated HTML length:', htmlContent.length);

    // 打开新窗口显示报告，用户可以使用浏览器打印功能保存为PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow pop-ups to export PDF');
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>FinSight Report</title>
            <style>
                body {
                    font-family: Arial, Helvetica, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: white;
                }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="background:#6366f1;color:white;padding:15px;margin-bottom:20px;border-radius:8px;text-align:center;">
                <strong>Press Ctrl+P (or Cmd+P on Mac) to save as PDF</strong>
                <br><small>Select "Save as PDF" as the destination</small>
            </div>
            ${htmlContent}
        </body>
        </html>
    `);
    printWindow.document.close();
}

// === Generate HTML for PDF === //
function generatePDFHTML() {
    const data = currentReportData;
    const summary = data.summary;
    const transactions = data.transactions;
    const categories = data.categories;

    // Calculate total expense for percentages
    const totalExpense = Object.values(categories).reduce((a, b) => a + b, 0);

    // Generate category rows
    let categoryRows = '';
    Object.entries(categories)
        .filter(([_, value]) => value > 0)
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, amount]) => {
            const percentage = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : '0.0';
            categoryRows += `<tr><td>${category}</td><td>$${amount.toFixed(2)}</td><td>${percentage}%</td></tr>`;
        });

    // Generate transaction rows
    let transactionRows = '';
    transactions.forEach(t => {
        const amountStyle = t.amount > 0 ? 'color: #10b981; font-weight: 600;' : 'color: #ef4444; font-weight: 600;';
        const amount = t.amount > 0 ? `+$${t.amount.toFixed(2)}` : `-$${Math.abs(t.amount).toFixed(2)}`;
        transactionRows += `
            <tr>
                <td>${t.date}</td>
                <td>${t.description}</td>
                <td>${t.category}</td>
                <td style="${amountStyle}">${amount}</td>
                <td>$${t.balance.toFixed(2)}</td>
            </tr>`;
    });

    // Use inline styles for better html2canvas compatibility
    return `
        <div style="font-family: Arial, Helvetica, sans-serif; color: #1f2937; background: white; width: 100%;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e5e7eb;">
                <div style="font-size: 24px; font-weight: bold; color: #6366f1; margin-bottom: 5px;">FinSight Premium</div>
                <div style="color: #6b7280; font-size: 12px;">Financial Analysis Report - ${new Date().toLocaleDateString()}</div>
            </div>

            <!-- Financial Summary -->
            <div style="margin-bottom: 25px;">
                <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">Financial Summary</div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <tr>
                        <td style="width: 50%; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb;">
                            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; margin-bottom: 5px;">Opening Balance</div>
                            <div style="font-size: 18px; font-weight: bold; color: #1f2937;">$${summary.start_balance.toFixed(2)}</div>
                        </td>
                        <td style="width: 50%; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb;">
                            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; margin-bottom: 5px;">Closing Balance</div>
                            <div style="font-size: 18px; font-weight: bold; color: #1f2937;">$${summary.end_balance.toFixed(2)}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="width: 50%; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb;">
                            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; margin-bottom: 5px;">Total Income</div>
                            <div style="font-size: 18px; font-weight: bold; color: #10b981;">+$${summary.total_income.toFixed(2)}</div>
                        </td>
                        <td style="width: 50%; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb;">
                            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; margin-bottom: 5px;">Total Expense</div>
                            <div style="font-size: 18px; font-weight: bold; color: #ef4444;">-$${summary.total_expense.toFixed(2)}</div>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Spending by Category -->
            <div style="margin-bottom: 25px;">
                <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">Spending by Category</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background: #f3f4f6;">
                            <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Category</th>
                            <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Amount</th>
                            <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${categoryRows.replace(/<td>/g, '<td style="padding: 8px; border-bottom: 1px solid #f3f4f6; color: #4b5563;">')}
                    </tbody>
                </table>
            </div>

            <!-- Transaction Details -->
            <div style="margin-bottom: 25px;">
                <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">Transaction Details</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    <thead>
                        <tr style="background: #f3f4f6;">
                            <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Date</th>
                            <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Description</th>
                            <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Category</th>
                            <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Amount</th>
                            <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactionRows.replace(/<td>/g, '<td style="padding: 8px; border-bottom: 1px solid #f3f4f6; color: #4b5563;">')}
                    </tbody>
                </table>
            </div>

            <!-- AI Analysis -->
            <div style="margin-bottom: 25px;">
                <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">AI Analysis</div>
                <div style="background: #f9fafb; padding: 15px; border: 1px solid #e5e7eb; font-size: 12px; line-height: 1.6;">
                    ${convertMarkdownToHTML(currentReportMarkdown)}
                </div>
            </div>

            <!-- Footer -->
            <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #9ca3af;">
                Generated by FinSight Premium | ${new Date().toLocaleString()}
            </div>
        </div>
    `;
}

// === Generate Full Markdown Report === //
function generateFullMarkdownReport() {
    const data = currentReportData;
    const summary = data.summary;
    const transactions = data.transactions;
    const categories = data.categories;

    let report = `# FinSight Premium - Financial Analysis Report\n\n`;
    report += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    report += `---\n\n`;

    // Summary Section
    report += `## Financial Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Opening Balance | $${summary.start_balance.toFixed(2)} |\n`;
    report += `| Closing Balance | $${summary.end_balance.toFixed(2)} |\n`;
    report += `| Total Income | $${summary.total_income.toFixed(2)} |\n`;
    report += `| Total Expense | $${summary.total_expense.toFixed(2)} |\n`;
    report += `| Net Change | $${(summary.end_balance - summary.start_balance).toFixed(2)} |\n\n`;

    // Category Breakdown
    report += `## Spending by Category\n\n`;
    report += `| Category | Amount | Percentage |\n`;
    report += `|----------|--------|------------|\n`;

    const totalExpense = Object.values(categories).reduce((a, b) => a + b, 0);
    Object.entries(categories)
        .filter(([_, value]) => value > 0)
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, amount]) => {
            const percentage = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : '0.0';
            report += `| ${category} | $${amount.toFixed(2)} | ${percentage}% |\n`;
        });

    report += `\n`;

    // Transaction Details
    report += `## Transaction Details\n\n`;
    report += `| Date | Description | Category | Amount | Balance |\n`;
    report += `|------|-------------|----------|--------|--------|\n`;

    transactions.forEach(t => {
        const amount = t.amount > 0 ? `+$${t.amount.toFixed(2)}` : `-$${Math.abs(t.amount).toFixed(2)}`;
        report += `| ${t.date} | ${t.description} | ${t.category} | ${amount} | $${t.balance.toFixed(2)} |\n`;
    });

    report += `\n`;

    // AI Analysis
    report += `## AI Analysis\n\n`;
    report += currentReportMarkdown;

    report += `\n\n---\n\n`;
    report += `*Report generated by FinSight Premium*\n`;

    return report;
}

// === Simple Markdown to HTML Converter === //
function convertMarkdownToHTML(markdown) {
    if (!markdown) return '<p>No analysis report available.</p>';

    let html = markdown;

    // Convert headers
    html = html.replace(/### (.*?)$/gm, '<h4>$1</h4>');
    html = html.replace(/## (.*?)$/gm, '<h3>$1</h3>');

    // Convert bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert lists
    html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^(\d+)\. (.*?)$/gm, '<li>$2</li>');

    // Wrap consecutive li elements in ul
    html = html.replace(/(<li>.*?<\/li>\n?)+/g, '<ul>$&</ul>');

    // Convert paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up extra p tags
    html = html.replace(/<p><h/g, '<h');
    html = html.replace(/<\/h3><\/p>/g, '</h3>');
    html = html.replace(/<\/h4><\/p>/g, '</h4>');
    html = html.replace(/<p><ul>/g, '<ul>');
    html = html.replace(/<\/ul><\/p>/g, '</ul>');
    html = html.replace(/<p><\/p>/g, '');

    return html;
}

// === Format Currency (absolute value) === //
function formatCurrency(amount) {
    return '$' + Math.abs(amount).toFixed(2);
}

// === Format Amount with +/- Sign === //
function formatAmountWithSign(amount) {
    if (amount > 0) {
        return '+$' + amount.toFixed(2);
    } else if (amount < 0) {
        return '-$' + Math.abs(amount).toFixed(2);
    } else {
        return '$0.00';
    }
}

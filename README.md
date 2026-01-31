# FinSight Premium

**Intelligent Bank Statement Analysis System**

A web-based financial analysis tool that leverages AI to parse bank statements and generate actionable insights. Upload your bank statement (PDF or screenshot), and get instant categorized transaction analysis, spending visualizations, and personalized financial reports.

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-3.0-green.svg)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-purple.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## Table of Contents

- [Use Cases](#use-cases)
- [Features](#features)
- [AI Models & API](#ai-models--api)
- [System Architecture](#system-architecture)
- [Technical Implementation](#technical-implementation)
- [Security & Privacy](#security--privacy)
- [Known Limitations](#known-limitations)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)

---

## Use Cases

### Personal Finance Management
- **Monthly Expense Tracking**: Upload your monthly bank statement to visualize where your money goes
- **Spending Pattern Analysis**: Identify your top spending categories and trends
- **Budget Planning**: Use AI-generated insights to optimize your financial habits

### Small Business Accounting
- **Quick Transaction Categorization**: Automatically categorize business expenses
- **Financial Reporting**: Generate professional reports for bookkeeping

### Financial Literacy Education
- **Statement Understanding**: Help users understand their bank statements
- **Visual Learning**: Interactive charts make financial data accessible

---

## Features

### Core Functionality

| Feature | Description |
|---------|-------------|
| **PDF Parsing** | Extract transaction data from PDF bank statements using pdfplumber |
| **Image/Screenshot Analysis** | Parse bank statement screenshots using GPT-4o Vision API |
| **Smart Categorization** | Automatically classify transactions into 11 fixed categories |
| **Balance Tracking** | Track opening/closing balance and calculate income/expense totals |
| **Interactive Charts** | Visualize spending trends and category breakdown with Chart.js |
| **AI Financial Report** | Generate personalized financial analysis and suggestions |
| **PDF Export** | Export complete financial report for offline use |

### Transaction Categories

The system uses 11 fixed categories for consistent analysis:

| Category | Examples |
|----------|----------|
| Food & Dining | Restaurants, groceries, food delivery, cafes |
| Transportation | Gas, public transit, taxi, uber, parking |
| Shopping | Retail, online shopping, clothing, electronics |
| Entertainment | Movies, games, streaming services, hobbies |
| Utilities | Electricity, water, internet, phone bills |
| Healthcare | Medical, pharmacy, dental, insurance |
| Education | Tuition, books, courses, training |
| Travel | Hotels, flights, vacation expenses |
| Transfer | Bank transfers, money sent to others |
| Income | Salary, refunds, deposits received |
| Other | Anything that doesn't fit above |

---

## AI Models & API

This project uses **OpenAI API** for intelligent document parsing and analysis.

### API Key Required

You need an OpenAI API key to run this application. Get one at: https://platform.openai.com/api-keys

```bash
# .env configuration
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

### Models Used

| Task | Model | Why This Model |
|------|-------|----------------|
| **Image/Screenshot Parsing** | `gpt-4o` | Vision capability for OCR and image understanding |
| **PDF Text Parsing** | `gpt-4o-mini` | Cost-effective for structured text extraction |
| **Report Generation** | `gpt-4o-mini` | Fast and affordable for text generation |

### API Usage Details

| Operation | Model | Max Tokens | Temperature |
|-----------|-------|------------|-------------|
| Image Analysis | gpt-4o | 8,192 | 0 (deterministic) |
| PDF Text Parsing | gpt-4o-mini | 16,384 | 0 (deterministic) |
| Report Generation | gpt-4o-mini | default | 0.7 (creative) |

### Estimated Costs

| Operation | Approximate Cost |
|-----------|------------------|
| Single statement (PDF) | ~$0.01 - $0.03 |
| Single statement (Image) | ~$0.02 - $0.05 |
| Report generation | ~$0.005 |

*Costs vary based on statement length and complexity. Prices based on OpenAI's 2024 pricing.*

---

## System Architecture

```
+------------------------------------------------------------------+
|                         Frontend (Browser)                        |
|  +---------------+  +---------------+  +-----------------------+  |
|  |  File Upload  |  |    Charts     |  |    Report Display     |  |
|  |  (Drag/Drop)  |  |  (Chart.js)   |  |    (AI Analysis)      |  |
|  +-------+-------+  +---------------+  +-----------------------+  |
|          |                                                        |
+----------|---------------------------------------------------------+
           | HTTP POST /upload
           v
+------------------------------------------------------------------+
|                      Flask Backend (Python)                       |
|  +---------------+  +---------------+  +-----------------------+  |
|  |  PDF Parser   |  | Image Parser  |  |   Report Generator    |  |
|  | (pdfplumber)  |  |   (GPT-4o)    |  |    (GPT-4o-mini)      |  |
|  +-------+-------+  +-------+-------+  +-----------+-----------+  |
|          |                  |                      |              |
|          +--------+---------+                      |              |
|                   v                                |              |
|          +---------------+                         |              |
|          |  OpenAI API   |<------------------------+              |
|          | (Text/Vision) |                                        |
|          +---------------+                                        |
+------------------------------------------------------------------+
           |
           |  ** No Database - Data processed in memory only **
           v
+------------------------------------------------------------------+
|                      JSON Response to Client                      |
|         { summary, transactions[], categories{}, report }         |
+------------------------------------------------------------------+
```

---

## Technical Implementation

### 1. File Upload & Preview (`main.js`)

```javascript
// Drag-and-drop file handling with preview before analysis
pendingFiles = [];  // Files waiting to be analyzed

function addFilesToList(files) {
    // Validate file type (PDF, JPG, PNG, WebP)
    // Check file size (max 10MB)
    // Show preview section for user confirmation
}
```

**Key Points:**
- Supports multiple file selection
- File validation before upload
- Preview allows users to add/remove files before analysis
- Prevents accidental uploads

### 2. PDF Text Extraction (`app_with_api.py`)

```python
def extract_text_from_pdf(file):
    """Extract text using pdfplumber library"""
    with pdfplumber.open(file) as pdf:
        for page in pdf.pages:
            text += page.extract_text()
    return text
```

**Key Points:**
- Uses `pdfplumber` for reliable text extraction
- Handles multi-page PDFs
- Detects encrypted PDFs and prompts for screenshot upload

### 3. Image Vision Analysis (`app_with_api.py`)

```python
def parse_image_with_vision(file):
    """Use GPT-4o Vision API for screenshot analysis"""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{base64_image}"}}
            ]
        }],
        max_tokens=8192
    )
```

**Key Points:**
- Encodes image to base64 for API transmission
- Uses "high" detail mode for better OCR accuracy
- Structured prompt ensures consistent JSON output

### 4. Transaction Parsing & Categorization

The AI is prompted with strict category definitions:

```python
PARSE_PROMPT_TEMPLATE = """
Categorize each transaction into EXACTLY ONE of these fixed categories:
- "Food & Dining" (restaurants, groceries, food delivery...)
- "Transportation" (gas, public transit, taxi...)
...
Return strict JSON format without any explanatory text.
Amount: expenses as negative numbers, income as positive numbers.
"""
```

**Key Points:**
- Fixed category names ensure consistent frontend display
- Negative amounts = expenses, Positive = income
- AI infers missing data when possible

### 5. Data Visualization (`main.js`)

```javascript
// Balance Trend Chart (Line)
trendChart = new Chart(ctx, {
    type: 'line',
    data: { labels: dates, datasets: [{ data: balances }] }
});

// Category Breakdown (Doughnut)
categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: categories, datasets: [{ data: amounts }] }
});
```

**Key Points:**
- Chart.js for responsive, interactive charts
- Consistent color scheme across categories
- Tooltips show detailed information

### 6. AI Report Generation

```python
REPORT_PROMPT_TEMPLATE = """
Based on the statement data, generate an objective financial analysis:
- Maintain neutral tone, avoid value judgments
- Use "you may consider" instead of "you should"
- Keep report under 300 words
- Output in Markdown format
"""
```

**Key Points:**
- Objective, non-judgmental language
- Actionable but not prescriptive suggestions
- Markdown format for easy rendering

---

## Security & Privacy

### Critical Design Decision: No Database

**We intentionally DO NOT store any user data.**

```
+----------------------------------------------------------+
|              DATA FLOW (Stateless Design)                 |
|                                                           |
|  User Upload -> Process in Memory -> Return Results -> Done
|       |              |                    |               |
|   (Temporary)    (No Storage)        (Deleted)           |
+----------------------------------------------------------+
```

**Rationale:**
- Bank statements contain **highly sensitive financial data**
- Account numbers, transaction history, spending patterns are private
- Data breaches could expose users to identity theft or fraud
- Regulatory compliance (GDPR, financial data protection laws)

**Implementation:**
- Files are processed entirely in memory
- No data written to disk or database
- Session data cleared after response
- No user accounts or login required

### API Key Security

```python
# .env file (NEVER commit to Git)
OPENAI_API_KEY=sk-xxxxx

# .gitignore includes:
.env
```

**Best Practices:**
- API keys stored in `.env` file only
- `.env` excluded from version control
- `.env.example` provided as template (no real keys)

### Data Transmission

- All API calls use HTTPS
- File data transmitted as base64 (not stored server-side)
- OpenAI API data handling policies apply

---

## Known Limitations

### 1. PDF Parsing Constraints

| Limitation | Cause | Workaround |
|------------|-------|------------|
| **Encrypted PDFs** | Password-protected files cannot be read | Upload screenshot instead |
| **Scanned PDFs** | Image-based PDFs have no extractable text | Use Image upload mode |
| **Complex Layouts** | Multi-column or unusual formats may parse incorrectly | Upload screenshot for better accuracy |

### 2. Token & Model Limits

| Constraint | Value | Impact |
|------------|-------|--------|
| **Input Text Limit** | 20,000 characters | Very long statements may be truncated |
| **Output Tokens (PDF)** | 16,384 tokens | ~50-80 transactions per request |
| **Output Tokens (Image)** | 8,192 tokens | ~30-50 transactions per request |
| **Image Size** | 10MB max | Large screenshots may need compression |

**Why These Limits Exist:**
- OpenAI API has context window limits
- Larger requests = higher latency and cost
- Trade-off between completeness and responsiveness

### 3. Categorization Accuracy

| Scenario | Accuracy | Notes |
|----------|----------|-------|
| Common merchants (Uber, Amazon) | High | Well-known names categorized correctly |
| Abbreviated descriptions | Medium | "PYMNT XYZ" may default to "Other" |
| Foreign language | Variable | English works best |
| Vague descriptions | Low | "Transfer" or cryptic codes hard to categorize |

### 4. Currency & Format Support

- **Primary**: USD ($) format
- **Other currencies**: May work but not fully tested
- **Date formats**: AI attempts to normalize various formats
- **Number formats**: Handles comma/period separators

### 5. Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome 90+ | Full |
| Firefox 88+ | Full |
| Safari 14+ | Full |
| Edge 90+ | Full |
| IE 11 | Not supported |

---

## Installation

### Prerequisites

- Python 3.8 or higher
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Setup Steps

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/finsight-premium.git
cd finsight-premium

# 2. Create virtual environment
python -m venv .venv

# 3. Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Configure environment variables
cp .env.example .env
# Edit .env and add your OpenAI API key

# 6. Run the application
python app_with_api.py
```

### Windows Quick Start

Double-click `run.bat` to start the server automatically.

---

## Usage

1. **Open Browser**: Navigate to `http://localhost:5000`

2. **Upload Statement**:
   - Drag and drop PDF or image
   - Or click to browse files

3. **Preview Files**:
   - Review uploaded files
   - Add more or remove files
   - Click "Start Analysis"

4. **View Results**:
   - Financial summary cards
   - Transaction table with categories
   - Balance trend chart
   - Spending category chart
   - AI analysis report

5. **Export Report**:
   - Click "Export PDF" button
   - Use browser print (Ctrl+P) to save as PDF

---

## API Reference

### POST /upload

Upload and analyze a bank statement.

**Request:**
```
Content-Type: multipart/form-data

Fields:
- type: "pdf" | "image"
- pdf: (file) PDF document
- image: (file) Image file (JPG, PNG, WebP)
```

**Response:**
```json
{
  "summary": {
    "start_balance": 2367.20,
    "end_balance": 2239.05,
    "total_income": 500.00,
    "total_expense": 628.15
  },
  "transactions": [
    {
      "date": "2025-01-15",
      "description": "UBER TRIP",
      "amount": -15.50,
      "balance": 2351.70,
      "category": "Transportation"
    }
  ],
  "categories": {
    "Food & Dining": 150.00,
    "Transportation": 75.50
  },
  "report": "## Financial Overview\n..."
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-31T10:30:00",
  "api_configured": true,
  "features": ["pdf", "image"]
}
```

---

## Project Structure

```
finsight-premium/
├── app_with_api.py        # Flask backend, API routes, AI integration
├── requirements.txt       # Python dependencies
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
├── run.bat                # Windows startup script
├── README.md              # This file
├── API_INTEGRATION_GUIDE.md
├── templates/
│   └── index.html         # Main HTML template
└── static/
    ├── css/
    │   └── style.css      # Custom styles
    └── js/
        └── main.js        # Frontend logic
```

---

## License

This project is licensed under the MIT License.

---

## Acknowledgments

- [OpenAI](https://openai.com/) for GPT-4o and GPT-4o-mini APIs
- [Chart.js](https://www.chartjs.org/) for data visualization
- [pdfplumber](https://github.com/jsvine/pdfplumber) for PDF text extraction
- [Bootstrap](https://getbootstrap.com/) for responsive design

---

**Made with love for better financial awareness**

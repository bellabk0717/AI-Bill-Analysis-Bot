# FinSight Premium

**Intelligent Bank Statement Analysis System**

Upload your bank statement → AI extracts transactions → Get spending insights & charts

---

## What It Does

1. **Upload** a bank statement (PDF or image screenshot)
2. **AI analyzes** and categorizes all transactions automatically
3. **View** interactive charts showing your spending breakdown
4. **Read** an AI-generated financial report with insights
5. **Chat** with AI assistant about your finances

---

## Key Features

| Feature | Description |
|---------|-------------|
| Smart Parsing | Supports PDF files and image screenshots (JPG/PNG) |
| Auto-Categorization | 11 categories: Food, Transport, Shopping, Bills, Entertainment, Health, Travel, Education, Personal Care, Transfers, Other |
| Visual Charts | Balance trend line + Spending pie chart (Chart.js) |
| AI Report | Personalized financial analysis and saving tips |
| Chat Assistant | Ask questions about your spending data |
| History | Save and review past analyses |

---

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Create .env file with your OpenAI API key
OPENAI_API_KEY=your-key-here

# 3. Run
python app_with_api.py

# 4. Open http://localhost:5000
```

---

## System Architecture

```
Browser (HTML/JS/CSS)
        │
        ▼
   Flask Backend ──────────► SQLite Database
   (app_with_api.py)              │
        │                         │
        ▼                         ▼
   OpenAI API            analysis_history table
   - GPT-4o (Vision)     - username, filename
   - GPT-4o-mini         - transactions (JSON)
                         - categories (JSON)
                         - report (Markdown)
```

---

## AI Models & Usage

### Models Used

| Model | Purpose | Why |
|-------|---------|-----|
| **GPT-4o** | Image parsing | Vision capability to "read" bank statement screenshots |
| **GPT-4o-mini** | Text parsing, report generation, chat | Fast and cost-effective for text tasks |

### Processing Flow

```
PDF  ───► pdfplumber extracts text ──┐
                                     ├──► GPT-4o-mini parses & categorizes ──► GPT-4o-mini generates report
Image ──► GPT-4o Vision reads it ────┘
```

### Code Examples

**PDF Extraction:**
```python
def extract_text_from_pdf(file):
    with pdfplumber.open(file) as pdf:
        text = ""
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text
```

**Image Parsing (GPT-4o Vision):**
```python
def parse_image_with_vision(file):
    base64_image = base64.b64encode(file.read()).decode('utf-8')
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": PARSE_PROMPT},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
            ]
        }]
    )
```

**Chat with Financial Context:**
```python
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": CHAT_SYSTEM_PROMPT + financial_context},
        {"role": "user", "content": user_message}
    ]
)
```

### Token Limits

| Model | Max Output | Usage |
|-------|------------|-------|
| GPT-4o | 8,192 tokens | Complex image parsing |
| GPT-4o-mini | 16,384 tokens | Text parsing, reports (chat capped at 1,024) |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/login` | POST | Login with username |
| `/upload` | POST | Upload and analyze statement |
| `/chat` | POST | Chat with AI assistant |
| `/history` | GET | List past analyses |
| `/history/<id>` | GET/DELETE | View or delete specific record |

---

## Limitations

| Item | Limit |
|------|-------|
| File size | Max 16 MB |
| Encrypted PDF | Not supported (use screenshot instead) |
| Non-English statements | Lower accuracy |
| Ambiguous transactions | May be categorized as "Other" |

---

## Project Structure

```
├── app_with_api.py      # Flask backend + all APIs
├── finsight.db          # SQLite database (auto-created)
├── templates/
│   ├── index.html       # Main dashboard
│   └── login.html       # Login page
└── static/
    ├── css/style.css
    └── js/main.js
```

---

## Tech Stack

Flask · SQLite · OpenAI GPT-4o · Chart.js · pdfplumber

---

**MIT License** | Powered by OpenAI

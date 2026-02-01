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

## Product demo:

1. **Login** 
<img width="3100" height="1678" alt="login page" src="https://github.com/user-attachments/assets/50a86b56-e74a-402e-8057-ff549464594f" />
2. **Main page** 
<img width="3150" height="1710" alt="page1" src="https://github.com/user-attachments/assets/7b93a289-7169-4213-b7d8-9cdbbe531f46" />

<img width="3152" height="1708" alt="page2" src="https://github.com/user-attachments/assets/1a8515d9-8c11-4fd5-8a2a-f3ed8e94c09d" />

<img width="3142" height="1712" alt="3" src="https://github.com/user-attachments/assets/2c831311-d99d-4e14-85da-1487b4c08604" />
3. **Analysis results** 
<img width="3106" height="1708" alt="4" src="https://github.com/user-attachments/assets/8e4f677d-67c6-414e-adde-da78cc2c9d19" />

<img width="3088" height="994" alt="5" src="https://github.com/user-attachments/assets/dbdca6b4-51c5-4cd4-9099-8674ba82dadf" />

<img width="3022" height="1416" alt="6" src="https://github.com/user-attachments/assets/147ef2c5-f03c-4693-adbe-c2c53f6dd5dc" />

<img width="3114" height="1684" alt="7" src="https://github.com/user-attachments/assets/d5767192-5699-413d-8e2c-18067c0ef582" />
4. **Export as PDF** 
<img width="3172" height="1720" alt="8" src="https://github.com/user-attachments/assets/6d2477d6-0886-40d6-bec0-e8e8dea04780" />
5. **Chat bot** 
<img width="1022" height="1346" alt="9" src="https://github.com/user-attachments/assets/1f0e2588-54be-4f62-9064-a4f2a64ba268" />

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

## Reflections on AI-Assisted Development

This project was built with [Claude Code](https://claude.ai/code) as my AI programming partner. From architecture design to debugging, from writing code to crafting documentation — Claude was there every step of the way.

### The Shifting Role of Humans

**Before AI:** Product managers were the *bridge* between users and developers. They translated needs into specs, specs into tasks.

**Now:** Product managers become the *first users* of the product. With AI handling implementation, we spend less time coordinating and more time experiencing, testing, and refining what we build.

### What This Means

| Before | After |
|--------|-------|
| "Write a spec for developers" | "Build it with AI, then iterate" |
| Weeks of development cycles | Hours from idea to prototype |
| Expertise gatekeeping | Creativity democratization |

### A New Partnership

AI doesn't replace human judgment — it amplifies human creativity. I still decided *what* to build and *why*. Claude helped me figure out *how*, faster than I ever could alone.

The future isn't human vs. AI. It's human *with* AI.

---

**MIT License** | Powered by OpenAI | Built with Claude

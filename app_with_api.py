"""
FinSight Premium - Intelligent Bank Statement Analysis System
Flask Backend with Real API Integration
Supports PDF and Image parsing

Usage:
1. Install dependencies: pip install -r requirements.txt
2. Configure .env file with OPENAI_API_KEY
3. Run: python app_with_api.py
"""

from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import json
import os
import base64
import sqlite3
from datetime import datetime
from dotenv import load_dotenv
import pdfplumber
from openai import OpenAI
import httpx

# Load environment variables (override=True ensures .env takes precedence)
load_dotenv(override=True)

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'finsight-premium-secret-key-2025')

# ==========================================
# Database Configuration
# ==========================================

DATABASE = 'finsight.db'


def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database tables"""
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS analysis_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            filename TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            summary TEXT,
            categories TEXT,
            transactions TEXT,
            report TEXT
        )
    ''')
    conn.commit()
    conn.close()


def save_analysis(username, filename, data):
    """Save analysis result to database"""
    conn = get_db()
    conn.execute('''
        INSERT INTO analysis_history (username, filename, summary, categories, transactions, report)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        username,
        filename,
        json.dumps(data.get('summary', {})),
        json.dumps(data.get('categories', {})),
        json.dumps(data.get('transactions', [])),
        data.get('report', '')
    ))
    conn.commit()
    conn.close()


def get_user_history(username, limit=20):
    """Get analysis history for a user"""
    conn = get_db()
    rows = conn.execute('''
        SELECT id, filename, created_at, summary
        FROM analysis_history
        WHERE username = ?
        ORDER BY created_at DESC
        LIMIT ?
    ''', (username, limit)).fetchall()
    conn.close()

    history = []
    for row in rows:
        summary = json.loads(row['summary']) if row['summary'] else {}
        history.append({
            'id': row['id'],
            'filename': row['filename'],
            'created_at': row['created_at'],
            'start_balance': summary.get('start_balance', 0),
            'end_balance': summary.get('end_balance', 0)
        })
    return history


def get_analysis_detail(analysis_id, username):
    """Get full analysis detail by ID"""
    conn = get_db()
    row = conn.execute('''
        SELECT * FROM analysis_history
        WHERE id = ? AND username = ?
    ''', (analysis_id, username)).fetchone()
    conn.close()

    if not row:
        return None

    return {
        'id': row['id'],
        'filename': row['filename'],
        'created_at': row['created_at'],
        'summary': json.loads(row['summary']) if row['summary'] else {},
        'categories': json.loads(row['categories']) if row['categories'] else {},
        'transactions': json.loads(row['transactions']) if row['transactions'] else [],
        'report': row['report']
    }


def delete_analysis(analysis_id, username):
    """Delete analysis record"""
    conn = get_db()
    conn.execute('DELETE FROM analysis_history WHERE id = ? AND username = ?', (analysis_id, username))
    conn.commit()
    conn.close()


# Initialize database on startup
init_db()

# ==========================================
# Fixed Categories Definition
# ==========================================

FIXED_CATEGORIES = [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Utilities",
    "Healthcare",
    "Education",
    "Travel",
    "Transfer",
    "Income",
    "Other"
]
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

# Lazy initialization of OpenAI client (avoids proxy compatibility issues)
openai_client = None

def get_openai_client():
    """Get OpenAI client (lazy initialization)"""
    global openai_client
    if openai_client is None:
        api_key = os.getenv('OPENAI_API_KEY')
        if api_key:
            # Use custom http_client to avoid proxy issues
            openai_client = OpenAI(
                api_key=api_key,
                http_client=httpx.Client()
            )
    return openai_client

# ==========================================
# Prompt Templates
# ==========================================

PARSE_PROMPT_TEMPLATE = """You are a bank statement data parsing assistant. Please parse the following statement content into JSON format.

Requirements:
1. Extract date, description, amount, and balance for each transaction
2. Categorize each transaction into EXACTLY ONE of these fixed categories (use ONLY these exact names):
   - "Food & Dining" (restaurants, groceries, food delivery, cafes, supermarkets)
   - "Transportation" (gas, public transit, taxi, uber, parking, car maintenance)
   - "Shopping" (retail, online shopping, clothing, electronics, general merchandise)
   - "Entertainment" (movies, games, streaming services, sports, hobbies)
   - "Utilities" (electricity, water, gas, internet, phone bills)
   - "Healthcare" (medical, pharmacy, dental, insurance premiums)
   - "Education" (tuition, books, courses, training)
   - "Travel" (hotels, flights, vacation expenses)
   - "Transfer" (bank transfers, money sent to others)
   - "Income" (salary, refunds, deposits, money received)
   - "Other" (anything that doesn't fit above categories)
3. Return strict JSON format without any explanatory text
4. Amount: expenses as negative numbers, income as positive numbers
5. Automatically identify opening and closing balances
6. If certain fields cannot be identified, make reasonable inferences or use default values

Statement content:
{content}

Return format example:
{{
  "summary": {{
    "start_balance": 2367.20,
    "end_balance": 2239.05,
    "total_income": 0.00,
    "total_expense": 128.15
  }},
  "transactions": [
    {{
      "date": "2025-12-03",
      "description": "PRIME SUPERMARKET",
      "amount": -8.60,
      "balance": 2352.10,
      "category": "Food & Dining"
    }}
  ]
}}
"""

REPORT_PROMPT_TEMPLATE = """Based on the following statement data, generate an objective financial analysis report.

Requirements:
1. Maintain an objective and neutral tone, avoid value judgments
2. State facts based on data
3. Use "you may consider" instead of "you should" for suggestions
4. Keep the report under 300 words
5. Output in Markdown format

Data:
{json_data}

Output structure:
## Financial Overview

Your financial summary for this period:
* **Opening Balance**: ...
* **Closing Balance**: ...
(Include total income, total expenses, net change, daily average spending, etc.)

## Spending Pattern Analysis

### Expense Categories
(List each category's spending and percentage)

### Spending Characteristics
(Analyze main expense categories, number of transactions, etc.)

## Objective Suggestions

1. **Expense Management**: ...
2. **Savings Planning**: ...
3. **Financial Tracking**: ...
"""

CHAT_SYSTEM_PROMPT = """You are FinSight AI Assistant, a helpful financial advisor chatbot. You help users understand their finances and answer questions about banking, budgeting, and financial planning.

Guidelines:
1. Be friendly, professional, and concise
2. If the user has uploaded a bank statement (context provided), reference their specific data when relevant
3. For general financial questions, provide helpful advice
4. Use simple language, avoid jargon
5. If you don't know something, say so honestly
6. Keep responses under 150 words unless more detail is needed
7. You can use markdown formatting for better readability

If financial data context is provided, you can:
- Answer questions about their spending patterns
- Explain specific transactions
- Provide personalized budgeting tips
- Compare their spending to typical patterns
"""

# ==========================================
# PDF Processing Functions
# ==========================================

def check_pdf_encrypted(file):
    """
    Check if PDF is encrypted

    Args:
        file: File object from Flask request.files

    Returns:
        bool: True if encrypted, False otherwise
    """
    try:
        with pdfplumber.open(file) as pdf:
            # Try to read the first page
            if len(pdf.pages) > 0:
                _ = pdf.pages[0].extract_text()
            return False
    except Exception as e:
        error_msg = str(e).lower()
        if 'encrypt' in error_msg or 'password' in error_msg:
            return True
        raise e


def extract_text_from_pdf(file):
    """
    Extract text content from PDF file

    Args:
        file: File object from Flask request.files

    Returns:
        str: Extracted text content
    """
    text = ""

    try:
        # Reset file pointer
        file.seek(0)

        with pdfplumber.open(file) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"

        if not text.strip():
            raise Exception("PDF file is empty or text cannot be extracted")

        return text

    except Exception as e:
        error_msg = str(e).lower()
        if 'encrypt' in error_msg or 'password' in error_msg:
            raise Exception("PDF is encrypted. Please upload a screenshot instead.")
        raise Exception(f"PDF extraction failed: {str(e)}")


# ==========================================
# Image Processing Functions
# ==========================================

def encode_image_to_base64(file):
    """
    Encode image file to base64

    Args:
        file: File object from Flask request.files

    Returns:
        str: Base64 encoded image
    """
    file.seek(0)
    image_data = file.read()
    return base64.b64encode(image_data).decode('utf-8')


def get_image_media_type(filename):
    """
    Get MIME type based on filename

    Args:
        filename: Filename

    Returns:
        str: MIME type
    """
    ext = filename.lower().split('.')[-1]
    media_types = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
    }
    return media_types.get(ext, 'image/jpeg')


def parse_image_with_vision(file):
    """
    Use GPT-4o Vision API to parse statement data from image

    Args:
        file: File object from Flask request.files

    Returns:
        dict: Parsed structured data
    """

    if not os.getenv('OPENAI_API_KEY'):
        raise Exception("OPENAI_API_KEY not configured")

    # Encode image
    base64_image = encode_image_to_base64(file)
    media_type = get_image_media_type(file.filename)

    prompt = """Please carefully analyze this bank statement screenshot and extract all transaction information in JSON format.

Requirements:
1. Extract date, description, amount, and balance for each transaction
2. Categorize each transaction into EXACTLY ONE of these fixed categories (use ONLY these exact names):
   - "Food & Dining" (restaurants, groceries, food delivery, cafes, supermarkets)
   - "Transportation" (gas, public transit, taxi, uber, parking, car maintenance)
   - "Shopping" (retail, online shopping, clothing, electronics, general merchandise)
   - "Entertainment" (movies, games, streaming services, sports, hobbies)
   - "Utilities" (electricity, water, gas, internet, phone bills)
   - "Healthcare" (medical, pharmacy, dental, insurance premiums)
   - "Education" (tuition, books, courses, training)
   - "Travel" (hotels, flights, vacation expenses)
   - "Transfer" (bank transfers, money sent to others)
   - "Income" (salary, refunds, deposits, money received)
   - "Other" (anything that doesn't fit above categories)
3. Return strict JSON format without any explanatory text
4. Amount: expenses as negative numbers, income as positive numbers
5. Identify opening and closing balances
6. If some information is unclear, make reasonable inferences

Return format:
{
  "summary": {
    "start_balance": number,
    "end_balance": number,
    "total_income": number,
    "total_expense": number
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "transaction description",
      "amount": number (negative for expenses),
      "balance": number,
      "category": "category"
    }
  ]
}
"""

    try:
        response = get_openai_client().chat.completions.create(
            model="gpt-4o",  # Use GPT-4o for Vision support
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{base64_image}",
                                "detail": "high"  # High detail mode for better recognition
                            }
                        }
                    ]
                }
            ],
            max_tokens=8192,  # Increased for full monthly statements
            temperature=0
        )

        # Extract returned text
        result_text = response.choices[0].message.content

        # Parse JSON (may contain ```json``` markers)
        result_text = result_text.strip()
        if result_text.startswith('```'):
            # Remove markdown code block markers
            lines = result_text.split('\n')
            result_text = '\n'.join(lines[1:-1])

        data = json.loads(result_text)
        return data

    except json.JSONDecodeError as e:
        raise Exception(f"AI returned invalid data format: {str(e)}")
    except Exception as e:
        raise Exception(f"Image parsing failed: {str(e)}")


# ==========================================
# OpenAI API Functions
# ==========================================

def parse_text_with_openai(text):
    """
    Use OpenAI API to parse text into structured JSON data

    Args:
        text: Statement text content

    Returns:
        dict: Parsed structured data
    """

    if not os.getenv('OPENAI_API_KEY'):
        raise Exception("OPENAI_API_KEY not configured. Please set it in .env file")

    # Limit input length (increased for full monthly statements)
    max_chars = 20000
    if len(text) > max_chars:
        text = text[:max_chars] + "\n...(content truncated)"

    try:
        response = get_openai_client().chat.completions.create(
            model="gpt-4o-mini",  # Using gpt-4o-mini for better cost efficiency
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional bank statement data parsing expert, skilled at extracting structured data from text."
                },
                {
                    "role": "user",
                    "content": PARSE_PROMPT_TEMPLATE.format(content=text)
                }
            ],
            temperature=0,
            max_tokens=16384,  # Increased for full monthly statements
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)
        return result

    except Exception as e:
        raise Exception(f"OpenAI parsing failed: {str(e)}")


def generate_ai_report(data):
    """
    Use OpenAI API to generate financial analysis report

    Args:
        data: Structured statement data

    Returns:
        str: Markdown formatted analysis report
    """

    if not os.getenv('OPENAI_API_KEY'):
        raise Exception("OPENAI_API_KEY not configured")

    try:
        response = get_openai_client().chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional financial analysis consultant, skilled at analyzing user spending data with an objective and neutral tone."
                },
                {
                    "role": "user",
                    "content": REPORT_PROMPT_TEMPLATE.format(
                        json_data=json.dumps(data, ensure_ascii=False, indent=2)
                    )
                }
            ],
            temperature=0.7
        )

        report = response.choices[0].message.content
        return report

    except Exception as e:
        raise Exception(f"Report generation failed: {str(e)}")


# ==========================================
# Helper Functions
# ==========================================

def calculate_categories(transactions):
    """Calculate category statistics with fixed categories"""
    # Initialize all fixed categories with 0
    categories = {cat: 0 for cat in FIXED_CATEGORIES if cat != "Income"}

    for transaction in transactions:
        if transaction['amount'] < 0:
            category = transaction.get('category', 'Other')
            # Normalize category to match fixed categories
            if category not in FIXED_CATEGORIES:
                category = 'Other'
            if category != "Income":  # Don't include Income in expense categories
                categories[category] = categories.get(category, 0) + abs(transaction['amount'])

    return categories


def validate_data(data):
    """Validate data format"""
    required_keys = ['summary', 'transactions']

    if not all(key in data for key in required_keys):
        return False

    if not isinstance(data['transactions'], list):
        return False

    return True


# ==========================================
# Route Configuration
# ==========================================

@app.route('/')
def index():
    """Home page - requires login"""
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('index.html', username=session['username'])


@app.route('/login', methods=['GET', 'POST'])
def login():
    """Simple login - just enter your name"""
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        if username:
            session['username'] = username
            return redirect(url_for('index'))
        return render_template('login.html', error='Please enter your name')
    return render_template('login.html')


@app.route('/logout')
def logout():
    """Logout and clear session"""
    session.pop('username', None)
    return redirect(url_for('login'))


@app.route('/upload', methods=['POST'])
def upload():
    """
    Handle file upload - supports PDF and images
    """

    upload_type = request.form.get('type', 'pdf')

    try:
        if upload_type == 'image':
            # === Image upload handling ===
            if 'image' not in request.files:
                return jsonify({"error": "No image file found"}), 400

            file = request.files['image']

            if file.filename == '':
                return jsonify({"error": "No file selected"}), 400

            print(f"[Image] Parsing: {file.filename}")

            # Use Vision API to parse image
            data = parse_image_with_vision(file)

        else:
            # === PDF upload handling ===
            if 'pdf' not in request.files:
                return jsonify({"error": "No PDF file found"}), 400

            file = request.files['pdf']

            if file.filename == '':
                return jsonify({"error": "No file selected"}), 400

            if not file.filename.lower().endswith('.pdf'):
                return jsonify({"error": "Only PDF files are supported"}), 400

            print(f"[PDF] Processing: {file.filename}")

            # Check if PDF is encrypted
            file.seek(0)
            try:
                if check_pdf_encrypted(file):
                    return jsonify({"error": "PDF is encrypted. Please upload a screenshot instead."}), 400
            except Exception as e:
                if 'encrypt' in str(e).lower():
                    return jsonify({"error": str(e)}), 400

            # Extract PDF text
            file.seek(0)
            pdf_text = extract_text_from_pdf(file)
            print(f"[OK] PDF text extracted, length: {len(pdf_text)} chars")

            # Use OpenAI to parse
            print("[API] Calling OpenAI to parse data...")
            data = parse_text_with_openai(pdf_text)

        # Validate data
        if not validate_data(data):
            return jsonify({"error": "Data format validation failed"}), 500

        print(f"[OK] Data parsed, transactions: {len(data.get('transactions', []))}")

        # Calculate category statistics
        categories = calculate_categories(data['transactions'])
        data['categories'] = categories

        # Generate AI report
        print("[Report] Generating AI analysis...")
        report = generate_ai_report(data)
        data['report'] = report

        # Save to database if user is logged in
        if 'username' in session:
            save_analysis(session['username'], file.filename, data)
            print(f"[DB] Analysis saved for user: {session['username']}")

        print("[OK] Processing complete")
        return jsonify(data), 200

    except Exception as e:
        error_msg = str(e)
        print(f"[ERROR] Processing failed: {error_msg}")
        return jsonify({"error": error_msg}), 500


@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "api_configured": bool(os.getenv('OPENAI_API_KEY')),
        "features": ["pdf", "image", "chat", "history"]
    })


@app.route('/history')
def history():
    """Get user's analysis history"""
    if 'username' not in session:
        return jsonify({"error": "Not logged in"}), 401

    history_list = get_user_history(session['username'])
    return jsonify({"history": history_list}), 200


@app.route('/history/<int:analysis_id>')
def history_detail(analysis_id):
    """Get specific analysis detail"""
    if 'username' not in session:
        return jsonify({"error": "Not logged in"}), 401

    detail = get_analysis_detail(analysis_id, session['username'])
    if not detail:
        return jsonify({"error": "Analysis not found"}), 404

    return jsonify(detail), 200


@app.route('/history/<int:analysis_id>', methods=['DELETE'])
def history_delete(analysis_id):
    """Delete an analysis record"""
    if 'username' not in session:
        return jsonify({"error": "Not logged in"}), 401

    delete_analysis(analysis_id, session['username'])
    return jsonify({"success": True}), 200


@app.route('/chat', methods=['POST'])
def chat():
    """
    AI Chatbot endpoint for financial assistance
    Accepts: { "message": "user message", "context": optional financial data }
    Returns: { "reply": "AI response" }
    """

    if not os.getenv('OPENAI_API_KEY'):
        return jsonify({"error": "OPENAI_API_KEY not configured"}), 500

    try:
        data = request.get_json()

        if not data or 'message' not in data:
            return jsonify({"error": "Message is required"}), 400

        user_message = data['message'].strip()

        if not user_message:
            return jsonify({"error": "Message cannot be empty"}), 400

        # Build context from financial data if available
        context_info = ""
        if 'context' in data and data['context']:
            ctx = data['context']
            context_info = f"""

User's Financial Data Context:
- Opening Balance: ${ctx.get('summary', {}).get('start_balance', 'N/A')}
- Closing Balance: ${ctx.get('summary', {}).get('end_balance', 'N/A')}
- Total Income: ${ctx.get('summary', {}).get('total_income', 'N/A')}
- Total Expenses: ${ctx.get('summary', {}).get('total_expense', 'N/A')}
- Number of Transactions: {len(ctx.get('transactions', []))}
- Top Spending Categories: {', '.join([f"{k}: ${v:.2f}" for k, v in sorted(ctx.get('categories', {}).items(), key=lambda x: x[1], reverse=True)[:3]])}
"""

        # Call OpenAI API
        response = get_openai_client().chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": CHAT_SYSTEM_PROMPT + context_info
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ],
            temperature=0.7,
            max_tokens=500
        )

        reply = response.choices[0].message.content

        return jsonify({"reply": reply}), 200

    except Exception as e:
        print(f"[Chat Error] {str(e)}")
        return jsonify({"error": f"Chat failed: {str(e)}"}), 500


# ==========================================
# Error Handlers
# ==========================================

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({"error": "File too large. Maximum size is 16MB."}), 413


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Page not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500


# ==========================================
# Application Startup
# ==========================================

if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("FinSight Premium - Intelligent Statement Analysis")
    print("=" * 60)

    if not os.getenv('OPENAI_API_KEY'):
        print("\n[Warning] OPENAI_API_KEY not configured")
        print("Please follow these steps:")
        print("1. Copy .env.example to .env")
        print("2. Set OPENAI_API_KEY=your-api-key in .env")
        print("3. Restart the app")
    else:
        print("\n[OK] OpenAI API configured")

    print("\nSupported features:")
    print("   - PDF parsing")
    print("   - Image/Screenshot parsing (GPT-4o Vision)")
    print("   - AI financial report")

    print("\nStarting server...")
    print("=" * 60 + "\n")

    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )

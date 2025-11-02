"""
Qwen 2.5 Local Server for Text-to-SQL
Runs Qwen 2.5 locally using Transformers library
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for Node.js backend

# Global variables for model and tokenizer
model = None
tokenizer = None
device = None

# Configuration
MODEL_NAME = os.getenv('QWEN_MODEL_NAME', 'Qwen/Qwen2.5-7B-Instruct')
PORT = int(os.getenv('PYTHON_SERVER_PORT', 5000))
USE_GPU = os.getenv('USE_GPU', 'true').lower() == 'true'
LOAD_IN_8BIT = os.getenv('LOAD_IN_8BIT', 'false').lower() == 'true'  # For lower memory usage


def load_model():
    """Load Qwen model and tokenizer"""
    global model, tokenizer, device

    logger.info(f"Loading model: {MODEL_NAME}")
    logger.info(f"GPU available: {torch.cuda.is_available()}")

    # Determine device
    if USE_GPU and torch.cuda.is_available():
        device = "cuda"
        logger.info(f"Using GPU: {torch.cuda.get_device_name(0)}")
    else:
        device = "cpu"
        logger.info("Using CPU (this will be slow!)")

    try:
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)

        # Load model with optional optimizations
        if LOAD_IN_8BIT and device == "cuda":
            logger.info("Loading model in 8-bit mode (requires bitsandbytes)")
            model = AutoModelForCausalLM.from_pretrained(
                MODEL_NAME,
                device_map="auto",
                load_in_8bit=True,
                trust_remote_code=True
            )
        else:
            model = AutoModelForCausalLM.from_pretrained(
                MODEL_NAME,
                device_map="auto" if device == "cuda" else None,
                trust_remote_code=True
            )
            if device == "cpu":
                model = model.to(device)

        model.eval()  # Set to evaluation mode
        logger.info("✅ Model loaded successfully!")

    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
        raise


def generate_sql(user_query: str, schema: str) -> str:
    """Generate SQL from natural language query"""

    prompt = f"""You are a SQL expert. Generate a MySQL query based on the user's question and database schema.

DATABASE SCHEMA:
{schema}

RULES:
1. Generate ONLY the SQL query, no explanations
2. Use proper MySQL syntax
3. Always add LIMIT clause for SELECT queries (default 100)
4. Use backticks for table/column names if they contain special characters
5. For "has" or "contains", use LIKE '%value%'
6. For date queries, use appropriate MySQL date functions
7. Return the SQL query as plain text without markdown formatting

USER QUESTION:
{user_query}

Generate the MySQL query:"""

    # Tokenize input
    inputs = tokenizer(prompt, return_tensors="pt").to(device)

    # Generate response
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=512,
            temperature=0.1,
            do_sample=False,
            top_p=0.95,
            pad_token_id=tokenizer.eos_token_id
        )

    # Decode response
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)

    # Extract SQL from response (remove the prompt)
    sql = response[len(prompt):].strip()

    # Clean up response
    sql = sql.replace('```sql', '').replace('```', '').strip()
    sql = sql.split('\n\n')[0]  # Take first paragraph only

    return sql


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'model': MODEL_NAME,
        'device': device,
        'model_loaded': model is not None
    })


@app.route('/generate-sql', methods=['POST'])
def generate_sql_endpoint():
    """Generate SQL endpoint"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        user_query = data.get('query')
        schema = data.get('schema')

        if not user_query:
            return jsonify({'error': 'query is required'}), 400

        if not schema:
            return jsonify({'error': 'schema is required'}), 400

        logger.info(f"Generating SQL for query: {user_query}")

        # Generate SQL
        sql = generate_sql(user_query, schema)

        logger.info(f"Generated SQL: {sql}")

        return jsonify({
            'sql': sql,
            'model': MODEL_NAME,
            'device': device
        })

    except Exception as e:
        logger.error(f"Error generating SQL: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    logger.info("Starting Qwen 2.5 Local Server...")
    logger.info(f"Model: {MODEL_NAME}")
    logger.info(f"Port: {PORT}")
    logger.info(f"GPU: {USE_GPU}")

    # Load model on startup
    load_model()

    # Start Flask server
    app.run(host='0.0.0.0', port=PORT, debug=False)

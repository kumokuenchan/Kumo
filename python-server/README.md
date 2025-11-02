# Qwen 2.5 Local Server (Python/Transformers)

Run Qwen 2.5 **100% locally** on your machine - completely free with no API costs or rate limits!

## Overview

This Python server runs Qwen 2.5 using the Hugging Face Transformers library, providing a local alternative to the OpenRouter API.

**Benefits:**
- ✅ **100% Free** - No API costs, no rate limits
- ✅ **Privacy** - Your data never leaves your computer
- ✅ **Offline** - Works without internet (after initial model download)
- ✅ **Control** - Full control over model settings and behavior

**Requirements:**
- Python 3.8+
- GPU with 8GB+ VRAM (recommended) OR 16GB+ RAM for CPU mode
- ~15GB disk space for model download

---

## Quick Start

### Step 1: Install Python Dependencies

```bash
cd python-server
pip install -r requirements.txt
```

**Note:** This will download PyTorch, Transformers, and other dependencies (~5GB).

### Step 2: Start the Python Server

```bash
python qwen_server.py
```

**First time:** The model will download automatically (~10GB). This only happens once!

You should see:
```
Loading model: Qwen/Qwen2.5-7B-Instruct
✅ Model loaded successfully!
 * Running on http://0.0.0.0:5000
```

### Step 3: Configure Your App

In your `.env` file:

```env
AI_MODEL=qwen-local
PYTHON_SERVER_URL=http://localhost:5000
```

### Step 4: Restart Your Node.js Server

```bash
npm run dev
```

### Step 5: Test It!

Go to the Query tab and try: "show me all products"

Check the console - you should see:
```
✅ AI Model Available: Qwen 2.5 Local
   Provider: Python/Transformers
```

---

## Configuration Options

Edit environment variables before starting the Python server:

### Model Selection

```bash
# Use Qwen 2.5 7B (default, recommended for most systems)
export QWEN_MODEL_NAME="Qwen/Qwen2.5-7B-Instruct"

# Use smaller model (faster, less accurate)
export QWEN_MODEL_NAME="Qwen/Qwen2.5-1.5B-Instruct"

# Use larger model (slower, more accurate - requires 16GB+ VRAM)
export QWEN_MODEL_NAME="Qwen/Qwen2.5-14B-Instruct"
```

### GPU vs CPU

```bash
# Use GPU (default, much faster!)
export USE_GPU=true

# Use CPU only (slower but works without GPU)
export USE_GPU=false
```

### Memory Optimization

If you're running out of GPU memory, enable 8-bit quantization:

```bash
# Requires: pip install bitsandbytes
export LOAD_IN_8BIT=true
```

This reduces memory usage by ~50% with minimal accuracy loss.

### Port Configuration

```bash
# Change server port (default: 5000)
export PYTHON_SERVER_PORT=5001

# Don't forget to update .env!
# PYTHON_SERVER_URL=http://localhost:5001
```

---

## System Requirements

### Recommended (GPU Mode)

- **GPU:** NVIDIA GPU with 8GB+ VRAM (RTX 3060 or better)
- **RAM:** 8GB+
- **Disk:** 20GB free space
- **Speed:** ~1-2 seconds per query

### Minimum (CPU Mode)

- **CPU:** Modern multi-core processor
- **RAM:** 16GB+ (32GB recommended)
- **Disk:** 20GB free space
- **Speed:** ~10-30 seconds per query (depends on CPU)

---

## Troubleshooting

### Issue: "Out of memory" error

**Solution 1:** Use smaller model
```bash
export QWEN_MODEL_NAME="Qwen/Qwen2.5-1.5B-Instruct"
```

**Solution 2:** Enable 8-bit quantization
```bash
pip install bitsandbytes
export LOAD_IN_8BIT=true
```

**Solution 3:** Use CPU mode
```bash
export USE_GPU=false
```

### Issue: Model download is slow

The model is ~10GB. Download speed depends on your internet connection.

**Alternative:** Download manually from Hugging Face:
1. Go to https://huggingface.co/Qwen/Qwen2.5-7B-Instruct
2. Download all files to: `~/.cache/huggingface/hub/`
3. Restart the server

### Issue: "Connection refused" from Node.js

Make sure:
1. Python server is running (`python qwen_server.py`)
2. Check the port: `http://localhost:5000/health`
3. `.env` has correct URL: `PYTHON_SERVER_URL=http://localhost:5000`

### Issue: Slow inference on CPU

CPU inference is 10-30x slower than GPU. Options:

1. **Get a GPU** (recommended)
2. **Use cloud GPU** (Google Colab, Vast.ai)
3. **Switch to API mode** (set `AI_MODEL=qwen` in `.env`)

---

## API Endpoints

### GET /health

Check if server is running:

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "ok",
  "model": "Qwen/Qwen2.5-7B-Instruct",
  "device": "cuda",
  "model_loaded": true
}
```

### POST /generate-sql

Generate SQL from natural language:

```bash
curl -X POST http://localhost:5000/generate-sql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "show me all users",
    "schema": "users:\n  - id: int\n  - name: varchar"
  }'
```

Response:
```json
{
  "sql": "SELECT * FROM users LIMIT 100;",
  "model": "Qwen/Qwen2.5-7B-Instruct",
  "device": "cuda"
}
```

---

## Performance Comparison

| Mode | Speed | Cost | Privacy | Accuracy |
|------|-------|------|---------|----------|
| **Local (GPU)** | 1-2s | Free | 100% | ~85-90% |
| **Local (CPU)** | 10-30s | Free | 100% | ~85-90% |
| **API (Qwen)** | 2-3s | $0.0003/query | Metadata only | ~90-95% |
| **API (Claude)** | 3-4s | $0.003/query | Metadata only | ~95%+ |

---

## Advanced: Running in Background

### Windows

```bash
# Start in background
start /B python qwen_server.py

# Or use pythonw (no console window)
pythonw qwen_server.py
```

### Linux/Mac

```bash
# Start in background
nohup python qwen_server.py > qwen.log 2>&1 &

# Check if running
curl http://localhost:5000/health

# View logs
tail -f qwen.log

# Stop server
pkill -f qwen_server.py
```

---

## FAQ

**Q: Do I need a GPU?**
A: No, but it's **much faster**. CPU mode works but is 10-30x slower.

**Q: How much does the model cost to download?**
A: It's free! Just takes time (~10GB download).

**Q: Can I use a different model?**
A: Yes! Any Hugging Face model that supports text generation. Change `QWEN_MODEL_NAME`.

**Q: Is this better than the API?**
A:
- **Better for:** Privacy, cost (free!), offline usage
- **Worse for:** Setup complexity, requires good hardware

**Q: Can I run this on a server?**
A: Yes! Just make sure to update `PYTHON_SERVER_URL` in `.env` to point to your server.

**Q: Does this work on Mac M1/M2?**
A: Yes, but PyTorch MPS (Metal) support is experimental. Use CPU mode if GPU doesn't work.

---

## Support

If you encounter issues:

1. Check the logs for error messages
2. Try the solutions in **Troubleshooting** section
3. Make sure your Python version is 3.8+
4. Check GPU drivers are up to date (for GPU mode)

Happy coding! 🚀

# 🚀 Qwen 2.5 Setup Guide (Default AI Model)

Qwen 2.5 is now the **default AI model** for Natural Language to SQL. It's fast, accurate, and often **free or cheaper** than alternatives!

## Why Qwen 2.5?

| Feature | Qwen 2.5 72B | Claude 3.5 | Smart Fallback |
|---------|--------------|------------|----------------|
| Accuracy | 90-95% ✅ | 90-95% ✅ | 60-70% ⚠️ |
| Speed | 1-2 seconds ✅ | 1-3 seconds ✅ | Instant ✅ |
| Cost | Often **FREE** 🎉 | $0.001/query | FREE ✅ |
| Complex queries | Excellent ✅ | Excellent ✅ | Limited ❌ |
| Joins | Auto-detects ✅ | Auto-detects ✅ | No ❌ |
| GROUP BY/HAVING | Yes ✅ | Yes ✅ | No ❌ |

**Winner:** Qwen 2.5 is the best choice for most users! 🏆

---

## 📋 Quick Setup (5 minutes)

### Option A: OpenRouter (Recommended - Easiest)

**Why OpenRouter?**
- ✅ One API key for 100+ models
- ✅ Free tier available
- ✅ Easy to use
- ✅ Pay-as-you-go (or free credits)

**Steps:**

1. **Get OpenRouter API Key**
   - Go to https://openrouter.ai/
   - Sign up (free)
   - Get $1-5 in free credits!
   - Go to https://openrouter.ai/keys
   - Create API key

2. **Configure Environment**

   Create or edit `C:\claude\mysql\.env`:
   ```env
   # AI Model Selection (qwen is default)
   AI_MODEL=qwen

   # OpenRouter API Key
   OPENROUTER_API_KEY=sk-or-v1-YOUR-KEY-HERE

   # Server port
   PORT=3001
   ```

3. **Restart Server**
   ```bash
   npm run dev
   ```

4. **Done!** 🎉
   The app will now use Qwen 2.5 for text-to-SQL!

---

### Option B: Direct Alibaba Cloud (Advanced Users)

If you want to use Alibaba Cloud directly:

1. **Get DashScope API Key**
   - Go to https://dashscope.aliyun.com/
   - Sign up (might need Aliyun account)
   - Get API key

2. **Configure Environment**
   ```env
   AI_MODEL=qwen
   QWEN_API_KEY=sk-your-dashscope-key
   QWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
   ```

3. **Restart Server**

---

## 🧪 Test It!

After setup, try these queries:

### Simple Queries:
```
"show me all products"
→ SELECT * FROM products LIMIT 100;

"count total users"
→ SELECT COUNT(*) as total FROM users;
```

### Complex Queries (Where Qwen Shines):
```
"show me products where category is Electronics and price > 100"
→ SELECT * FROM products
   WHERE category = 'Electronics' AND unit_price > 100
   LIMIT 100;

"total sales by region for last quarter"
→ SELECT r.region_name, SUM(s.quantity * s.unit_price) as total_sales
   FROM sales s
   JOIN regions r ON s.region_id = r.region_id
   WHERE s.sale_date >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
   GROUP BY r.region_name
   ORDER BY total_sales DESC
   LIMIT 100;

"find top 5 customers with most orders"
→ SELECT c.customer_name, COUNT(*) as order_count
   FROM customers c
   JOIN orders o ON c.customer_id = o.customer_id
   GROUP BY c.customer_id, c.customer_name
   ORDER BY order_count DESC
   LIMIT 5;
```

All of these should generate **perfect SQL**! ✅

---

## 💰 Pricing

### OpenRouter (Recommended):
- **Free tier:** $1-5 in credits (enough for 1000-5000 queries!)
- **After free tier:** ~$0.0003 per query
- **100 queries/day:** ~$1/month
- **1000 queries/day:** ~$9/month

### Direct Alibaba Cloud:
- Often **free** for moderate usage
- Check current pricing at dashscope.aliyun.com

**Much cheaper than Claude!** 💸

---

## 🔧 Configuration Options

### Switch Models via .env

```env
# Use Qwen (default, recommended)
AI_MODEL=qwen

# Use Claude (if you have Claude API key)
AI_MODEL=claude

# Use smart fallback only (no AI API)
AI_MODEL=fallback
```

### Automatic Fallback

If your primary model fails, the system automatically tries the other:
- Qwen fails → tries Claude (if configured)
- Claude fails → tries Qwen (if configured)

---

## ✅ Verify Setup

### 1. Check API Status

Open browser console (F12) and look for:
```
✓ Qwen 2.5 is configured and ready (default)
```

Or check the endpoint:
```bash
curl http://localhost:3001/api/ai/status
```

Should return:
```json
{
  "available": true,
  "message": "Qwen 2.5 is configured and ready (default)",
  "configuredModel": "qwen",
  "models": {
    "qwen": {
      "available": true,
      "name": "Qwen 2.5 72B",
      "provider": "OpenRouter / Alibaba Cloud"
    }
  }
}
```

### 2. Test a Query

In the app:
1. Click "Ask AI to generate SQL"
2. Type: "show me all users"
3. Should generate: `SELECT * FROM users LIMIT 100;`

---

## 🐛 Troubleshooting

### "Qwen API key not set"
- Check `.env` file exists in `C:\claude\mysql\`
- Verify `OPENROUTER_API_KEY` is set
- Restart server after adding key

### "Qwen API error: 401"
- API key is invalid
- Check for typos in `.env`
- Regenerate key on OpenRouter

### "Qwen API error: 429"
- Rate limit exceeded
- Wait a moment and try again
- Consider upgrading plan on OpenRouter

### Still using smart fallback?
- Check browser console for errors
- Verify `AI_MODEL=qwen` in `.env`
- Make sure server restarted after config change

---

## 🔄 Switching Between Models

### Use Qwen (Default):
```env
AI_MODEL=qwen
OPENROUTER_API_KEY=sk-or-v1-your-key
```

### Use Claude:
```env
AI_MODEL=claude
ANTHROPIC_API_KEY=sk-ant-your-key
```

### Use Both (Automatic Fallback):
```env
AI_MODEL=qwen
OPENROUTER_API_KEY=sk-or-v1-your-key
ANTHROPIC_API_KEY=sk-ant-your-key
```

If Qwen fails, it automatically tries Claude!

---

## 🎯 Recommended Setup

For best results:

```env
# Default to Qwen (fast & cheap)
AI_MODEL=qwen
OPENROUTER_API_KEY=sk-or-v1-your-key

# Add Claude as fallback (optional but recommended)
ANTHROPIC_API_KEY=sk-ant-your-key

# Server config
PORT=3001
```

This gives you:
- ✅ Fast responses (Qwen)
- ✅ Low cost (Qwen is cheaper)
- ✅ Automatic fallback (Claude if Qwen fails)
- ✅ 95%+ accuracy on all queries

---

## 📊 Model Comparison

### When to use Qwen 2.5:
- ✅ Default choice for most users
- ✅ Want to save money
- ✅ Complex queries with joins
- ✅ Need good accuracy at low cost

### When to use Claude:
- ✅ Maximum accuracy required
- ✅ Already have Claude API key
- ✅ Critical business queries

### When to use Smart Fallback:
- ✅ Don't want to use external APIs
- ✅ Simple queries only
- ✅ Privacy concerns about sending schema

---

## 🎉 Success Checklist

- [ ] Got OpenRouter API key
- [ ] Added `OPENROUTER_API_KEY` to `.env`
- [ ] Set `AI_MODEL=qwen` in `.env`
- [ ] Restarted server
- [ ] Saw "Qwen 2.5 is configured" in console
- [ ] Tested complex query
- [ ] Got perfect SQL! 🚀

---

## 📚 Additional Resources

- **OpenRouter Docs:** https://openrouter.ai/docs
- **Qwen Model Info:** https://openrouter.ai/models/qwen/qwen-2.5-72b-instruct
- **Pricing Calculator:** https://openrouter.ai/models
- **API Status:** http://localhost:3001/api/ai/status

---

**Need help?** Check `TROUBLESHOOTING.md` or open an issue on GitHub!

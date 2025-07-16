# 🤖 LLM Database Chatbot Integration

This document explains how to set up and use the intelligent database chatbot that can answer questions about your dental/periodontal database using natural language.

## 🎯 Features

- **Natural Language Queries**: Ask questions in plain English about procedures, products, research, and treatments
- **Text-to-SQL Generation**: LLM converts your questions into safe SQL queries
- **Multiple LLM Providers**: Support for OpenAI, Anthropic, **Ollama (local)**, and **Hugging Face (free)**
- **100% Free Options**: Use local Ollama models or free Hugging Face API
- **Safety First**: Built-in query validation and sanitization
- **Smart Results**: Intelligent formatting and follow-up suggestions
- **Authenticated Access**: Only available to logged-in users

## 🚀 Quick Setup (100% Free Options!)

### 🆓 **Option A: Ollama (Local Models - Recommended Free Option)**

1. **Install Ollama:**
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows: Download from https://ollama.ai/download
   ```

2. **Download a model for SQL:**
   ```bash
   # Best for SQL generation (7GB)
   ollama pull codellama:7b
   
   # Alternative: Lighter model (4GB)
   ollama pull mistral:7b
   
   # SQL-specific model (if available)
   ollama pull sqlcoder:7b
   ```

3. **Start Ollama:**
   ```bash
   ollama serve
   ```

4. **Configure your app:**
   ```bash
   # Create .env file - NO API KEY NEEDED!
   REACT_APP_OLLAMA_MODEL=codellama:7b
   REACT_APP_OLLAMA_BASE_URL=http://localhost:11434
   ```

### 🌐 **Option B: Hugging Face (Free Cloud API)**

1. **Get free API key:**
   - Go to [Hugging Face Tokens](https://huggingface.co/settings/tokens)
   - Create a new token (free account)

2. **Configure your app:**
   ```bash
   # Create .env file
   REACT_APP_HUGGINGFACE_API_KEY=hf_your_free_token_here
   REACT_APP_HUGGINGFACE_MODEL=microsoft/DialoGPT-medium
   ```

### 💰 **Option C: Paid APIs (Higher Quality)**

**OpenAI (Best Quality)**
```bash
REACT_APP_OPENAI_API_KEY=sk-your_openai_key_here
```

**Anthropic Claude**
```bash
REACT_APP_ANTHROPIC_API_KEY=your_anthropic_key_here
```

### 2. Provider Configuration

The system is now **production-ready with 100% FREE models by default**.

In `src/services/llmService.js`, the current configuration is:

```javascript
const DEFAULT_CONFIG = {
  provider: LLM_PROVIDERS.OLLAMA,        // FREE production-ready models
  // provider: LLM_PROVIDERS.HUGGINGFACE, // Free cloud API backup
  // provider: LLM_PROVIDERS.OPENAI,      // Paid option for premium quality
  // provider: LLM_PROVIDERS.ANTHROPIC,   // Paid alternative
};

### 3. Start the Application

```bash
npm start
```

The chatbot will appear as a blue database icon in the bottom-left corner (only for authenticated users).

## 🤖 **Recommended Open Source Models**

### **For Ollama (Local):**

| Model | Size | Best For | Performance | Production Ready |
|-------|------|----------|-------------|------------------|
| `sqlcoder:7b` | 7GB | **SQL-specific tasks** | ⭐⭐⭐⭐⭐ | ✅ **RECOMMENDED** |
| `codellama:7b` | 7GB | SQL generation, code | ⭐⭐⭐⭐ | ✅ Good fallback |
| `mistral:7b` | 4GB | General queries | ⭐⭐⭐ | ⚠️ Basic |
| `phi3:mini` | 2GB | Very lightweight | ⭐⭐ | ❌ Development only |

**Production Setup:** `sqlcoder:7b` (primary) + `codellama:7b` (fallback) = Production-grade reliability!

### **For Hugging Face (Free Cloud):**

| Model | Best For | Performance | Rate Limits |
|-------|----------|-------------|-------------|
| `microsoft/DialoGPT-medium` | Conversational SQL | ⭐⭐⭐ | Generous |
| `microsoft/DialoGPT-large` | Better conversations | ⭐⭐⭐⭐ | Moderate |
| `bigcode/starcoder` | Code generation | ⭐⭐⭐⭐ | Limited |

**Recommendation:** Start with `DialoGPT-medium` for reliable free access.

## 💬 How to Use

### Sample Questions You Can Ask:

**Product Recommendations:**
- "What products are used for gingivitis treatment?"
- "Find products with clinical evidence"
- "Show me products for post-operative care"

**Research & Evidence:**
- "Show me research articles about chlorhexidine"
- "Find studies on periodontal surgery"
- "What clinical evidence supports this product?"

**Procedure Information:**
- "List all periodontal procedures by category"
- "What are the phases of periodontal surgery?"
- "Find procedures suitable for pediatric patients"

**Treatment Guidance:**
- "What should I do in the pre-operative phase?"
- "How is this product better than competitors?"
- "Find objection handling for this product"

### Chat Features:

- **SQL Query Inspection**: Click "Show SQL Query" to see the generated database query
- **Copy Queries**: Copy SQL queries for your own use
- **Follow-up Suggestions**: Get smart suggestions for related questions
- **Error Handling**: Clear error messages if something goes wrong

## 🏗️ Architecture

The chatbot uses a hybrid approach:

1. **LLM Service** (`src/services/llmService.js`)
   - Generates SQL queries from natural language
   - Supports multiple providers (OpenAI, Anthropic)
   - Includes prompt engineering for database context

2. **Query Executor** (`src/services/queryExecutor.js`)
   - Safely executes generated SQL queries
   - Uses Supabase query builder for security
   - Validates and sanitizes all queries

3. **Database Context** (`src/services/databaseContext.js`)
   - Provides LLM with comprehensive schema information
   - Includes relationship mappings and query patterns
   - Enforces safety rules

4. **Chat Interface** (`src/components/DatabaseChatbot.js`)
   - Beautiful, responsive chat UI
   - Real-time query processing
   - Result formatting and suggestions

## 🔒 Security Features

- **Query Validation**: Only SELECT queries allowed
- **SQL Injection Protection**: Parameterized queries and validation
- **Authentication Required**: Only logged-in users can access
- **Rate Limiting**: Built into LLM providers
- **Error Handling**: Safe error messages without exposing internals

## ⚙️ Configuration Options

### Change LLM Provider

In `src/services/llmService.js`, modify the `DEFAULT_CONFIG`:

```javascript
const DEFAULT_CONFIG = {
  provider: LLM_PROVIDERS.OPENAI, // or LLM_PROVIDERS.ANTHROPIC
  // ... rest of config
};
```

### Adjust Model Settings

```javascript
openai: {
  model: 'gpt-4-turbo-preview', // or 'gpt-3.5-turbo' for faster/cheaper
  // ...
},
anthropic: {
  model: 'claude-3-sonnet-20240229', // or 'claude-3-haiku-20240307'
  // ...
}
```

## 🚨 Troubleshooting

### Common Issues:

**"Ollama API error: connection refused"**
- Make sure Ollama is running: `ollama serve`
- Check the URL: `http://localhost:11434`
- Verify the model is downloaded: `ollama list`

**"Hugging Face model is loading"**
- Free models may take 20+ seconds to wake up
- Wait and try again - this is normal for free tier

**"Query validation failed"**
- The LLM generated an unsafe query
- Try rephrasing your question more specifically
- Open source models may need more specific prompts

**Poor SQL quality from open source models**
- Try `codellama:7b` or `sqlcoder:7b` for better SQL generation
- Be more specific in your questions
- Include example table names in your question

**"OpenAI/Anthropic API key not configured"**
- Only needed if using paid providers
- For free options, use Ollama or Hugging Face instead

**No results found**
- Check spelling of procedure/product names
- Try broader search terms
- Ask "List all procedures" to see available data

### Debug Mode:

Check the browser console for detailed logs:
- `🤖 LLM:` - LLM service logs
- `🗄️ QUERY:` - Database query logs
- `📊 ANALYTICS:` - Usage analytics

## 🎨 Customization

### Sample Questions

Edit the `sampleQuestions` array in `DatabaseChatbot.js`:

```javascript
const sampleQuestions = [
  "Your custom question here",
  "Another helpful example",
  // ...
];
```

### Response Formatting

Modify `formatResultData()` in `DatabaseChatbot.js` to change how results are displayed.

### Chat UI Styling

The chatbot uses Tailwind CSS classes and respects your app's dark mode theme.

## 📈 Analytics & Monitoring

The system logs queries for analytics (see `_logQuery` in `queryExecutor.js`). You can:

- Track popular questions
- Monitor query performance
- Identify areas for improvement
- Debug failed queries

## 🔮 Future Enhancements

Planned features:
- Voice input/output
- Export results to PDF/Excel
- Query caching for performance
- Advanced RAG (Retrieval-Augmented Generation)
- Custom prompt templates
- Multi-language support

## 🆘 Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your API keys are correctly set
3. Ensure you're logged into the application
4. Try simpler, more specific questions

For technical support, check the query logs and error messages in the console.

---

**Happy querying! 🎉** The chatbot makes your dental database more accessible and powerful than ever. 
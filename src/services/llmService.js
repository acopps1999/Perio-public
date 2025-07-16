/**
 * LLM Service for Text-to-SQL Generation
 * Supports multiple LLM providers and handles intelligent query generation
 */

import { generateContextPrompt, validateQuery } from './databaseContext.js';

// Configuration for different LLM providers
const LLM_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  OLLAMA: 'ollama',           // Local open source models
  HUGGINGFACE: 'huggingface', // Free hosted open source models
};

// Default configuration - you can modify these based on your preferences and API keys
const DEFAULT_CONFIG = {
  provider: LLM_PROVIDERS.OPENAI, // Production recommended - reliable and high quality
  openai: {
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
    model: 'gpt-4o-mini', // Production optimized: fast, reliable, cost-effective
    fallbackModel: 'gpt-3.5-turbo', // Fallback for rate limits
    baseUrl: 'https://api.openai.com/v1',
    maxRetries: 3,
    timeout: 30000, // 30 second timeout
  },
  anthropic: {
    apiKey: process.env.REACT_APP_ANTHROPIC_API_KEY,
    model: 'claude-3-sonnet-20240229', // or 'claude-3-haiku-20240307' for faster queries
    baseUrl: 'https://api.anthropic.com/v1',
  },
  ollama: {
    baseUrl: process.env.REACT_APP_OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.REACT_APP_OLLAMA_MODEL || 'codellama:7b', // Recommended: codellama, mistral, or sqlcoder
  },
  huggingface: {
    apiKey: process.env.REACT_APP_HUGGINGFACE_API_KEY, // Free tier available
    model: process.env.REACT_APP_HUGGINGFACE_MODEL || 'bigcode/starcoder', // Better for code/SQL generation
    baseUrl: 'https://api-inference.huggingface.co/models',
  }
};

export class LLMService {
  constructor(config = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.provider = this.config.provider;
  }

  /**
   * Generate SQL query from natural language input
   * @param {string} userQuery - The user's natural language question
   * @returns {Promise<{sql: string, explanation: string, confidence: number}>}
   */
  async generateSQL(userQuery) {
    try {
      console.log('🤖 LLM: Generating SQL for query:', userQuery);
      
      const prompt = generateContextPrompt(userQuery);
      console.log('🤖 LLM: Using prompt context length:', prompt.length);
      
      let response;
      
      switch (this.provider) {
        case LLM_PROVIDERS.OPENAI:
          response = await this._queryOpenAI(prompt);
          break;
        case LLM_PROVIDERS.ANTHROPIC:
          response = await this._queryAnthropic(prompt);
          break;
        case LLM_PROVIDERS.OLLAMA:
          response = await this._queryOllama(prompt);
          break;
        case LLM_PROVIDERS.HUGGINGFACE:
          response = await this._queryHuggingFace(prompt);
          break;
        default:
          throw new Error(`Unsupported LLM provider: ${this.provider}`);
      }
      
      const parsed = this._parseResponse(response);
      console.log('🤖 LLM: Generated SQL:', parsed.sql);
      
      // Validate the generated query
      const validation = validateQuery(parsed.sql);
      if (!validation.valid) {
        throw new Error(`Generated query failed validation: ${validation.error}`);
      }
      
      return parsed;
    } catch (error) {
      console.error('🤖 LLM: Error generating SQL:', error);
      throw new Error(`Failed to generate SQL query: ${error.message}`);
    }
  }

  /**
   * Query OpenAI API with production-level retry logic
   * @private
   */
  async _queryOpenAI(prompt) {
    if (!this.config.openai.apiKey) {
      throw new Error('OpenAI API key not configured. Set REACT_APP_OPENAI_API_KEY environment variable.');
    }

    const maxRetries = this.config.openai.maxRetries || 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 OpenAI: Attempt ${attempt}/${maxRetries}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.openai.timeout);

        const response = await fetch(`${this.config.openai.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.openai.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.openai.model,
            messages: [
              {
                role: 'system',
                content: 'You are a SQL expert specializing in dental/periodontal databases. Generate safe, efficient SQL queries and provide clear explanations. Always include LIMIT clauses for safety.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1, // Low temperature for consistent, accurate SQL generation
            max_tokens: 1000,
            top_p: 0.9,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
          
          // Handle rate limiting with exponential backoff
          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after') || Math.pow(2, attempt);
            console.log(`🤖 OpenAI: Rate limited, waiting ${retryAfter}s before retry...`);
            
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
              continue;
            }
          }
          
          // Try fallback model on certain errors
          if (response.status === 400 && this.config.openai.fallbackModel && attempt === 1) {
            console.log(`🤖 OpenAI: Trying fallback model: ${this.config.openai.fallbackModel}`);
            this.config.openai.model = this.config.openai.fallbackModel;
            continue;
          }
          
          throw new Error(`OpenAI API error (${response.status}): ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('Invalid response format from OpenAI API');
        }

        console.log(`🤖 OpenAI: ✅ Success on attempt ${attempt}`);
        return data.choices[0].message.content;

      } catch (error) {
        lastError = error;
        console.log(`🤖 OpenAI: ❌ Attempt ${attempt} failed:`, error.message);
        
        // Don't retry on certain errors
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please try a simpler query');
        }
        
        if (error.message.includes('API key') || error.message.includes('unauthorized')) {
          throw error; // Don't retry auth errors
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
          console.log(`🤖 OpenAI: Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw new Error(`OpenAI API failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Query Anthropic API
   * @private
   */
  async _queryAnthropic(prompt) {
    if (!this.config.anthropic.apiKey) {
      throw new Error('Anthropic API key not configured. Set REACT_APP_ANTHROPIC_API_KEY environment variable.');
    }

    const response = await fetch(`${this.config.anthropic.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.anthropic.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.anthropic.model,
        max_tokens: 1000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  /**
   * Query Ollama API (Local open source models)
   * @private
   */
  async _queryOllama(prompt) {
    const response = await fetch(`${this.config.ollama.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.ollama.model,
        prompt: `You are a SQL expert specializing in dental/periodontal databases. Generate safe, efficient SQL queries and provide clear explanations.

${prompt}

Remember to:
1. Only generate SELECT queries
2. Always include a LIMIT clause
3. Use ILIKE for case-insensitive string matching
4. Provide a brief explanation of what the query does

Response format:
\`\`\`sql
[your SQL query here]
\`\`\`

Explanation: [brief explanation of what the query finds]`,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.response;
  }

  /**
   * Query Hugging Face Inference API
   * @private
   */
  async _queryHuggingFace(prompt) {
    if (!this.config.huggingface.apiKey) {
      throw new Error('Hugging Face API key not configured. Get a free key at https://huggingface.co/settings/tokens');
    }

    const response = await fetch(`${this.config.huggingface.baseUrl}/${this.config.huggingface.model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.huggingface.apiKey}`,
      },
      body: JSON.stringify({
        inputs: `You are a SQL expert. Generate safe SQL queries for dental databases.

${prompt}

Generate a SELECT query with LIMIT and explain what it finds.

SQL:`,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.1,
          return_full_text: false,
        }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 503) {
        throw new Error('Hugging Face model is loading. Please wait a moment and try again.');
      }
      throw new Error(`Hugging Face API error: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    
    // Handle different response formats from HF
    if (Array.isArray(data) && data[0]) {
      return data[0].generated_text || data[0].text || JSON.stringify(data[0]);
    }
    
    return data.generated_text || data.text || JSON.stringify(data);
  }

  /**
   * Parse LLM response to extract SQL and explanation
   * @private
   */
  _parseResponse(response) {
    console.log('🤖 LLM: Raw response:', response);
    
    // Try to extract SQL from various formats
    let sql = '';
    let explanation = '';
    
    // Look for SQL in code blocks
    const sqlMatch = response.match(/```sql\s*([\s\S]*?)\s*```/i) || 
                     response.match(/```\s*(SELECT[\s\S]*?)\s*```/i);
    
    if (sqlMatch) {
      sql = sqlMatch[1].trim();
    } else {
      // Look for SQL starting with SELECT
      const selectMatch = response.match(/(SELECT[\s\S]*?);?\s*(?:\n|$)/i);
      if (selectMatch) {
        sql = selectMatch[1].trim();
      }
    }
    
    // Clean up SQL
    sql = sql.replace(/;?\s*$/, ''); // Remove trailing semicolon
    if (!sql.toLowerCase().includes('limit')) {
      sql += ' LIMIT 100'; // Add safety limit if not present
    }
    
    // Extract explanation (everything that's not SQL)
    explanation = response
      .replace(/```sql[\s\S]*?```/gi, '')
      .replace(/```[\s\S]*?```/gi, '')
      .replace(/SELECT[\s\S]*?;?\s*(?:\n|$)/gi, '')
      .trim();
    
    if (!explanation) {
      explanation = 'Generated SQL query based on your request.';
    }
    
    // Estimate confidence based on response quality
    let confidence = 0.7; // Base confidence
    if (sql.includes('JOIN')) confidence += 0.1;
    if (sql.includes('WHERE')) confidence += 0.1;
    if (sql.includes('LIMIT')) confidence += 0.05;
    if (explanation.length > 50) confidence += 0.05;
    
    confidence = Math.min(confidence, 0.95); // Cap at 95%
    
    if (!sql) {
      throw new Error('Could not extract SQL query from LLM response');
    }
    
    return {
      sql: sql,
      explanation: explanation,
      confidence: confidence
    };
  }

  /**
   * Generate follow-up suggestions based on query results
   * @param {string} originalQuery - The original user query
   * @param {Array} results - The query results
   * @returns {Array<string>} Array of suggested follow-up questions
   */
  generateFollowUpSuggestions(originalQuery, results) {
    const suggestions = [];
    
    if (results.length === 0) {
      suggestions.push("Try broadening your search terms");
      suggestions.push("Check if the procedure or product name is spelled correctly");
      suggestions.push("Ask about related procedures or products");
    } else if (results.length >= 10) {
      suggestions.push("Add more specific criteria to narrow down results");
      suggestions.push("Filter by patient type or procedure phase");
      suggestions.push("Ask for the most recent or relevant items");
    } else {
      // Generate contextual suggestions based on query type
      if (originalQuery.toLowerCase().includes('product')) {
        suggestions.push("Ask about clinical evidence for these products");
        suggestions.push("Find research articles about these products");
        suggestions.push("Compare these products with competitors");
      }
      
      if (originalQuery.toLowerCase().includes('procedure')) {
        suggestions.push("Ask about phases for these procedures");
        suggestions.push("Find suitable patient types for these procedures");
        suggestions.push("Get pitch points for these procedures");
      }
      
      if (originalQuery.toLowerCase().includes('research')) {
        suggestions.push("Ask for more details about specific studies");
        suggestions.push("Find related research in this area");
        suggestions.push("Look for recent publications");
      }
    }
    
    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  /**
   * Switch LLM provider
   * @param {string} provider - New provider to use
   */
  setProvider(provider) {
    if (!Object.values(LLM_PROVIDERS).includes(provider)) {
      throw new Error(`Invalid provider: ${provider}`);
    }
    this.provider = provider;
    console.log('🤖 LLM: Switched to provider:', provider);
  }
}

// Export a default instance
export const llmService = new LLMService();

// Export provider constants for external use
export { LLM_PROVIDERS }; 
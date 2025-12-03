/**
 * OpenAI Service - Reliable Cloud-Based AI
 *
 * Uses OpenAI for:
 * - Text embeddings (text-embedding-3-small - 1536 dimensions)
 * - Chat completion (GPT-4 Turbo)
 *
 * Benefits:
 * - Extremely reliable (no crashes)
 * - Better quality embeddings
 * - Trivial cost (~$0.01/month for this app)
 * - Fast API response times
 *
 * Cost breakdown:
 * - Embeddings: $0.00002 per 1K tokens (~100 records = $0.002)
 * - Chat: $0.01 per 1K tokens (1000 queries/month = ~$1)
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Note: For production, move to backend/edge function
});

const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions
const CHAT_MODEL = 'gpt-3.5-turbo'; // Fast and cost-effective
const AGENT_MODEL = 'gpt-3.5-turbo'; // For planning, evaluation, synthesis, reranking

/**
 * Generate text embedding using OpenAI
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - 1536-dimensional embedding vector
 */
export async function generateEmbedding(text) {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim(),
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('❌ OpenAI embedding error:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate chat completion using OpenAI
 * @param {Array} messages - Chat messages in OpenAI format
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} - Chat completion response
 */
export async function chatCompletion(messages, options = {}) {
  const {
    model = CHAT_MODEL,
    stream = false,
    temperature = 0.7,
    maxTokens = 2000,
    response_format,
  } = options;

  try {
    const requestParams = {
      model: model,
      messages: messages,
      stream: stream,
      temperature: temperature,
      max_tokens: maxTokens,
    };

    // Add response_format if provided (for JSON mode)
    if (response_format) {
      requestParams.response_format = response_format;
    }

    const response = await openai.chat.completions.create(requestParams);

    if (stream) {
      return response; // Return stream for caller to process
    } else {
      return {
        content: response.choices[0].message.content,
        model: response.model,
        usage: response.usage,
        choices: response.choices, // Include full choices for compatibility
      };
    }
  } catch (error) {
    console.error('❌ OpenAI chat error:', error);
    throw new Error(`Failed to generate chat completion: ${error.message}`);
  }
}

/**
 * Stream chat completion using OpenAI
 * @param {Array} messages - Chat messages
 * @param {Function} onChunk - Callback for each streamed chunk
 * @param {Object} options - Generation options
 */
export async function streamChatCompletion(messages, onChunk, options = {}) {
  const {
    model = CHAT_MODEL,
    temperature = 0.7,
    maxTokens = 2000,
  } = options;

  try {
    const stream = await openai.chat.completions.create({
      model: model,
      messages: messages,
      stream: true,
      temperature: temperature,
      max_tokens: maxTokens,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        onChunk(content);
      }
    }
  } catch (error) {
    console.error('❌ OpenAI streaming error:', error);
    throw new Error(`Failed to stream chat: ${error.message}`);
  }
}

/**
 * Check if OpenAI API key is configured
 * @returns {Object} - Status object
 */
export function checkOpenAIStatus() {
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;

  if (!apiKey) {
    return {
      configured: false,
      error: 'OpenAI API key not found in environment variables',
    };
  }

  if (!apiKey.startsWith('sk-')) {
    return {
      configured: false,
      error: 'Invalid OpenAI API key format (should start with sk-)',
    };
  }

  return {
    configured: true,
    ready: true,
    model: EMBEDDING_MODEL,
  };
}

/**
 * Estimate cost for embedding generation
 * @param {number} recordCount - Number of records to embed
 * @param {number} avgTokensPerRecord - Average tokens per record (default: 100)
 * @returns {Object} - Cost estimate
 */
export function estimateEmbeddingCost(recordCount, avgTokensPerRecord = 100) {
  const totalTokens = recordCount * avgTokensPerRecord;
  const costPer1KTokens = 0.00002; // text-embedding-3-small pricing
  const estimatedCost = (totalTokens / 1000) * costPer1KTokens;

  return {
    recordCount,
    avgTokensPerRecord,
    totalTokens,
    estimatedCost: estimatedCost.toFixed(4),
    costPer1KTokens,
  };
}

/**
 * Export model constants for use in other services
 */
export { CHAT_MODEL, AGENT_MODEL };

/**
 * Query Executor Service
 * Safely executes LLM-generated SQL queries against Supabase
 */

import { supabase } from '../supabaseClient.js';
import { validateQuery } from './databaseContext.js';

export class QueryExecutor {
  constructor() {
    this.maxQueryTime = 30000; // 30 second timeout
    this.maxResults = 100;
  }

  /**
   * Execute a SQL query safely
   * @param {string} sql - The SQL query to execute
   * @param {Object} metadata - Additional metadata about the query
   * @returns {Promise<{success: boolean, data: Array, error?: string, executionTime: number}>}
   */
  async executeQuery(sql, metadata = {}) {
    const startTime = Date.now();
    
    try {
      console.log('🗄️ QUERY: Executing SQL:', sql);
      
      // Re-validate the query before execution
      const validation = validateQuery(sql);
      if (!validation.valid) {
        throw new Error(`Query validation failed: ${validation.error}`);
      }

      // Clean and prepare the query
      const cleanSql = this._cleanQuery(sql);
      console.log('🗄️ QUERY: Cleaned SQL:', cleanSql);

      // Execute the query with timeout
      const result = await Promise.race([
        this._executeWithSupabase(cleanSql),
        this._timeoutPromise()
      ]);

      const executionTime = Date.now() - startTime;
      console.log(`🗄️ QUERY: ✅ Executed successfully in ${executionTime}ms`);
      console.log(`🗄️ QUERY: ✅ Returned ${result.length} rows`);

      // Log query for analytics (optional)
      await this._logQuery(cleanSql, metadata, true, executionTime, result.length);

      return {
        success: true,
        data: result,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('🗄️ QUERY: ❌ Execution failed:', error);
      
      // Log failed query for debugging
      await this._logQuery(sql, metadata, false, executionTime, 0, error.message);

      return {
        success: false,
        data: [],
        error: this._formatError(error),
        executionTime
      };
    }
  }

  /**
   * Execute query using Supabase RPC for raw SQL
   * @private
   */
  async _executeWithSupabase(sql) {
    // For security, we'll use Supabase's RPC feature to execute raw SQL
    // This requires creating a PostgreSQL function in your database
    
    // For now, we'll implement common query patterns using Supabase's query builder
    // This is safer than raw SQL execution
    return await this._executeWithQueryBuilder(sql);
  }

  /**
   * Execute using Supabase query builder (safer approach)
   * @private
   */
  async _executeWithQueryBuilder(sql) {
    // Parse the SQL to understand what the user wants
    const queryInfo = this._parseQuery(sql);
    
    switch (queryInfo.type) {
      case 'procedures':
        return await this._queryProcedures(queryInfo);
      case 'products':
        return await this._queryProducts(queryInfo);
      case 'research':
        return await this._queryResearch(queryInfo);
      case 'categories':
        return await this._queryCategories(queryInfo);
      case 'phases':
        return await this._queryPhases(queryInfo);
      case 'product_details':
        return await this._queryProductDetails(queryInfo);
      case 'procedure_products':
        return await this._queryProcedureProducts(queryInfo);
      default:
        // For complex queries, we'll need to implement raw SQL execution
        throw new Error('Complex queries require raw SQL execution - please implement execute_sql RPC function');
    }
  }

  /**
   * Parse SQL to understand query intent
   * @private
   */
  _parseQuery(sql) {
    const lowerSql = sql.toLowerCase();
    
    // Determine primary table
    let primaryTable = '';
    let joins = [];
    let conditions = [];
    let selectFields = [];
    
    // Extract SELECT fields
    const selectMatch = sql.match(/select\s+(.*?)\s+from/i);
    if (selectMatch) {
      selectFields = selectMatch[1].split(',').map(f => f.trim());
    }
    
    // Extract FROM table
    const fromMatch = sql.match(/from\s+(\w+)/i);
    if (fromMatch) {
      primaryTable = fromMatch[1];
    }
    
    // Extract JOINs
    const joinMatches = sql.match(/join\s+(\w+)/gi);
    if (joinMatches) {
      joins = joinMatches.map(j => j.replace(/join\s+/i, ''));
    }
    
    // Extract WHERE conditions
    const whereMatch = sql.match(/where\s+(.*?)(?:\s+limit|\s+order|\s*$)/i);
    if (whereMatch) {
      conditions = whereMatch[1];
    }
    
    // Extract LIMIT
    const limitMatch = sql.match(/limit\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 100;
    
    return {
      type: primaryTable,
      selectFields,
      joins,
      conditions,
      limit,
      originalSql: sql
    };
  }

  /**
   * Query procedures table
   * @private
   */
  async _queryProcedures(queryInfo) {
    let query = supabase.from('procedures').select('*');
    
    // Apply common WHERE conditions
    if (queryInfo.conditions) {
      if (queryInfo.conditions.includes('ilike')) {
        // Extract ILIKE pattern
        const ilikeMatch = queryInfo.conditions.match(/name\s+ilike\s+'([^']+)'/i);
        if (ilikeMatch) {
          query = query.ilike('name', ilikeMatch[1]);
        }
      }
    }
    
    query = query.limit(queryInfo.limit);
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Query products table
   * @private
   */
  async _queryProducts(queryInfo) {
    let query = supabase.from('products').select('*');
    
    if (queryInfo.conditions) {
      const ilikeMatch = queryInfo.conditions.match(/name\s+ilike\s+'([^']+)'/i);
      if (ilikeMatch) {
        query = query.ilike('name', ilikeMatch[1]);
      }
    }
    
    query = query.limit(queryInfo.limit);
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Query research articles
   * @private
   */
  async _queryResearch(queryInfo) {
    let query = supabase.from('research_articles').select('*');
    
    if (queryInfo.conditions) {
      // Handle different search patterns
      if (queryInfo.conditions.includes('product_name')) {
        const productMatch = queryInfo.conditions.match(/product_name\s+ilike\s+'([^']+)'/i);
        if (productMatch) {
          query = query.ilike('product_name', productMatch[1]);
        }
      }
      
      if (queryInfo.conditions.includes('abstract')) {
        const abstractMatch = queryInfo.conditions.match(/abstract\s+ilike\s+'([^']+)'/i);
        if (abstractMatch) {
          query = query.ilike('abstract', abstractMatch[1]);
        }
      }
    }
    
    query = query.limit(queryInfo.limit);
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Query categories
   * @private
   */
  async _queryCategories(queryInfo) {
    let query = supabase.from('categories').select('*');
    query = query.limit(queryInfo.limit);
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Query phases
   * @private
   */
  async _queryPhases(queryInfo) {
    let query = supabase.from('phases').select('*');
    query = query.limit(queryInfo.limit);
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Query product details
   * @private
   */
  async _queryProductDetails(queryInfo) {
    let query = supabase.from('product_details').select(`
      *,
      products(name)
    `);
    
    query = query.limit(queryInfo.limit);
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Query procedure-product relationships
   * @private
   */
  async _queryProcedureProducts(queryInfo) {
    let query = supabase.from('procedure_phase_products').select(`
      *,
      procedures(name),
      products(name),
      phases(name),
      patient_types(name)
    `);
    
    query = query.limit(queryInfo.limit);
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Clean and sanitize SQL query
   * @private
   */
  _cleanQuery(sql) {
    return sql
      .trim()
      .replace(/;+$/, '') // Remove trailing semicolons
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Create timeout promise
   * @private
   */
  _timeoutPromise() {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timeout after ${this.maxQueryTime}ms`));
      }, this.maxQueryTime);
    });
  }

  /**
   * Log query execution for analytics
   * @private
   */
  async _logQuery(sql, metadata, success, executionTime, resultCount, error = null) {
    try {
      // Only log if user is authenticated (prevent spam)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // You can store query logs in a separate table for analytics
      // await supabase.from('query_logs').insert({
      //   sql_query: sql,
      //   user_id: user.id,
      //   success: success,
      //   execution_time: executionTime,
      //   result_count: resultCount,
      //   error_message: error,
      //   metadata: metadata,
      //   created_at: new Date().toISOString()
      // });
      
      console.log('📊 ANALYTICS: Query logged', { sql: sql.substring(0, 100), success, executionTime });
    } catch (logError) {
      console.warn('📊 ANALYTICS: Failed to log query:', logError);
    }
  }

  /**
   * Format error for user display
   * @private
   */
  _formatError(error) {
    if (error.message.includes('timeout')) {
      return 'Query took too long to execute. Please try a more specific search.';
    }
    
    if (error.message.includes('permission')) {
      return 'You don\'t have permission to access this data.';
    }
    
    if (error.message.includes('syntax')) {
      return 'There was an issue with the generated query. Please try rephrasing your question.';
    }
    
    return `Database error: ${error.message}`;
  }

  /**
   * Format results for display
   * @param {Array} results - Raw query results
   * @param {string} originalQuery - The original user query
   * @returns {Object} Formatted results with metadata
   */
  formatResults(results, originalQuery) {
    if (!results || results.length === 0) {
      return {
        isEmpty: true,
        message: 'No results found for your query.',
        suggestions: [
          'Try using different search terms',
          'Check spelling of procedure or product names',
          'Ask a more general question'
        ]
      };
    }

    return {
      isEmpty: false,
      count: results.length,
      data: results,
      summary: this._generateSummary(results, originalQuery)
    };
  }

  /**
   * Generate a summary of results
   * @private
   */
  _generateSummary(results, originalQuery) {
    const count = results.length;
    
    if (count === 1) {
      return `Found 1 result for "${originalQuery}"`;
    }
    
    return `Found ${count} results for "${originalQuery}"`;
  }
}

// Export a default instance
export const queryExecutor = new QueryExecutor(); 
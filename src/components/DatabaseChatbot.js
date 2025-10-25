import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader, Database, Lightbulb, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import SupabaseQueryService from '../services/supabaseQueryService.js';

function DatabaseChatbot() {
  const { isDarkMode } = useTheme();
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSQLQuery, setShowSQLQuery] = useState({});
  const [copiedStates, setCopiedStates] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Initialize Supabase query service
  const queryServiceRef = useRef(null);
  if (!queryServiceRef.current) {
    queryServiceRef.current = new SupabaseQueryService();
  }

  // Sample questions to help users get started
  const sampleQuestions = [
    "What products are used for gingivitis treatment?",
    "Show me research articles about chlorhexidine",
    "List all periodontal procedures by category",
    "Find products with clinical evidence",
    "What are the phases of periodontal surgery?",
    "Which procedures are suitable for pediatric patients?"
  ];

  // Declare functions before useEffect hooks that use them
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // React hooks must be called before any conditional returns
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add welcome message when chatbot opens for the first time
      setMessages([{
        id: Date.now(),
        type: 'assistant',
        content: "👋 Hi! I'm your dental database assistant. I can help you find information about procedures, products, research articles, and treatment guidance.\n\nTry asking questions like:\n• What products are used for specific procedures?\n• Show me research about a particular treatment\n• Find procedures for different patient types\n\nWhat would you like to know?",
        timestamp: new Date()
      }]);
    }
  }, [isOpen, messages.length]);

  // Only show if user is authenticated
  if (!isAuthenticated) {
    return null;
  }

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Use Supabase query service for reliable database access
      console.log('🗄️ Starting Supabase query processing...');
      const queryResult = await queryServiceRef.current.processQuestion(currentMessage);
      
      // Format the response from Supabase service
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: queryResult.answer,
        timestamp: new Date(),
        sqlQuery: 'Using Supabase Query Builder', // No raw SQL to show
        explanation: queryResult.answer,
        confidence: queryResult.confidence,
        executionTime: 0,
        resultCount: queryResult.resultCount || 0,
        rawData: queryResult.data || null,
        error: null,
        method: 'supabase_query_builder'
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Generate follow-up suggestions from Supabase service
      if (queryResult.suggestions && queryResult.suggestions.length > 0) {
        setTimeout(() => {
          const suggestionMessage = {
            id: Date.now() + 2,
            type: 'suggestions',
            content: queryResult.suggestions,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, suggestionMessage]);
        }, 1000);
      }

    } catch (error) {
      console.error('❌ Error processing query:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: `❌ I encountered an error while processing your request: ${error.message}\n\nPlease try rephrasing your question or ask something more specific.`,
        timestamp: new Date(),
        error: error.message
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Unused function - can be removed in future cleanup
  // const formatAssistantResponse = (queryResult, llmResult, originalQuery) => {
  //   if (!queryResult.success) {
  //     return `❌ I couldn't execute the query: ${queryResult.error}\n\n💡 **Explanation:** ${llmResult.explanation}\n\nTry rephrasing your question or being more specific.`;
  //   }

  //   const data = queryResult.data;
  //   if (data.length === 0) {
  //     return `🔍 No results found for "${originalQuery}".\n\n💡 **What I searched for:** ${llmResult.explanation}\n\n**Suggestions:**\n//• Try different search terms\n//• Check spelling of procedure or product names\n//• Ask a more general question`;
  //   }

  //   let response = `✅ Found ${data.length} result${data.length > 1 ? 's' : ''} for "${originalQuery}"\n\n`;
  //   response += `💡 **What I found:** ${llmResult.explanation}\n\n`;

  //   // Format the data based on the type of results
  //   response += formatResultData(data, originalQuery);

  //   if (data.length >= 10) {
  //     response += `\n\n📋 **Note:** Showing first ${data.length} results. For more specific results, try narrowing your search.`;
  //   }

  //   return response;
  // };

  const formatResultData = (data, originalQuery) => {
    if (data.length === 0) return '';

    // Detect the type of data and format accordingly
    const firstItem = data[0];
    
    if (firstItem.hasOwnProperty('name') && firstItem.hasOwnProperty('id')) {
      // Simple entity list (procedures, products, categories, etc.)
      return data.map((item, index) => 
        `${index + 1}. **${item.name}**${item.category ? ` (${item.category})` : ''}${item.description ? `\n   ${item.description}` : ''}`
      ).join('\n');
    }
    
    if (firstItem.hasOwnProperty('title') && firstItem.hasOwnProperty('author')) {
      // Research articles
      return data.map((item, index) => 
        `${index + 1}. **${item.title}**\n   Author: ${item.author || 'Unknown'}\n   ${item.abstract ? `Abstract: ${item.abstract.substring(0, 200)}...` : ''}${item.url ? `\n   🔗 [View Article](${item.url})` : ''}`
      ).join('\n\n');
    }
    
    if (firstItem.hasOwnProperty('clinical_evidence') || firstItem.hasOwnProperty('objection_handling')) {
      // Product details
      return data.map((item, index) => {
        let result = `${index + 1}. **Product Details**`;
        if (item.products?.name) result += ` - ${item.products.name}`;
        if (item.clinical_evidence) result += `\n   **Clinical Evidence:** ${item.clinical_evidence.substring(0, 300)}...`;
        if (item.pitch_points) result += `\n   **Key Points:** ${item.pitch_points}`;
        return result;
      }).join('\n\n');
    }
    
    // Generic formatting for complex objects
    return data.map((item, index) => {
      const keys = Object.keys(item).filter(key => 
        !key.includes('id') && 
        !key.includes('created_at') && 
        !key.includes('updated_at') &&
        item[key] !== null &&
        item[key] !== ''
      );
      
      return `${index + 1}. ${keys.map(key => {
        const value = item[key];
        if (typeof value === 'object' && value.name) {
          return `**${key}:** ${value.name}`;
        }
        if (typeof value === 'string' && value.length > 100) {
          return `**${key}:** ${value.substring(0, 100)}...`;
        }
        return `**${key}:** ${value}`;
      }).join('\n   ')}`;
    }).join('\n\n');
  };

  const handleSampleQuestion = (question) => {
    setCurrentMessage(question);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const toggleSQLQuery = (messageId) => {
    setShowSQLQuery(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const copyToClipboard = async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [messageId]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [messageId]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 left-6 rounded-full p-4 shadow-lg z-50 transition-all duration-200 hover:scale-105 ${
            isDarkMode 
              ? 'bg-white hover:bg-gray-50 text-[#15396c] border border-gray-200' 
              : 'bg-[#15396c] hover:bg-[#15396c]/90 text-white border border-[#15396c]'
          }`}
          title="Ask Database Questions"
        >
          <Database size={24} />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className={`fixed bottom-6 left-6 w-[500px] h-[600px] rounded-lg shadow-2xl z-50 flex flex-col ${
          isDarkMode 
            ? 'bg-gray-800 border border-gray-700' 
            : 'bg-white border border-gray-200'
        }`}>
          {/* Header */}
          <div className={`flex justify-between items-center p-4 bg-[#15396c] text-white rounded-t-lg ${
            isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'
          }`}>
            <h3 className="font-semibold flex items-center">
              <Bot size={20} className="mr-2" />
              Database Assistant
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-[#15396c] text-white'
                    : message.type === 'suggestions'
                    ? isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>
                  {message.type === 'suggestions' ? (
                    <div>
                      <p className="text-sm font-medium mb-2">💡 You might also ask:</p>
                      {message.content.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSampleQuestion(suggestion)}
                          className="block w-full text-left text-sm p-2 rounded hover:bg-black/10 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                      
                      {/* Show SQL query toggle for assistant messages */}
                      {message.type === 'assistant' && message.sqlQuery && (
                        <div className="mt-3 pt-3 border-t border-black/10">
                          <button
                            onClick={() => toggleSQLQuery(message.id)}
                            className="flex items-center text-xs text-black/60 hover:text-black/80 transition-colors"
                          >
                            <Database size={12} className="mr-1" />
                            {showSQLQuery[message.id] ? 'Hide' : 'Show'} SQL Query
                            {showSQLQuery[message.id] ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
                          </button>
                          
                          {showSQLQuery[message.id] && (
                            <div className="mt-2 p-2 bg-black/5 rounded text-xs font-mono">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-black/60">Generated SQL:</span>
                                <button
                                  onClick={() => copyToClipboard(message.sqlQuery, message.id)}
                                  className="flex items-center text-black/60 hover:text-black/80 transition-colors"
                                >
                                  {copiedStates[message.id] ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                              </div>
                              <code className="break-all">{message.sqlQuery}</code>
                              {message.confidence && (
                                <div className="mt-1 text-black/50">
                                  Confidence: {Math.round(message.confidence * 100)}% | 
                                  Execution: {message.executionTime}ms | 
                                  Results: {message.resultCount}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="text-xs text-black/40 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className={`max-w-[85%] rounded-lg p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex items-center space-x-2">
                    <Loader size={16} className="animate-spin" />
                    <span className="text-sm">Generating query and searching database...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Sample Questions (when no messages) */}
          {messages.length <= 1 && !isLoading && (
            <div className="px-4 pb-4">
              <div className={`rounded-lg p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className="text-sm font-medium mb-2 flex items-center">
                  <Lightbulb size={14} className="mr-1" />
                  Try these questions:
                </p>
                <div className="space-y-1">
                  {sampleQuestions.slice(0, 3).map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSampleQuestion(question)}
                      className={`block w-full text-left text-xs p-2 rounded transition-colors ${
                        isDarkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
                      }`}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <textarea
                ref={inputRef}
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about procedures, products, research, or anything in the database..."
                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#15396c] focus:border-[#15396c] text-sm resize-none ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !currentMessage.trim()}
                className={`px-4 py-2 rounded-md text-white font-medium text-sm transition-all flex items-center justify-center ${
                  isLoading || !currentMessage.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#15396c] hover:bg-[#15396c]/90'
                }`}
              >
                {isLoading ? (
                  <Loader size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DatabaseChatbot; 
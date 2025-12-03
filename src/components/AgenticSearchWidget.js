/**
 * AgenticSearchWidget - GPT-4o with SQL Function Calling
 *
 * Replaces DatabaseChatbotRAG.js with a simpler, more transparent approach:
 * - No RAG pipeline (routing/retrieval/generation)
 * - Direct SQL queries via GPT-4o function calling
 * - Shows which queries are executed for transparency
 * - Streaming responses for better UX
 */

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader, Database, Lightbulb, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { agenticSearch, checkAgenticSearchStatus } from '../services/ai/agenticSearchService';
import { chatInputSchema } from '../utils/validationSchemas';
import { useDraggable } from '../hooks/useDraggable';
import { isAIChatbotEnabled } from '../services/featureFlagsService';

function AgenticSearchWidget() {
  const { isDarkMode } = useTheme();
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [agenticStatus, setAgenticStatus] = useState(null);
  const [showFunctionCalls, setShowFunctionCalls] = useState({});
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Draggable functionality
  const { position, isDragging, handleMouseDown, resetPosition } = useDraggable({
    x: null, // null = use CSS positioning (bottom-6 left-6)
    y: null,
  });

  // Sample questions for agentic search
  const sampleQuestions = [
    "What products are recommended for Type 2 gingivitis in the Acute phase?",
    "Show me competitive advantages for PerioChip",
    "What's the clinical evidence for chlorhexidine products?",
    "Find research articles about periodontal surgery",
    "What products work for periodontitis maintenance?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Check agentic search status on mount
  useEffect(() => {
    const status = checkAgenticSearchStatus();
    setAgenticStatus(status);
  }, []);

  // Check if chatbot feature is enabled
  useEffect(() => {
    const checkFeatureFlag = async () => {
      const enabled = await isAIChatbotEnabled();
      setChatbotEnabled(enabled);
    };
    checkFeatureFlag();
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add welcome message
      setMessages([{
        id: Date.now(),
        type: 'assistant',
        content: `👋 Hi! I'm PRISM AI, powered by GPT-4o-mini.\n\nI can search our product database, competitive intelligence, and research articles to answer your questions.\n\nWhat would you like to know?`,
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, messages.length]);

  if (!isAuthenticated) {
    return null;
  }

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading || isStreaming) return;

    // Check agentic search status
    if (!agenticStatus?.configured) {
      const errorMsg = {
        id: Date.now(),
        type: 'assistant',
        content: "❌ Agentic search is not configured. Please ensure OpenAI API key and Supabase credentials are set in .env.local",
        timestamp: new Date(),
        error: true,
      };
      setMessages(prev => [...prev, errorMsg]);
      return;
    }

    // Validate input
    try {
      await chatInputSchema.validate(currentMessage);
    } catch (validationError) {
      const errorMessage = {
        id: Date.now(),
        type: 'assistant',
        content: `❌ Invalid input: ${validationError.message}\n\nPlease check your message and try again.`,
        timestamp: new Date(),
        error: true,
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToProcess = currentMessage;
    setCurrentMessage('');
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingMessage('');

    const assistantMessageId = Date.now() + 1;
    const functionCallsForMessage = [];

    try {
      // Execute agentic search with streaming
      const handleStreamChunk = (chunk) => {
        setStreamingMessage(prev => prev + chunk);
      };

      const handleFunctionCall = (functionCall) => {
        functionCallsForMessage.push(functionCall);
      };

      const result = await agenticSearch(
        messageToProcess,
        handleStreamChunk,
        handleFunctionCall,
        conversationHistory
      );

      // Finalize assistant message
      const assistantMessage = {
        id: assistantMessageId,
        type: 'assistant',
        content: result.response,
        timestamp: new Date(),
        functionCalls: result.functionCalls || [],
        executionTime: result.executionTime,
        totalTokens: result.totalTokens,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setConversationHistory(result.conversationHistory || []);
      setStreamingMessage('');
      setIsStreaming(false);

    } catch (error) {
      const errorMessage = {
        id: assistantMessageId,
        type: 'assistant',
        content: `❌ Error: ${error.message}\n\nPlease check your configuration and try again.`,
        timestamp: new Date(),
        error: true,
      };
      setMessages(prev => [...prev, errorMessage]);
      setStreamingMessage('');
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSampleQuestion = (question) => {
    setCurrentMessage(question);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const toggleFunctionCalls = (messageId) => {
    setShowFunctionCalls(prev => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Hide chatbot if feature is disabled
  if (!chatbotEnabled) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 left-6 rounded-full p-4 ${isDarkMode ? 'shadow-lg' : 'shadow-light-lg'} z-50 transition-all duration-250 hover:scale-105 ${
            isDarkMode
              ? 'bg-prism-light-bg-primary hover:bg-prism-light-bg-secondary text-prism-primary border border-prism-light-border-subtle'
              : 'bg-prism-primary-light hover:bg-prism-primary-light-hover text-white border border-prism-primary-light'
          }`}
          title="Ask AI Assistant"
        >
          <div className="relative">
            <Database size={24} />
            {agenticStatus?.ready && (
              <Zap size={12} className="absolute -top-1 -right-1 text-prism-success" />
            )}
          </div>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          data-draggable-container
          className={`fixed w-[500px] h-[600px] rounded-lg ${isDarkMode ? 'shadow-2xl' : 'shadow-light-xl'} z-50 flex flex-col ${
            isDarkMode
              ? 'bg-prism-dark-bg-primary border border-prism-dark-border-subtle'
              : 'bg-prism-light-bg-primary border border-prism-light-border-subtle'
          }`}
          style={{
            left: position.x !== null ? `${position.x}px` : '1.5rem',
            top: position.y !== null ? `${position.y}px` : undefined,
            bottom: position.y === null ? '1.5rem' : undefined,
            transition: isDragging ? 'none' : 'all 0.3s ease',
          }}
        >
          {/* Header - Draggable */}
          <div
            onMouseDown={handleMouseDown}
            className={`flex justify-between items-center p-4 ${isDarkMode ? 'bg-prism-primary' : 'bg-prism-primary-light'} text-white rounded-t-lg ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <h3 className="font-light flex items-center select-none" style={{
              fontFamily: '"Inter", "Helvetica Neue", "Arial", "Segoe UI", sans-serif',
              letterSpacing: '0.1em',
              fontSize: '1.25rem'
            }}>
              <Bot size={20} className="mr-2" />
              <span>PRISM</span>
              <span className="ml-1 text-cyan-300 font-normal">AI</span>
            </h3>
            <div className="flex items-center space-x-3">
              {agenticStatus && (
                <div className={`w-2 h-2 rounded-full ${agenticStatus.ready ? 'bg-prism-success' : 'bg-prism-error'}`}
                     title={agenticStatus.ready ? 'GPT-4o-mini ready' : 'Not configured'} />
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  resetPosition();
                }}
                className="text-white/80 hover:text-white transition-colors duration-250"
              >
                ×
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-3 ${
                  message.type === 'user'
                    ? isDarkMode ? 'bg-prism-primary text-white' : 'bg-prism-primary-light text-white'
                    : message.error
                    ? isDarkMode ? 'bg-prism-error-bg-dark text-prism-dark-text-primary border border-prism-error' : 'bg-prism-error-bg-light text-prism-error border border-prism-error'
                    : isDarkMode ? 'bg-prism-dark-bg-secondary text-prism-dark-text-primary' : 'bg-prism-light-bg-secondary text-prism-light-text-primary'
                }`}>
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>

                  {/* Show function calls for transparency */}
                  {message.type === 'assistant' && message.functionCalls && message.functionCalls.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-black/10">
                      <button
                        onClick={() => toggleFunctionCalls(message.id)}
                        className="flex items-center text-xs text-black/60 hover:text-black/80 transition-colors"
                      >
                        <Database size={12} className="mr-1" />
                        {showFunctionCalls[message.id] ? 'Hide' : 'Show'} Queries ({message.functionCalls.length})
                        {showFunctionCalls[message.id] ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
                      </button>

                      {showFunctionCalls[message.id] && (
                        <div className="mt-2 p-2 bg-black/5 rounded text-xs space-y-2">
                          {message.functionCalls.map((fc, index) => (
                            <div key={index} className={`p-2 rounded ${fc.success ? 'bg-green-50' : 'bg-red-50'}`}>
                              <div className="font-medium">
                                {index + 1}. {fc.name}
                              </div>
                              <div className="text-black/60 mt-1">
                                {JSON.stringify(fc.arguments, null, 2)}
                              </div>
                              {!fc.success && fc.error && (
                                <div className="text-red-600 mt-1">
                                  Error: {fc.error}
                                </div>
                              )}
                              {fc.success && fc.result && (
                                <div className="text-black/60 mt-1">
                                  Results: {Array.isArray(fc.result) ? fc.result.length : '1'} record(s)
                                </div>
                              )}
                            </div>
                          ))}

                          {message.executionTime && (
                            <div className="text-black/50 mt-2 pt-2 border-t border-black/10 font-medium">
                              Total time: {message.executionTime}ms
                            </div>
                          )}

                          {message.totalTokens && (
                            <div className="text-black/50">
                              Tokens: {message.totalTokens}
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

            {/* Streaming message */}
            {isStreaming && streamingMessage && (
              <div className="flex justify-start">
                <div className={`max-w-[85%] rounded-lg p-3 ${isDarkMode ? 'bg-prism-dark-bg-secondary text-prism-dark-text-primary' : 'bg-prism-light-bg-secondary text-prism-light-text-primary'}`}>
                  <div className="whitespace-pre-wrap text-sm">{streamingMessage}</div>
                  <div className={`mt-2 flex items-center text-xs ${isDarkMode ? 'text-prism-dark-text-secondary' : 'text-prism-light-text-secondary'}`}>
                    <Loader size={12} className="animate-spin mr-1" />
                    Generating...
                  </div>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && !isStreaming && (
              <div className="flex justify-start">
                <div className={`max-w-[85%] rounded-lg p-3 ${isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-prism-light-bg-secondary'}`}>
                  <div className="flex items-center space-x-2">
                    <Loader size={16} className="animate-spin" />
                    <span className={`text-sm ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>Querying database...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sample Questions */}
          {messages.length <= 1 && !isLoading && (
            <div className="px-4 pb-3">
              <div className={`rounded-lg p-2 ${isDarkMode ? 'bg-prism-dark-bg-secondary' : 'bg-prism-light-bg-secondary'}`}>
                <p className={`text-xs font-medium mb-1.5 flex items-center ${isDarkMode ? 'text-prism-dark-text-primary' : 'text-prism-light-text-primary'}`}>
                  <Lightbulb size={12} className="mr-1" />
                  Try these questions:
                </p>
                <div className="space-y-0.5">
                  {sampleQuestions.slice(0, 3).map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSampleQuestion(question)}
                      className={`block w-full text-left text-xs p-1.5 rounded transition-colors duration-250 ${
                        isDarkMode
                          ? 'hover:bg-prism-dark-bg-hover text-prism-dark-text-secondary'
                          : 'hover:bg-prism-light-bg-hover text-prism-light-text-secondary'
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
          <div className={`p-4 border-t ${isDarkMode ? 'border-prism-dark-border-subtle' : 'border-prism-light-border-subtle'}`}>
            <div className="flex space-x-2">
              <textarea
                ref={inputRef}
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about products, procedures, competitive advantages..."
                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${isDarkMode ? 'focus:ring-prism-primary focus:border-prism-primary' : 'focus:ring-prism-primary-light focus:border-prism-primary-light'} text-sm resize-none transition-all duration-250 ${
                  isDarkMode
                    ? 'bg-prism-dark-bg-secondary border-prism-dark-border-elevated text-prism-dark-text-primary placeholder-prism-dark-text-tertiary'
                    : 'bg-prism-light-bg-primary border-prism-light-border-elevated text-prism-light-text-primary placeholder-prism-light-text-tertiary'
                }`}
                rows={2}
                disabled={isLoading || isStreaming}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || isStreaming || !currentMessage.trim()}
                className={`px-4 py-2 rounded-md text-white font-medium text-sm transition-all duration-250 flex items-center justify-center ${
                  isLoading || isStreaming || !currentMessage.trim()
                    ? isDarkMode ? 'bg-prism-dark-text-disabled cursor-not-allowed' : 'bg-prism-light-text-disabled cursor-not-allowed'
                    : isDarkMode ? 'bg-prism-primary hover:bg-prism-primary-hover' : 'bg-prism-primary-light hover:bg-prism-primary-light-hover'
                }`}
              >
                {isLoading || isStreaming ? (
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

export default AgenticSearchWidget;

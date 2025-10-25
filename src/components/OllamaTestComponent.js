import React, { useState } from 'react';

const OllamaTestComponent = () => {
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log('🧪 TEST:', message);
  };

  const testOllamaConnection = async () => {
    setLogs([]);
    addLog('Starting Ollama connection test...');
    
    try {
      // Test 1: Check if Ollama is running
      addLog('Test 1: Checking if Ollama is running...');
      const healthResponse = await fetch('http://localhost:11434/api/tags');
      addLog(`Health check status: ${healthResponse.status}`);
      
      if (!healthResponse.ok) {
        addLog('❌ Ollama is not responding');
        setStatus('❌ Ollama is not running');
        return;
      }
      
      const healthData = await healthResponse.json();
      addLog(`✅ Ollama is running with ${healthData.models?.length || 0} models`);
      
      // Test 2: List available models
      addLog('Test 2: Listing available models...');
      healthData.models.forEach(model => {
        addLog(`  - ${model.name} (${(model.size / 1e9).toFixed(1)}GB)`);
      });
      
      // Test 3: Try a simple generation
      addLog('Test 3: Testing simple generation...');
      const testRequest = {
        model: 'sqlcoder:7b',
        prompt: 'SELECT',
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 50
        }
      };
      
      addLog('Sending test request...');
      const generateResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testRequest),
      });
      
      addLog(`Generation response status: ${generateResponse.status}`);
      
      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        addLog(`❌ Generation failed: ${errorText}`);
        setStatus('❌ Generation test failed');
        return;
      }
      
      const generateData = await generateResponse.json();
      addLog(`✅ Generation successful: "${generateData.response}"`);
      
      // Test 4: Test with environment variables
      addLog('Test 4: Testing with environment variables...');
      addLog(`REACT_APP_OLLAMA_BASE_URL: ${process.env.REACT_APP_OLLAMA_BASE_URL || 'not set'}`);
      addLog(`REACT_APP_OLLAMA_MODEL: ${process.env.REACT_APP_OLLAMA_MODEL || 'not set'}`);
      
      setStatus('✅ All tests passed!');
      
    } catch (error) {
      addLog(`❌ Test failed with error: ${error.message}`);
      setStatus(`❌ Test failed: ${error.message}`);
    }
  };

  const testLLMService = async () => {
    setLogs([]);
    addLog('Starting LLM Service test...');
    
    try {
      const { llmService } = await import('../services/llmService.js');
      addLog('✅ LLM Service imported successfully');
      
      addLog('Testing SQL generation...');
      addLog('🔍 About to call generateSQL...');
      const result = await llmService.generateSQL('find all products');
      addLog(`✅ SQL generated successfully!`);
      addLog(`📄 SQL (raw): ${JSON.stringify(result.sql)}`);
      addLog(`📄 SQL (formatted): ${result.sql}`);
      addLog(`📄 Explanation: ${result.explanation}`);
      addLog(`📄 Confidence: ${result.confidence}`);
      setStatus('✅ LLM Service test passed!');
      
    } catch (error) {
      addLog(`❌ LLM Service test failed: ${error.message}`);
      addLog(`❌ Error details: ${error.stack || 'No stack trace'}`);
      setStatus(`❌ LLM Service failed: ${error.message}`);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      width: '400px', 
      background: 'white', 
      border: '2px solid #007bff', 
      borderRadius: '8px', 
      padding: '16px',
      zIndex: 9999,
      maxHeight: '500px',
      overflow: 'auto',
      fontSize: '12px'
    }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#007bff' }}>🧪 Ollama Debug Panel</h3>
      
      <div style={{ marginBottom: '16px' }}>
        <button 
          onClick={testOllamaConnection}
          style={{ 
            marginRight: '8px', 
            padding: '8px 12px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Test Direct Connection
        </button>
        <button 
          onClick={testLLMService}
          style={{ 
            padding: '8px 12px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Test LLM Service
        </button>
      </div>

      <div style={{ 
        marginBottom: '8px', 
        fontWeight: 'bold',
        color: status.includes('✅') ? '#28a745' : '#dc3545'
      }}>
        {status}
      </div>

      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '8px', 
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '11px',
        maxHeight: '300px',
        overflow: 'auto'
      }}>
        {logs.map((log, index) => (
          <div key={index}>{log}</div>
        ))}
      </div>
    </div>
  );
};

export default OllamaTestComponent; 
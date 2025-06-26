import React, { useState } from 'react';
import { GroqService } from '../services/groqService';

const APITestButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');

  const testAPI = async () => {
    setIsLoading(true);
    setResult('Testing...');
    
    // First check if API key is configured
    if (!GroqService.isConfigured()) {
      setResult('❌ No Groq API key found. Please add VITE_GROQ_API_KEY to your .env file');
      setIsLoading(false);
      return;
    }

    try {
      const success = await GroqService.testConnection();
      setResult(success ? '✅ API Connected Successfully!' : '❌ API Connection Failed - Check your API key');
    } catch (error) {
      setResult(`❌ API Error: ${error.message}`);
      console.error('Full error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const apiKeyStatus = GroqService.isConfigured() ? '✅ API Key Found' : '❌ API Key Missing';

  return (
    <div style={{ 
      padding: '1rem', 
      background: '#f8fafc', 
      borderRadius: '8px', 
      margin: '1rem',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#718096' }}>
        <strong>Groq API Status:</strong> {apiKeyStatus}
      </div>
      
      <button 
        onClick={testAPI} 
        disabled={isLoading || !GroqService.isConfigured()}
        style={{
          padding: '0.5rem 1rem',
          background: GroqService.isConfigured() ? '#6c5ce7' : '#a0aec0',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: GroqService.isConfigured() ? 'pointer' : 'not-allowed',
          marginRight: '1rem'
        }}
      >
        {isLoading ? 'Testing...' : 'Test Groq API'}
      </button>

      {!GroqService.isConfigured() && (
        <div style={{ 
          marginTop: '0.5rem', 
          padding: '0.5rem',
          background: '#fed7d7',
          borderRadius: '4px',
          fontSize: '0.8rem',
          color: '#c53030'
        }}>
          <strong>Setup Required:</strong>
          <ol style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
            <li>Get your API key from <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer">console.groq.com</a></li>
            <li>Create a <code>.env</code> file in your project root</li>
            <li>Add: <code>VITE_GROQ_API_KEY=your_api_key_here</code></li>
            <li>Restart your development server</li>
          </ol>
        </div>
      )}

      {result && (
        <div style={{ 
          marginTop: '0.5rem', 
          fontSize: '0.9rem',
          padding: '0.5rem',
          borderRadius: '4px',
          background: result.includes('✅') ? '#c6f6d5' : '#fed7d7',
          color: result.includes('✅') ? '#22543d' : '#c53030'
        }}>
          {result}
        </div>
      )}

      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#718096' }}>
        Available Models: {Object.values(GroqService.getAvailableModels()).join(', ')}
      </div>
    </div>
  );
};

export default APITestButton;
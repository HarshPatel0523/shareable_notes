import { useState, useEffect } from 'react';
import { GroqService } from '../services/groqService';
import './AIInsightsPanel.css';

const AIInsightsPanel = ({ note, allNotes, isOpen, onClose }) => {
  const [insights, setInsights] = useState(null);
  const [relatedNotes, setRelatedNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('insights');

  useEffect(() => {
    if (isOpen && note && note.content.trim().length > 50) {
      generateInsights();
    }
  }, [isOpen, note?.id]);

  const generateInsights = async () => {
    if (!note?.content || note.isEncrypted) return;

    setIsLoading(true);
    try {
      // Get text content without HTML
      const textContent = note.content.replace(/<[^>]*>/g, '').trim();
      
      if (textContent.length < 50) {
        setInsights({
          summary: "Note is too short for meaningful analysis",
          keyThemes: [],
          suggestions: ["Add more content to get better insights"],
          relatedTopics: [],
          readingTime: "< 1 minute",
          complexity: "simple",
          tags: []
        });
        setIsLoading(false);
        return;
      }

      const [insightsData, related] = await Promise.all([
        GroqService.generateInsights(textContent, allNotes),
        GroqService.findRelatedNotes(note, allNotes)
      ]);

      setInsights(insightsData);
      setRelatedNotes(related);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      setInsights({
        summary: "Failed to generate insights",
        keyThemes: [],
        suggestions: [],
        relatedTopics: [],
        readingTime: "Unknown",
        complexity: "moderate",
        tags: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!note?.content) return;

    setIsLoading(true);
    try {
      const textContent = note.content.replace(/<[^>]*>/g, '').trim();
      const summary = await GroqService.summarizeNote(textContent);
      
      // You can handle the summary here - maybe show it in a modal or copy to clipboard
      navigator.clipboard.writeText(summary);
      alert('Summary copied to clipboard!');
    } catch (error) {
      console.error('Summarization failed:', error);
      alert('Failed to generate summary');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ai-insights-panel">
      <div className="insights-header">
        <h3>🤖 AI Insights</h3>
        <button className="close-insights" onClick={onClose}>×</button>
      </div>

      <div className="insights-tabs">
        <button 
          className={`tab ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          Insights
        </button>
        <button 
          className={`tab ${activeTab === 'related' ? 'active' : ''}`}
          onClick={() => setActiveTab('related')}
        >
          Related Notes
        </button>
        <button 
          className={`tab ${activeTab === 'actions' ? 'active' : ''}`}
          onClick={() => setActiveTab('actions')}
        >
          Actions
        </button>
      </div>

      <div className="insights-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Analyzing your note...</p>
          </div>
        ) : (
          <>
            {activeTab === 'insights' && insights && (
              <div className="insights-tab">
                <div className="insight-section">
                  <h4>📝 Summary</h4>
                  <p>{insights.summary}</p>
                </div>

                <div className="insight-section">
                  <h4>🎯 Key Themes</h4>
                  <div className="themes">
                    {insights.keyThemes.map((theme, index) => (
                      <span key={index} className="theme-tag">{theme}</span>
                    ))}
                  </div>
                </div>

                <div className="insight-section">
                  <h4>💡 Suggestions</h4>
                  <ul>
                    {insights.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>

                <div className="insight-section">
                  <h4>🏷️ Auto Tags</h4>
                  <div className="tags">
                    {insights.tags.map((tag, index) => (
                      <span key={index} className="auto-tag">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="insight-meta">
                  <span className="reading-time">📖 {insights.readingTime}</span>
                  <span className="complexity">🎚️ {insights.complexity}</span>
                </div>
              </div>
            )}

            {activeTab === 'related' && (
              <div className="related-tab">
                {relatedNotes.length > 0 ? (
                  relatedNotes.map((relatedNote) => (
                    <div key={relatedNote.id} className="related-note">
                      <h5>{relatedNote.title}</h5>
                      <p>{relatedNote.content.replace(/<[^>]*>/g, '').substring(0, 100)}...</p>
                    </div>
                  ))
                ) : (
                  <p>No related notes found</p>
                )}
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="actions-tab">
                <button className="action-btn" onClick={handleSummarize} disabled={isLoading}>
                  📄 Generate Summary
                </button>
                <button className="action-btn" onClick={generateInsights} disabled={isLoading}>
                  🔄 Refresh Insights
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AIInsightsPanel;
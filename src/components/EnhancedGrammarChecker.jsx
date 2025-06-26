/* eslint-disable no-cond-assign */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GroqService } from '../services/groqService';
import './EnhancedGrammarChecker.css';

const EnhancedGrammarChecker = ({ children }) => {
  const containerRef = useRef(null);
  const [grammarErrors, setGrammarErrors] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [tooltip, setTooltip] = useState({ show: false, error: null, x: 0, y: 0 });
  const lastCheckedContent = useRef('');
  const checkTimeoutRef = useRef(null);

  // Helper function to get text nodes
  const getTextNodes = useCallback((element) => {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    return textNodes;
  }, []);

  // Function to highlight errors
  const highlightErrors = useCallback((contentDiv, errors) => {
    if (!contentDiv || !errors.length) return;

    // Remove existing highlights
    const existingHighlights = contentDiv.querySelectorAll('.grammar-error-highlight');
    existingHighlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
        parent.normalize();
      }
    });

    // Add new highlights (limit to first 10 errors to prevent performance issues)
    const limitedErrors = errors.slice(0, 10);
    limitedErrors.forEach((error, index) => {
      try {
        const textNodes = getTextNodes(contentDiv);
        let currentPos = 0;
        
        for (let textNode of textNodes) {
          const nodeText = textNode.textContent;
          const nodeEnd = currentPos + nodeText.length;
          
          if (error.start >= currentPos && error.end <= nodeEnd) {
            const startOffset = error.start - currentPos;
            const endOffset = error.end - currentPos;
            
            if (startOffset >= 0 && endOffset <= nodeText.length && endOffset > startOffset) {
              const range = document.createRange();
              range.setStart(textNode, startOffset);
              range.setEnd(textNode, endOffset);
              
              const span = document.createElement('span');
              span.className = 'grammar-error-highlight';
              span.setAttribute('data-error-index', index);
              
              try {
                range.surroundContents(span);
              } catch (e) {
                // If surroundContents fails, try extracting and inserting
                const contents = range.extractContents();
                span.appendChild(contents);
                range.insertNode(span);
              }
              break;
            }
          }
          currentPos = nodeEnd;
        }
      } catch (e) {
        console.warn('Failed to highlight error:', error, e);
      }
    });
  }, [getTextNodes]);

  // Debounce utility
  const debounce = useCallback((func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }, []);

  // Debounced grammar check function
  const debouncedGrammarCheck = useCallback(
    debounce(async (content) => {
      // Don't check if content is too short or same as last check
      if (content.length < 20 || content === lastCheckedContent.current) {
        return;
      }

      lastCheckedContent.current = content;
      setIsChecking(true);

      try {
        const errors = await GroqService.analyzeGrammar(content);
        setGrammarErrors(errors || []);
        
        // Get the content div and highlight errors
        const contentDiv = containerRef.current?.querySelector('.content-editable');
        if (contentDiv) {
          highlightErrors(contentDiv, errors || []);
        }
      } catch (error) {
        console.error('Grammar check failed:', error);
        setGrammarErrors([]);
      } finally {
        setIsChecking(false);
      }
    }, 3000), // Increased debounce time to 3 seconds
    [highlightErrors, debounce]
  );

  // Mouse event handlers
  const handleMouseOver = useCallback((e) => {
    if (e.target.classList.contains('grammar-error-highlight')) {
      const errorIndex = parseInt(e.target.getAttribute('data-error-index'));
      const error = grammarErrors[errorIndex];
      
      if (error) {
        const rect = e.target.getBoundingClientRect();
        setTooltip({
          show: true,
          error: error,
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
      }
    }
  }, [grammarErrors]);

  const handleMouseOut = useCallback((e) => {
    if (e.target.classList.contains('grammar-error-highlight')) {
      setTooltip({ show: false, error: null, x: 0, y: 0 });
    }
  }, []);

  // Apply suggestion function
  const applySuggestion = useCallback((error) => {
    const contentDiv = containerRef.current?.querySelector('.content-editable');
    if (!contentDiv) return;

    const highlights = contentDiv.querySelectorAll(`[data-error-index="${grammarErrors.indexOf(error)}"]`);
    highlights.forEach(highlight => {
      highlight.textContent = error.suggestion;
      highlight.className = 'grammar-fixed';
    });

    setTooltip({ show: false, error: null, x: 0, y: 0 });
    
    // Trigger content update
    const event = new Event('input', { bubbles: true });
    contentDiv.dispatchEvent(event);
  }, [grammarErrors]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          shouldCheck = true;
        }
      });
      
      if (shouldCheck) {
        const contentDiv = container.querySelector('.content-editable');
        if (contentDiv) {
          const textContent = contentDiv.textContent || '';
          // Only check if content has changed significantly
          if (Math.abs(textContent.length - lastCheckedContent.current.length) > 10) {
            debouncedGrammarCheck(textContent);
          }
        }
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });

    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);

    // Initial check after a delay
    const initialCheckTimeout = setTimeout(() => {
      const contentDiv = container.querySelector('.content-editable');
      if (contentDiv) {
        const textContent = contentDiv.textContent || '';
        if (textContent.length > 20) {
          debouncedGrammarCheck(textContent);
        }
      }
    }, 2000);

    return () => {
      observer.disconnect();
      container.removeEventListener('mouseover', handleMouseOver);
      container.removeEventListener('mouseout', handleMouseOut);
      clearTimeout(initialCheckTimeout);
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [debouncedGrammarCheck, handleMouseOver, handleMouseOut]);

  return (
    <div ref={containerRef} className="enhanced-grammar-checker">
      {children}
      
      {isChecking && (
        <div className="grammar-checking-indicator">
          <div className="spinner-small"></div>
          Checking grammar...
        </div>
      )}

      {tooltip.show && tooltip.error && (
        <div 
          className="grammar-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y
          }}
        >
          <div className="tooltip-content">
            <div className="error-type">{tooltip.error.type}</div>
            <div className="error-message">{tooltip.error.message}</div>
            <div className="error-suggestion">
              <strong>Suggestion:</strong> {tooltip.error.suggestion}
            </div>
            <button 
              className="apply-suggestion"
              onClick={() => applySuggestion(tooltip.error)}
            >
              Apply Fix
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedGrammarChecker;
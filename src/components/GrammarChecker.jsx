/* eslint-disable no-unused-vars */
import React, { useEffect, useRef } from 'react';
import './GrammarChecker.css';

// Simple grammar rules - you can expand this or integrate with a real grammar checking API
const GRAMMAR_RULES = [
  {
    pattern: /\bi\b/g,
    replacement: 'I',
    message: 'The pronoun "I" should always be capitalized.'
  },
  {
    pattern: /\b(your|you're)\s+(welcome|wellcome)\b/gi,
    message: 'Did you mean "you\'re welcome" or "your welcome"?'
  },
  {
    pattern: /\b(there|their|they're)\b/gi,
    message: 'Check if you\'re using the correct form: there/their/they\'re'
  },
  {
    pattern: /\b(its|it's)\b/gi,
    message: 'Check if you\'re using the correct form: its (possessive) or it\'s (it is)'
  },
  {
    pattern: /\bthen\s+than\b/gi,
    message: 'Did you mean "than" (comparison) instead of "then"?'
  },
  {
    pattern: /\bthan\s+then\b/gi,
    message: 'Did you mean "then" (sequence) instead of "than"?'
  },
  {
    pattern: /\b(could|should|would)\s+of\b/gi,
    message: 'Did you mean "could have", "should have", or "would have"?'
  },
  {
    pattern: /[.!?]\s*[a-z]/g,
    message: 'Consider capitalizing the letter after a sentence-ending punctuation.'
  },
  {
    pattern: /\s{2,}/g,
    message: 'Multiple spaces detected. Consider using single spaces.'
  }
];

const GrammarChecker = ({ children }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const checkGrammar = () => {
      if (!containerRef.current) return;

      const contentDiv = containerRef.current.querySelector('.content-editable');
      if (!contentDiv) return;

      // Get text content without HTML
      const textContent = contentDiv.textContent || '';
      
      // Remove existing grammar highlights
      let html = contentDiv.innerHTML;
      html = html.replace(/<span class="grammar-error"[^>]*>(.*?)<\/span>/gi, '$1');

      // Apply grammar rules
      GRAMMAR_RULES.forEach((rule, index) => {
        if (rule.pattern && textContent.match(rule.pattern)) {
          // For simple highlighting, we'll just add a class
          // In a real implementation, you'd want more sophisticated parsing
          const matches = textContent.match(rule.pattern);
          if (matches) {
            matches.forEach(match => {
              const regex = new RegExp(`\\b${match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
              html = html.replace(regex, `<span class="grammar-error" title="${rule.message}">${match}</span>`);
            });
          }
        }
      });

      if (html !== contentDiv.innerHTML) {
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        
        contentDiv.innerHTML = html;
        
        // Restore selection if it existed
        if (range) {
          try {
            selection.removeAllRanges();
            selection.addRange(range);
          } catch (e) {
            // Selection restoration failed, ignore
          }
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      const observer = new MutationObserver((mutations) => {
        let shouldCheck = false;
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            shouldCheck = true;
          }
        });
        if (shouldCheck) {
          setTimeout(checkGrammar, 500); // Debounce for performance
        }
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true
      });

      // Initial check
      setTimeout(checkGrammar, 100);

      return () => {
        observer.disconnect();
      };
    }
  }, []);

  return (
    <div ref={containerRef} className="grammar-checker">
      {children}
    </div>
  );
};

export default GrammarChecker;
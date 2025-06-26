import React, { useEffect, useRef, useState } from 'react';
import './GlossaryHighlighter.css';

// Sample glossary - you can expand this or load from an API
const GLOSSARY = {
  'javascript': 'A high-level, interpreted programming language that conforms to the ECMAScript specification.',
  'react': 'A JavaScript library for building user interfaces, maintained by Facebook.',
  'component': 'A reusable piece of code that defines how a certain part of the UI should appear.',
  'state': 'An object that holds some information that may change over the lifetime of the component.',
  'props': 'Short for properties, these are arguments passed into React components.',
  'api': 'Application Programming Interface - a set of protocols and tools for building software applications.',
  'database': 'An organized collection of structured information, or data, typically stored electronically.',
  'algorithm': 'A process or set of rules to be followed in calculations or other problem-solving operations.',
  'function': 'A block of code designed to perform a particular task.',
  'variable': 'A storage location with an associated name that contains data.',
  'array': 'A data structure consisting of a collection of elements, each identified by an index.',
  'object': 'A collection of properties, where each property is an association between a name and a value.',
  'loop': 'A programming construct that repeats a block of code.',
  'conditional': 'A programming construct that performs different actions based on whether a condition is true or false.',
  'recursion': 'A programming technique where a function calls itself to solve a problem.',
  'css': 'Cascading Style Sheets - a style sheet language used for describing the presentation of a document.',
  'html': 'HyperText Markup Language - the standard markup language for creating web pages.',
  'node': 'A JavaScript runtime built on Chrome\'s V8 JavaScript engine.',
  'npm': 'Node Package Manager - a package manager for JavaScript.',
  'git': 'A distributed version control system for tracking changes in source code.',
  'repository': 'A storage location for software packages or source code.',
  'branch': 'A parallel version of a repository that allows you to work on different features.',
  'commit': 'A snapshot of your repository at a specific point in time.',
  'merge': 'The process of combining changes from different branches.',
  'pull request': 'A method of submitting contributions to a project.',
  'issue': 'A way to track bugs, feature requests, and other tasks in a project.',
  'documentation': 'Written text or illustration that accompanies computer software.',
  'debugging': 'The process of finding and resolving defects in computer programs.',
  'testing': 'The process of evaluating a system to detect differences between expected and actual results.',
  'deployment': 'The process of installing, configuring, and enabling software to run in a production environment.'
};

const GlossaryHighlighter = ({ children }) => {
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const highlightTerms = () => {
      if (!containerRef.current) return;

      const contentDiv = containerRef.current.querySelector('.content-editable');
      if (!contentDiv) return;

      let html = contentDiv.innerHTML;
      
      // Remove existing highlights
      html = html.replace(/<span class="glossary-term"[^>]*>(.*?)<\/span>/gi, '$1');

      // Highlight glossary terms
      Object.keys(GLOSSARY).forEach(term => {
        const regex = new RegExp(`\\b(${term})\\b`, 'gi');
        html = html.replace(regex, (match) => {
          return `<span class="glossary-term" data-term="${term.toLowerCase()}">${match}</span>`;
        });
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
            console.warn('Failed to restore selection:', e);
          }
        }
      }
    };

    const handleMouseOver = (e) => {
      if (e.target.classList.contains('glossary-term')) {
        const term = e.target.getAttribute('data-term');
        const definition = GLOSSARY[term];
        
        if (definition) {
          const rect = e.target.getBoundingClientRect();
          setTooltip({
            show: true,
            content: definition,
            x: rect.left + rect.width / 2,
            y: rect.top - 10
          });
        }
      }
    };

    const handleMouseOut = (e) => {
      if (e.target.classList.contains('glossary-term')) {
        setTooltip({ show: false, content: '', x: 0, y: 0 });
      }
    };

    const container = containerRef.current;
    if (container) {
      // Highlight terms initially and on content changes
      const observer = new MutationObserver((mutations) => {
        let shouldHighlight = false;
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            shouldHighlight = true;
          }
        });
        if (shouldHighlight) {
          setTimeout(highlightTerms, 100); // Debounce
        }
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true
      });

      container.addEventListener('mouseover', handleMouseOver);
      container.addEventListener('mouseout', handleMouseOut);

      // Initial highlighting
      setTimeout(highlightTerms, 100);

      return () => {
        observer.disconnect();
        container.removeEventListener('mouseover', handleMouseOver);
        container.removeEventListener('mouseout', handleMouseOut);
      };
    }
  }, []);

  return (
    <div ref={containerRef} className="glossary-container">
      {children}
      {tooltip.show && (
        <div 
          className="glossary-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default GlossaryHighlighter;
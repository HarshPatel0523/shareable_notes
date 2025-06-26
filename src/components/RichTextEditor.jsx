/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import './RichTextEditor.css';

const RichTextEditor = ({ note, onUpdateNote }) => {
  const [title, setTitle] = useState(note.title);
  const editorRef = useRef(null);
  const [isComposing, setIsComposing] = useState(false);
  const [currentFormat, setCurrentFormat] = useState({
    bold: false,
    italic: false,
    underline: false,
    textAlign: 'left'
  });
  
  // Separate state for font size with its own effect
  const [currentFontSize, setCurrentFontSize] = useState(16);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && note.content !== undefined) {
      if (editorRef.current.innerHTML !== note.content) {
        editorRef.current.innerHTML = note.content || '';
      }
    }
    setTitle(note.title);
  }, [note.id]);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    onUpdateNote(note.id, { title: newTitle });
  };

  // Save content with debouncing
  const saveContent = useCallback(() => {
    if (editorRef.current && !isComposing) {
      const content = editorRef.current.innerHTML;
      onUpdateNote(note.id, { content });
    }
  }, [note.id, onUpdateNote, isComposing]);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(saveContent, 300),
    [saveContent]
  );

  const handleInput = (e) => {
    if (!isComposing) {
      debouncedSave();
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
    saveContent();
  };

  // OPTIMIZED: Font size detection function
  const detectCurrentFontSize = useCallback(() => {
    if (!editorRef.current) return 16;

    try {
      const selection = window.getSelection();
      if (selection.rangeCount === 0) return currentFontSize; // Keep current if no selection

      const range = selection.getRangeAt(0);
      let element = null;

      // Get the element at the current cursor/selection
      if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
        element = range.commonAncestorContainer.parentElement;
      } else if (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE) {
        element = range.commonAncestorContainer;
      }

      // Check for font-size in current element hierarchy
      while (element && element !== editorRef.current) {
        // Check data attribute first (our custom spans)
        if (element.getAttribute && element.getAttribute('data-font-size')) {
          const size = parseInt(element.getAttribute('data-font-size'));
          if (!isNaN(size) && size > 0) {
            return size;
          }
        }

        // Check style attribute
        if (element.style && element.style.fontSize) {
          const size = parseInt(element.style.fontSize);
          if (!isNaN(size) && size > 0) {
            return size;
          }
        }

        // Check computed style as fallback
        try {
          const computedStyle = window.getComputedStyle(element);
          if (computedStyle.fontSize) {
            const size = parseInt(computedStyle.fontSize);
            if (!isNaN(size) && size > 0 && size !== 16) { // Only use if not default
              return size;
            }
          }
        } catch (e) {
          // Ignore computed style errors
        }

        element = element.parentElement;
      }

      return 16; // Default fallback
    } catch (e) {
      console.warn('Error detecting font size:', e);
      return currentFontSize; // Keep current on error
    }
  }, [currentFontSize]);

  // OPTIMIZED: useEffect specifically for font size detection
  useEffect(() => {
    const handleFontSizeChange = () => {
      const newFontSize = detectCurrentFontSize();
      if (newFontSize !== currentFontSize) {
        setCurrentFontSize(newFontSize);
        console.log('Font size changed to:', newFontSize);
      }
    };

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
          handleFontSizeChange();
        }
      }
    };

    // Add event listeners
    document.addEventListener('selectionchange', handleSelectionChange);
    
    // Initial font size detection
    handleFontSizeChange();

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [detectCurrentFontSize, currentFontSize]);

  // Separate useEffect for other formatting states (bold, italic, underline, alignment)
  const updateFormatState = useCallback(() => {
    if (!editorRef.current) return;

    try {
      setCurrentFormat({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        textAlign: getTextAlign()
      });
    } catch (e) {
      console.warn('Error updating format state:', e);
    }
  }, []);

  const getTextAlign = () => {
    try {
      if (document.queryCommandState('justifyCenter')) return 'center';
      if (document.queryCommandState('justifyRight')) return 'right';
      return 'left';
    } catch (e) {
      return 'left';
    }
  };

  // useEffect for other formatting states
  useEffect(() => {
    const handleFormatChange = () => {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
          updateFormatState();
        }
      }
    };

    document.addEventListener('selectionchange', handleFormatChange);
    
    return () => {
      document.removeEventListener('selectionchange', handleFormatChange);
    };
  }, [updateFormatState]);

  const handleMouseUp = () => {
    // Small delay to ensure DOM is updated
    setTimeout(() => {
      const newFontSize = detectCurrentFontSize();
      if (newFontSize !== currentFontSize) {
        setCurrentFontSize(newFontSize);
      }
      updateFormatState();
    }, 10);
  };

  const handleKeyUp = (e) => {
    // Only check font size on navigation keys or after typing
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      setTimeout(() => {
        const newFontSize = detectCurrentFontSize();
        if (newFontSize !== currentFontSize) {
          setCurrentFontSize(newFontSize);
        }
        updateFormatState();
      }, 10);
    }
  };

  // Formatting functions
  const applyFormat = (command, value = null) => {
    editorRef.current.focus();
    
    try {
      document.execCommand(command, false, value);
      setTimeout(updateFormatState, 10);
      saveContent();
    } catch (e) {
      console.warn('Command not supported:', command);
    }
  };

  const toggleBold = () => applyFormat('bold');
  const toggleItalic = () => applyFormat('italic');
  const toggleUnderline = () => applyFormat('underline');

  const setTextAlign = (alignment) => {
    const commands = {
      left: 'justifyLeft',
      center: 'justifyCenter',
      right: 'justifyRight'
    };
    applyFormat(commands[alignment]);
  };

  // OPTIMIZED: Font size change function with immediate state update
  const changeFontSize = (size) => {
    console.log('Changing font size to:', size);
    
    const selection = window.getSelection();
    if (selection.rangeCount === 0) {
      editorRef.current.focus();
      return;
    }

    const range = selection.getRangeAt(0);
    
    if (range.collapsed) {
      // No selection - create a span for future typing
      const span = document.createElement('span');
      span.style.fontSize = size + 'px';
      span.setAttribute('data-font-size', size);
      span.innerHTML = '\u200B'; // Zero-width space
      
      try {
        range.insertNode(span);
        
        // Position cursor inside the span
        const newRange = document.createRange();
        newRange.setStart(span.firstChild, 1);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } catch (e) {
        console.error('Error inserting font size span:', e);
      }
    } else {
      // Text is selected - wrap it in a span with the new font size
      try {
        const selectedContent = range.extractContents();
        const span = document.createElement('span');
        span.style.fontSize = size + 'px';
        span.setAttribute('data-font-size', size);
        
        // Remove any existing font-size styling from selected content
        removeExistingFontSizes(selectedContent);
        
        // Move all selected content into the span
        span.appendChild(selectedContent);
        range.insertNode(span);
        
        // Select the newly formatted text
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } catch (e) {
        console.error('Error applying font size to selection:', e);
      }
    }
    
    // Immediately update font size state
    setCurrentFontSize(parseInt(size));
    
    // Focus back to editor and save
    setTimeout(() => {
      editorRef.current.focus();
      saveContent();
    }, 10);
  };

  // Helper function to remove existing font-size styling
  const removeExistingFontSizes = (node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.style && node.style.fontSize) {
        node.style.fontSize = '';
      }
      if (node.getAttribute && node.getAttribute('data-font-size')) {
        node.removeAttribute('data-font-size');
      }
      
      // Process child nodes
      for (let child of Array.from(node.childNodes)) {
        removeExistingFontSizes(child);
      }
    }
  };

  const insertList = (ordered = false) => {
    const command = ordered ? 'insertOrderedList' : 'insertUnorderedList';
    applyFormat(command);
  };

  const handleKeyDown = (e) => {
    // Handle special key combinations
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          toggleBold();
          break;
        case 'i':
          e.preventDefault();
          toggleItalic();
          break;
        case 'u':
          e.preventDefault();
          toggleUnderline();
          break;
      }
    }
    
    // Handle Enter key to ensure proper line breaks
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const br = document.createElement('br');
        range.deleteContents();
        range.insertNode(br);
        range.setStartAfter(br);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        e.preventDefault();
        saveContent();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    const selection = window.getSelection();
    
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      // Split text by lines and insert with proper breaks
      const lines = text.split('\n');
      lines.forEach((line, index) => {
        if (index > 0) {
          range.insertNode(document.createElement('br'));
        }
        const textNode = document.createTextNode(line);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
      });
      
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    saveContent();
  };

  return (
    <div className="rich-text-editor">
      <div className="editor-header">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          className="note-title-input"
          placeholder="Note title..."
        />
        <div className="note-meta">
          <span className="note-date">
            Last updated: {new Date(note.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="editor-toolbar">
        <div className="toolbar-group">
          <button
            className={`toolbar-btn ${currentFormat.bold ? 'active' : ''}`}
            onClick={toggleBold}
            title="Bold (Ctrl+B)"
            type="button"
          >
            <strong>B</strong>
          </button>
          <button
            className={`toolbar-btn ${currentFormat.italic ? 'active' : ''}`}
            onClick={toggleItalic}
            title="Italic (Ctrl+I)"
            type="button"
          >
            <em>I</em>
          </button>
          <button
            className={`toolbar-btn ${currentFormat.underline ? 'active' : ''}`}
            onClick={toggleUnderline}
            title="Underline (Ctrl+U)"
            type="button"
          >
            <u>U</u>
          </button>
        </div>

        <div className="toolbar-group">
          <select 
            className="font-size-select"
            value={currentFontSize}
            onChange={(e) => changeFontSize(parseInt(e.target.value))}
            title="Font Size"
          >
            <option value="10">10px</option>
            <option value="12">12px</option>
            <option value="14">14px</option>
            <option value="16">16px</option>
            <option value="18">18px</option>
            <option value="20">20px</option>
            <option value="24">24px</option>
            <option value="28">28px</option>
            <option value="32">32px</option>
            <option value="36">36px</option>
            <option value="48">48px</option>
          </select>
          <span className="current-font-size">Current: {currentFontSize}px</span>
        </div>

        <div className="toolbar-group">
          <button
            className={`toolbar-btn ${currentFormat.textAlign === 'left' ? 'active' : ''}`}
            onClick={() => setTextAlign('left')}
            title="Align Left"
            type="button"
          >
            ⬅
          </button>
          <button
            className={`toolbar-btn ${currentFormat.textAlign === 'center' ? 'active' : ''}`}
            onClick={() => setTextAlign('center')}
            title="Align Center"
            type="button"
          >
            ↔
          </button>
          <button
            className={`toolbar-btn ${currentFormat.textAlign === 'right' ? 'active' : ''}`}
            onClick={() => setTextAlign('right')}
            title="Align Right"
            type="button"
          >
            ➡
          </button>
        </div>

        <div className="toolbar-group">
          <button
            className="toolbar-btn"
            onClick={() => insertList(false)}
            title="Bullet List"
            type="button"
          >
            • List
          </button>
          <button
            className="toolbar-btn"
            onClick={() => insertList(true)}
            title="Numbered List"
            type="button"
          >
            1. List
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div
          ref={editorRef}
          className="content-editable"
          contentEditable
          suppressContentEditableWarning={true}
          onInput={handleInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onMouseUp={handleMouseUp}
          onPaste={handlePaste}
          data-placeholder="Start writing your note..."
          dir="ltr"
          style={{ textAlign: 'left', direction: 'ltr' }}
        />
      </div>
    </div>
  );
};

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default RichTextEditor;
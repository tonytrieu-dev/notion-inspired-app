import React, { useRef, useMemo, useCallback } from 'react';
import type { ClassWithRelations, Position } from '../types/database';
import { useChatbot } from '../hooks/useChatbot';
import { useDragAndResize } from '../hooks/useDragAndResize';
import ChatbotAutocomplete from './ChatbotAutocomplete';

interface ChatbotPanelProps {
  selectedClass: ClassWithRelations | null;
  classes: ClassWithRelations[];
  show: boolean;
  onClose: () => void;
  position: Position;
  onPositionChange: (position: Position) => void;
  height: number;
  onHeightChange: (height: number) => void;
  fontSize: number;
}

const ChatbotPanel: React.FC<ChatbotPanelProps> = ({ 
  selectedClass,
  classes,
  show, 
  onClose,
  position,
  onPositionChange,
  height,
  onHeightChange,
  fontSize 
}) => {
  const chatbotRef = useRef<HTMLDivElement>(null);
  
  // Custom hooks for chatbot functionality
  const {
    chatQuery,
    chatHistory,
    isChatLoading,
    chatContentRef,
    handleInputChange,
    handleAskChatbot,
    handleKeyDown,
    clearChatHistory,
    mentionHook,
    currentCursor,
    setCursorPosition,
    setIsProcessingMention,
  } = useChatbot({ selectedClass, classes });

  // Custom hook for drag and resize functionality
  const {
    isResizing,
    isDragging,
    handleDragStart,
    handleResizeStart,
  } = useDragAndResize({
    position,
    onPositionChange,
    height,
    onHeightChange,
  });

  // Handle autocomplete selection
  const handleAutocompleteSelect = useCallback((classObj: ClassWithRelations, index: number) => {
    const chatInput = document.querySelector('[data-element-type="chat-input"]') as HTMLElement;
    if (chatInput) {
      // Set processing flag to prevent input handler interference
      setIsProcessingMention(true);
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setIsProcessingMention(false);
        return;
      }
      
      const originalText = chatInput.textContent || '';
      const beforeCursor = originalText.substring(0, currentCursor);
      const atIndex = beforeCursor.lastIndexOf('@');
      
      if (atIndex !== -1) {
        // Create a range that selects from the @ symbol to the current cursor position
        const range = document.createRange();
        const textNode = chatInput.firstChild;
        
        if (textNode) {
          try {
            // Select the text from @ to cursor (this includes any partial typing like "@GC")
            range.setStart(textNode, atIndex);
            range.setEnd(textNode, currentCursor);
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Replace the selected text with the mention + space
            const mentionWithSpace = `@${classObj.name} `;
            
            // Use execCommand to replace selected text (this maintains proper cursor positioning)
            if (document.queryCommandSupported('insertText')) {
              document.execCommand('insertText', false, mentionWithSpace);
            } else {
              // Fallback for browsers that don't support insertText
              const newRange = selection.getRangeAt(0);
              newRange.deleteContents();
              const textNodeNew = document.createTextNode(mentionWithSpace);
              newRange.insertNode(textNodeNew);
              
              // Position cursor after the inserted text
              const finalRange = document.createRange();
              finalRange.setStartAfter(textNodeNew);
              finalRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(finalRange);
            }
            
            // Focus the input
            chatInput.focus();
            
          } catch (error) {
            console.warn('Error with selection-based insertion:', error);
            // Fallback to the old method
            const newText = mentionHook.insertMention(classObj, originalText, currentCursor);
            chatInput.textContent = newText;
            chatInput.focus();
          }
        }
      }
      
      // Set flag to skip next parsing to prevent cursor jumping
      mentionHook.setSkipNextParsing(true);
      
      // Update the query state and trigger mention parsing
      setTimeout(() => {
        const event = new Event('input', { bubbles: true });
        chatInput.dispatchEvent(event);
        
        // Update cursor position state
        const newSelection = window.getSelection();
        if (newSelection && newSelection.rangeCount > 0) {
          const newRange = newSelection.getRangeAt(0);
          const preCaretRange = newRange.cloneRange();
          preCaretRange.selectNodeContents(chatInput);
          preCaretRange.setEnd(newRange.endContainer, newRange.endOffset);
          setCursorPosition(preCaretRange.toString().length);
        }
        
        // Clear processing flag after a short delay
        setTimeout(() => {
          setIsProcessingMention(false);
        }, 100);
      }, 0);
    }
  }, [mentionHook, currentCursor, setCursorPosition, setIsProcessingMention]);

  // Enhanced keyboard handling for autocomplete
  const handleEnhancedKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle autocomplete navigation
    if (mentionHook.autocompleteState.isVisible) {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          mentionHook.navigateAutocomplete('up');
          return;
        case 'ArrowDown':
          e.preventDefault();
          mentionHook.navigateAutocomplete('down');
          return;
        case 'Enter':
          if (!e.shiftKey) {
            e.preventDefault();
            const selectedClass = mentionHook.selectSuggestion(mentionHook.autocompleteState.selectedIndex);
            if (selectedClass) {
              handleAutocompleteSelect(selectedClass, mentionHook.autocompleteState.selectedIndex);
            }
            return;
          }
          break;
        case 'Escape':
          e.preventDefault();
          mentionHook.hideAutocomplete();
          return;
      }
    }
    
    // Original keyboard handling
    handleKeyDown(e);
  }, [mentionHook, handleKeyDown, handleAutocompleteSelect]);

  // Memoize chat messages to prevent re-creation
  const chatMessages = useMemo(() => {
    return chatHistory.map((msg, index) => (
      <div
        key={index}
        className={`p-2 rounded-lg text-sm max-w-[85%] break-words transition-all duration-200 ${msg.role === 'user'
            ? 'bg-blue-500 text-white self-end ml-auto'
            : 'bg-gray-200 text-gray-800 self-start mr-auto'
          }`}
      >
        {msg.content}
      </div>
    ));
  }, [chatHistory]);

  // Context indicator for mentioned classes
  const contextIndicator = useMemo(() => {
    const { referencedClasses } = mentionHook.mentionState;
    if (referencedClasses.length === 0) return null;

    return (
      <div className="px-3 py-2 bg-blue-50 border-b border-blue-200">
        <div className="flex items-center space-x-2">
          <span className="text-blue-600 text-xs font-medium">Context:</span>
          <div className="flex flex-wrap gap-1">
            {referencedClasses.map((classObj, index) => (
              <span
                key={classObj.id}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                @{classObj.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }, [mentionHook.mentionState]);

  if (!show) return null;

  return (
    <div
      ref={chatbotRef}
      className="fixed bg-white border border-gray-300 rounded-lg shadow-lg z-50 flex flex-col"
      role="dialog"
      aria-label="Class Chatbot"
      aria-modal="true"
      style={{
        width: '400px',
        height: `${height}px`,
        maxHeight: '600px',
        minHeight: '200px',
        left: `${position.x}px`,
        bottom: `${position.y}px`
      }}
    >
      {/* Resize Handle */}
      <div
        className="h-1 bg-gray-200 hover:bg-gray-300 cursor-ns-resize flex items-center justify-center rounded-t-lg"
        onMouseDown={handleResizeStart}
        role="separator"
        aria-label="Resize panel"
        aria-orientation="horizontal"
        tabIndex={0}
      >
        <div className="w-8 h-1 bg-gray-400 rounded-full"></div>
      </div>

      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg cursor-move"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center space-x-2">
          <span className="text-gray-600 text-base">🤖</span>
          <span className="text-gray-700 text-sm font-medium">Class Chatbot</span>
          {mentionHook.mentionState.hasValidMentions && (
            <span className="text-blue-600 text-xs bg-blue-100 px-2 py-1 rounded-full">
              @{mentionHook.mentionState.referencedClasses.length}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2" onMouseDown={(e) => e.stopPropagation()}>
          {chatHistory.length > 0 && (
            <button
              onClick={clearChatHistory}
              className="text-xs text-gray-400 hover:text-gray-600 transition-all duration-200 px-2 py-1 rounded hover:bg-gray-200"
              title="Clear conversation"
              type="button"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-all duration-200 p-1 rounded hover:bg-gray-200"
            title="Close chatbot"
            type="button"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Context Indicator */}
      {contextIndicator}

      {/* Chat Content */}
      <div 
        ref={chatContentRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
        role="log"
        aria-label="Chat history"
        aria-live="polite"
      >
        {chatMessages}
        {isChatLoading && (
          <div className="bg-gray-200 text-gray-800 p-2 rounded-lg text-sm max-w-[85%] animate-pulse">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
              <span className="text-gray-500 text-xs">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <form onSubmit={handleAskChatbot} className="flex items-end gap-2">
          <div
            contentEditable
            suppressContentEditableWarning={true}
            data-element-type="chat-input"
            onInput={handleInputChange}
            data-placeholder="Ask a question..."
            role="textbox"
            aria-label="Chat message input"
            aria-multiline="true"
            className={`flex-1 py-2 px-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${!chatQuery.trim() ? 'empty-placeholder' : ''}`}
            style={{ 
              minHeight: '38px',
              maxHeight: '90px',
              overflowY: 'auto',
              fontSize: `${fontSize}px`,
              direction: 'ltr',
              textAlign: 'left'
            }}
            onKeyDown={handleEnhancedKeyDown}
          ></div>
          <button
            type="submit"
            disabled={isChatLoading}
            aria-label="Send message"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            style={{ height: '38px', width: '50px' }}
          >
            {isChatLoading ? '...' : '➤'}
          </button>
        </form>
      </div>

      {/* Autocomplete Component */}
      <ChatbotAutocomplete
        isVisible={mentionHook.autocompleteState.isVisible}
        suggestions={mentionHook.autocompleteState.suggestions}
        selectedIndex={mentionHook.autocompleteState.selectedIndex}
        searchTerm={mentionHook.autocompleteState.searchTerm}
        position={{
          top: position.y - 200, // Position above the chatbot
          left: position.x
        }}
        onSelect={handleAutocompleteSelect}
        onClose={mentionHook.hideAutocomplete}
      />
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(ChatbotPanel);
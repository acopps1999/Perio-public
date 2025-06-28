import { useRef, useState, useEffect } from 'react';

// Custom hook for dynamic textarea sizing
export const useDynamicTextarea = (initialRows = 2, maxRows = 8) => {
  const textareaRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to calculate scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate required height
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20;
    const padding = parseInt(window.getComputedStyle(textarea).paddingTop) * 2 || 16;
    const minHeight = lineHeight * initialRows + padding;
    const maxHeight = lineHeight * maxRows + padding;
    const requiredHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    
    textarea.style.height = `${requiredHeight}px`;
  };

  const handleFocus = () => {
    setIsFocused(true);
    setTimeout(adjustHeight, 0); // Delay to ensure content is rendered
  };

  const handleBlur = () => {
    setIsFocused(false);
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Shrink back to minimum height if no content or minimal content
    const hasContent = textarea.value.trim().length > 0;
    if (hasContent) {
      // Keep content-based height but apply max constraint
      adjustHeight();
    } else {
      // Shrink to initial size
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20;
      const padding = parseInt(window.getComputedStyle(textarea).paddingTop) * 2 || 16;
      const minHeight = lineHeight * initialRows + padding;
      textarea.style.height = `${minHeight}px`;
    }
  };

  const handleInput = () => {
    if (isFocused) {
      adjustHeight();
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Set initial height and styles
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20;
    const padding = parseInt(window.getComputedStyle(textarea).paddingTop) * 2 || 16;
    const minHeight = lineHeight * initialRows + padding;
    
    textarea.style.height = `${minHeight}px`;
    textarea.style.transition = 'height 0.2s ease';
    textarea.style.resize = 'none';
    textarea.style.overflow = 'hidden';

    // Initial adjustment if there's content
    if (textarea.value) {
      adjustHeight();
    }
  }, [initialRows]);

  // Adjust height when value changes (for controlled components)
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value) {
      setTimeout(adjustHeight, 0);
    }
  });

  return {
    textareaRef,
    handleFocus,
    handleBlur,
    handleInput,
    isFocused
  };
};

// Helper function that creates dynamic textarea behavior without using hooks
export const createDynamicTextareaProps = (textareaRef, initialRows = 2, maxRows = 8) => {
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20;
    const padding = parseInt(window.getComputedStyle(textarea).paddingTop) * 2 || 16;
    const minHeight = lineHeight * initialRows + padding;
    const maxHeight = lineHeight * maxRows + padding;
    const requiredHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${requiredHeight}px`;
  };

  const handleFocus = () => {
    setTimeout(adjustHeight, 0);
  };

  const handleBlur = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const hasContent = textarea.value.trim().length > 0;
    if (hasContent) {
      adjustHeight();
    } else {
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20;
      const padding = parseInt(window.getComputedStyle(textarea).paddingTop) * 2 || 16;
      const minHeight = lineHeight * initialRows + padding;
      textarea.style.height = `${minHeight}px`;
    }
  };

  const handleInput = () => {
    adjustHeight();
  };

  // Initialize textarea on first render
  const initializeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20;
    const padding = parseInt(window.getComputedStyle(textarea).paddingTop) * 2 || 16;
    const minHeight = lineHeight * initialRows + padding;
    
    textarea.style.height = `${minHeight}px`;
    textarea.style.transition = 'height 0.2s ease';
    textarea.style.resize = 'none';
    textarea.style.overflow = 'hidden';

    if (textarea.value) {
      setTimeout(adjustHeight, 0);
    }
  };

  return {
    ref: textareaRef,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onInput: handleInput,
    onMount: initializeTextarea  // Call this when the textarea mounts
  };
};

// Legacy hook-based function (deprecated due to Rules of Hooks issues)
export const useDynamicTextareaProps = (initialRows = 2, maxRows = 8) => {
  const { textareaRef, handleFocus, handleBlur, handleInput } = useDynamicTextarea(initialRows, maxRows);
  
  return {
    ref: textareaRef,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onInput: handleInput
  };
};

export default useDynamicTextarea; 
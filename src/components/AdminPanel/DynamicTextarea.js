import React, { useRef, useEffect } from 'react';
import { createDynamicTextareaProps } from './useDynamicTextarea';

const DynamicTextarea = ({ initialRows = 2, maxRows = 8, value, ...props }) => {
  const textareaRef = useRef(null);
  
  // createDynamicTextareaProps is not a hook, so it's fine to call here.
  const { onMount, ...dynamicProps } = createDynamicTextareaProps(textareaRef, initialRows, maxRows);

  // useEffect is a hook, called at the top level of the component.
  useEffect(() => {
    // onMount initializes the textarea styles and adjusts height based on initial content.
    if (onMount) {
      onMount();
    }
    // Re-run if the value changes to correctly re-calculate height for controlled components.
  }, [value, onMount]);

  // The 'ref' from createDynamicTextareaProps is passed through dynamicProps
  return <textarea {...props} {...dynamicProps} value={value} />;
};

export default DynamicTextarea; 
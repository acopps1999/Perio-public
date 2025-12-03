import React from 'react';

/**
 * SimpleMarkdown - Lightweight markdown renderer for basic formatting
 *
 * Supports:
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - • bullet points (lines starting with "• " or "- " or "* ")
 * - Line breaks preserved
 * - Indentation preserved
 */
const SimpleMarkdown = ({ children, className = '' }) => {
  if (!children || typeof children !== 'string') {
    return <span className={className}>{children}</span>;
  }

  const text = children;

  // Process the text into React elements
  const renderLine = (line, lineIndex) => {
    // Check for bullet points
    const bulletMatch = line.match(/^(\s*)(•|-|\*)\s+(.*)$/);
    if (bulletMatch) {
      const [, indent, , content] = bulletMatch;
      const indentLevel = Math.floor(indent.length / 2);
      return (
        <div
          key={lineIndex}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            marginLeft: `${indentLevel * 16}px`,
            marginBottom: '4px',
          }}
        >
          <span style={{ marginRight: '8px', flexShrink: 0 }}>•</span>
          <span>{renderInlineFormatting(content)}</span>
        </div>
      );
    }

    // Check for indented lines (preserve indentation)
    const indentMatch = line.match(/^(\s+)(.*)$/);
    if (indentMatch) {
      const [, indent, content] = indentMatch;
      const indentLevel = Math.floor(indent.length / 2);
      return (
        <div
          key={lineIndex}
          style={{ marginLeft: `${indentLevel * 16}px`, marginBottom: '2px' }}
        >
          {renderInlineFormatting(content)}
        </div>
      );
    }

    // Regular line
    return (
      <div key={lineIndex} style={{ marginBottom: '2px' }}>
        {renderInlineFormatting(line) || '\u00A0'}
      </div>
    );
  };

  // Render inline formatting (bold, italic)
  const renderInlineFormatting = (text) => {
    if (!text) return null;

    const elements = [];
    let remaining = text;
    let keyIndex = 0;

    // Pattern to match **bold**, __bold__, *italic*, _italic_
    // Order matters: check ** before * to avoid conflicts
    const patterns = [
      { regex: /\*\*(.+?)\*\*/g, render: (match) => <strong key={keyIndex++}>{match}</strong> },
      { regex: /__(.+?)__/g, render: (match) => <strong key={keyIndex++}>{match}</strong> },
      { regex: /\*(.+?)\*/g, render: (match) => <em key={keyIndex++}>{match}</em> },
      { regex: /_(.+?)_/g, render: (match) => <em key={keyIndex++}>{match}</em> },
    ];

    // Simple approach: process text sequentially
    // First, find all matches and their positions
    const allMatches = [];

    patterns.forEach(({ regex, render }) => {
      let match;
      const regexCopy = new RegExp(regex.source, 'g');
      while ((match = regexCopy.exec(text)) !== null) {
        allMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[1],
          render,
          fullMatch: match[0],
        });
      }
    });

    // Sort by start position
    allMatches.sort((a, b) => a.start - b.start);

    // Filter overlapping matches (keep first one)
    const filteredMatches = [];
    let lastEnd = 0;
    for (const match of allMatches) {
      if (match.start >= lastEnd) {
        filteredMatches.push(match);
        lastEnd = match.end;
      }
    }

    // Build elements
    let currentIndex = 0;
    for (const match of filteredMatches) {
      // Add text before this match
      if (match.start > currentIndex) {
        elements.push(text.substring(currentIndex, match.start));
      }
      // Add the formatted element
      elements.push(match.render(match.content));
      currentIndex = match.end;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      elements.push(text.substring(currentIndex));
    }

    return elements.length > 0 ? elements : text;
  };

  // Split by newlines and process each line
  const lines = text.split('\n');

  return (
    <div className={className}>
      {lines.map((line, index) => renderLine(line, index))}
    </div>
  );
};

export default SimpleMarkdown;

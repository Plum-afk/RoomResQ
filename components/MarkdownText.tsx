import React from 'react';

interface MarkdownTextProps {
  text: string;
  className?: string;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ text, className = '' }) => {
  // Basic formatting: 
  // 1. Handle **bold**
  // 2. Handle newlines
  // 3. Handle bullet points
  
  const processText = (input: string) => {
    return input.split('\n').map((line, index) => {
      // Check for bullet points
      const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
      const cleanLine = isBullet ? line.trim().substring(2) : line;
      
      // Process bold segments
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-indigo-900">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={index} className="flex items-start gap-2 mb-2 ml-2">
            <span className="text-indigo-500 mt-1.5">•</span>
            <p className="text-slate-700 leading-relaxed flex-1">{parts}</p>
          </div>
        );
      }

      // Empty lines act as spacers
      if (!line.trim()) {
        return <div key={index} className="h-2" />;
      }

      return (
        <p key={index} className={`text-slate-700 leading-relaxed mb-1 ${isBullet ? '' : ''}`}>
          {parts}
        </p>
      );
    });
  };

  return <div className={`text-sm md:text-base ${className}`}>{processText(text)}</div>;
};
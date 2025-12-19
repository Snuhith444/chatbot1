
import React from 'react';

interface MarkdownProps {
  content: string;
}

const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  // Simple parser for basic markdown features
  // In a real app, use react-markdown, but we'll implement a clean version here
  const lines = content.split('\n');
  let inCodeBlock = false;

  return (
    <div className="prose prose-invert max-w-none text-sm md:text-base leading-relaxed">
      {lines.map((line, i) => {
        // Code blocks
        if (line.startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          return null;
        }

        if (inCodeBlock) {
          return (
            <pre key={i} className="p-3 my-2 overflow-x-auto bg-slate-800 rounded-lg">
              <code className="text-slate-200">{line}</code>
            </pre>
          );
        }

        // Headers
        if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mt-4 mb-2">{line.substring(2)}</h1>;
        if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-3 mb-2">{line.substring(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold mt-2 mb-1">{line.substring(4)}</h3>;

        // Bold
        const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Lists
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: boldLine.substring(2) }} />;
        }
        
        if (/^\d+\. /.test(line)) {
          return <li key={i} className="ml-4 list-decimal" dangerouslySetInnerHTML={{ __html: boldLine.replace(/^\d+\. /, '') }} />;
        }

        // Paragraphs
        if (line.trim() === '') return <div key={i} className="h-2" />;
        
        return <p key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: boldLine }} />;
      })}
    </div>
  );
};

export default Markdown;

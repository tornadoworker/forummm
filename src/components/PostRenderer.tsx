'use client';

import React from 'react';
import { bbcodeToMarkdown, hasBBCode } from '@/lib/bbcode';

interface PostRendererProps {
  content: string;
  className?: string;
}

export default function PostRenderer({ content, className = '' }: PostRendererProps) {
  if (!content) return null;

  // BB-Code Unterstützung: falls BB-Code vorhanden ist, in Markdown normalisieren
  const normalizedContent = hasBBCode(content) ? bbcodeToMarkdown(content) : content;

  // Split into paragraphs / blocks
  const lines = normalizedContent.split('\n');
  const elements: React.ReactNode[] = [];

  let i = 0;
  let keyCounter = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Code-Block check: ```
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      const lang = line.trim().slice(3).trim();
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      elements.push(
        <div
          key={`code-${keyCounter++}`}
          className="my-3 rounded-[6px] border border-[#292929] bg-[#0d0d0d] overflow-hidden"
        >
          {lang && (
            <div className="px-3 py-1 bg-[#141414] border-b border-[#292929] text-[10px] font-mono text-[#8B5CF6] uppercase tracking-wider">
              {lang}
            </div>
          )}
          <pre className="p-3.5 text-[11px] font-mono text-[#E2E8F0] overflow-x-auto leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    // 2. Blockquote check: >
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <div
          key={`quote-${keyCounter++}`}
          className="my-3 pl-3.5 py-2.5 pr-3 border-l-2 border-[#8B5CF6] bg-[#121212] rounded-r-[4px] text-xs text-[#D1D5DB] space-y-1"
        >
          {quoteLines.map((ql, qIdx) => (
            <div key={qIdx} className="leading-relaxed">
              {renderInline(ql)}
            </div>
          ))}
        </div>
      );
      continue;
    }

    // 3. Headings: #, ##, ###
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${keyCounter++}`} className="text-xs font-bold text-[#F5F5F5] mt-3 mb-1">
          {renderInline(line.slice(4))}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${keyCounter++}`} className="text-sm font-bold text-[#F5F5F5] mt-3.5 mb-1.5 pb-1 border-b border-[#292929]">
          {renderInline(line.slice(3))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${keyCounter++}`} className="text-base font-bold text-[#F5F5F5] mt-4 mb-2 pb-1.5 border-b border-[#292929]">
          {renderInline(line.slice(2))}
        </h2>
      );
      i++;
      continue;
    }

    // 4. Standalone Image: ![alt](url)
    const imgMatch = line.trim().match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const src = imgMatch[2].trim();
      const lower = src.toLowerCase();
      const isSafe =
        (lower.startsWith('http://') || lower.startsWith('https://')) ||
        (src.startsWith('/') && !src.startsWith('//'));
      const hasBadScheme = lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:');

      if (isSafe && !hasBadScheme) {
        elements.push(
          <div key={`img-${keyCounter++}`} className="my-3">
            <img
              src={src}
              alt={alt || 'Bild'}
              className="max-h-[500px] w-auto max-w-full rounded-[6px] border border-[#292929] object-contain bg-[#111111]"
              loading="lazy"
            />
            {alt && alt !== 'Bild' && (
              <span className="block mt-1 text-[11px] text-[#A3A3A3] italic">{alt}</span>
            )}
          </div>
        );
      }
      i++;
      continue;
    }

    // 5. Lists: Unordered (- or *) or Ordered (1.)
    if (line.trim().match(/^[-*]\s+/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim().match(/^[-*]\s+/)) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${keyCounter++}`} className="my-2 space-y-1 list-disc list-inside text-xs text-[#E5E5E5] pl-1">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (line.trim().match(/^\d+\.\s+/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s+/)) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${keyCounter++}`} className="my-2 space-y-1 list-decimal list-inside text-xs text-[#E5E5E5] pl-1">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 6. Normal paragraph or empty line
    if (!line.trim()) {
      elements.push(<div key={`br-${keyCounter++}`} className="h-2" />);
      i++;
      continue;
    }

    elements.push(
      <p key={`p-${keyCounter++}`} className="leading-relaxed text-xs text-[#F5F5F5] my-1">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className={`post-renderer space-y-1 ${className}`}>{elements}</div>;
}

/**
 * Render inline markdown elements safely:
 * - **bold**
 * - *italic*
 * - <u>underline</u>
 * - ~~strikethrough~~
 * - `code`
 * - [text](url)
 * - ![alt](url)
 */
function renderInline(text: string): React.ReactNode[] {
  if (!text) return [];

  // Tokenize regex for inline elements
  const regex = /(!?\[.*?\]\(.*?\)|`.*?`|\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>|~~.*?~~)/g;
  const parts = text.split(regex);
  const result: React.ReactNode[] = [];

  parts.forEach((part, idx) => {
    if (!part) return;

    // Image ![alt](url)
    if (part.startsWith('![') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (match) {
        const imgUrl = match[2].trim();
        const lower = imgUrl.toLowerCase();
        const isSafe =
          (lower.startsWith('http://') || lower.startsWith('https://')) ||
          (imgUrl.startsWith('/') && !imgUrl.startsWith('//'));
        const hasBadScheme = lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:');

        if (isSafe && !hasBadScheme) {
          result.push(
            <img
              key={idx}
              src={imgUrl}
              alt={match[1] || 'Bild'}
              className="inline-block max-h-48 max-w-xs rounded border border-[#292929] my-1 align-middle"
            />
          );
          return;
        }
      }
    }

    // Link [text](url)
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        const linkUrl = match[2].trim();
        const lower = linkUrl.toLowerCase();
        const isSafe =
          (lower.startsWith('http://') || lower.startsWith('https://')) ||
          (linkUrl.startsWith('/') && !linkUrl.startsWith('//'));
        const hasBadScheme = lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:');

        const safeUrl = isSafe && !hasBadScheme ? linkUrl : '#';
        result.push(
          <a
            key={idx}
            href={safeUrl}
            target={safeUrl.startsWith('/') ? undefined : '_blank'}
            rel="noopener noreferrer"
            className="text-[#8B5CF6] hover:text-[#A78BFA] hover:underline font-medium inline-flex items-center gap-0.5"
          >
            {match[1]}
          </a>
        );
        return;
      }
    }

    // Inline code `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      result.push(
        <code
          key={idx}
          className="px-1.5 py-0.5 bg-[#121212] border border-[#292929] rounded text-[11px] font-mono text-[#A78BFA]"
        >
          {part.slice(1, -1)}
        </code>
      );
      return;
    }

    // Bold **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      result.push(
        <strong key={idx} className="font-bold text-[#FFFFFF]">
          {part.slice(2, -2)}
        </strong>
      );
      return;
    }

    // Italic *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      result.push(
        <em key={idx} className="italic text-[#E5E5E5]">
          {part.slice(1, -1)}
        </em>
      );
      return;
    }

    // Underline <u>text</u>
    if (part.startsWith('<u>') && part.endsWith('</u>') && part.length > 7) {
      result.push(
        <span key={idx} className="underline decoration-[#8B5CF6] underline-offset-2">
          {part.slice(3, -4)}
        </span>
      );
      return;
    }

    // Strikethrough ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
      result.push(
        <del key={idx} className="line-through text-[#888888]">
          {part.slice(2, -2)}
        </del>
      );
      return;
    }

    // Plain text
    result.push(<React.Fragment key={idx}>{part}</React.Fragment>);
  });

  return result;
}

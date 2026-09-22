import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface FormattedMathContentProps {
  content: string;
  className?: string;
}

/**
 * Safely render KaTeX math with fallback
 */
function renderKatexSafe(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex.trim(), {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
      strict: false,
      trust: false
    });
  } catch {
    return `<span class="font-mono text-emerald-300">${escapeHtml(tex)}</span>`;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parses markdown text while extracting and rendering math expressions (LaTeX / KaTeX)
 */
export const FormattedMathContent: React.FC<FormattedMathContentProps> = ({
  content,
  className = ''
}) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    let text = content;

    // 1. Extract and protect code blocks
    const codeBlocks: string[] = [];
    text = text.replace(/```([\s\S]*?)```/g, (_, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push(`<pre class="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-300 my-2"><code>${escapeHtml(code.trim())}</code></pre>`);
      return `___CODE_BLOCK_${idx}___`;
    });

    // 2. Extract and render Display Math $$ ... $$ or \[ ... \]
    const mathBlocks: string[] = [];
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      const idx = mathBlocks.length;
      const html = `<div class="my-3 overflow-x-auto text-center py-2 px-3 bg-slate-950/60 rounded-xl border border-slate-800/80">${renderKatexSafe(math, true)}</div>`;
      mathBlocks.push(html);
      return `___MATH_BLOCK_${idx}___`;
    });
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
      const idx = mathBlocks.length;
      const html = `<div class="my-3 overflow-x-auto text-center py-2 px-3 bg-slate-950/60 rounded-xl border border-slate-800/80">${renderKatexSafe(math, true)}</div>`;
      mathBlocks.push(html);
      return `___MATH_BLOCK_${idx}___`;
    });

    // 3. Extract and render Inline Math $ ... $ or \( ... \)
    text = text.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (_, math) => {
      const idx = mathBlocks.length;
      const html = `<span class="inline-math px-1">${renderKatexSafe(math, false)}</span>`;
      mathBlocks.push(html);
      return `___MATH_BLOCK_${idx}___`;
    });
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
      const idx = mathBlocks.length;
      const html = `<span class="inline-math px-1">${renderKatexSafe(math, false)}</span>`;
      mathBlocks.push(html);
      return `___MATH_BLOCK_${idx}___`;
    });

    // 4. Clean and normalize Markdown lines
    const lines = text.split('\n');
    const processedLines: string[] = [];
    let inList = false;
    let listType: 'ul' | 'ol' = 'ul';
    let inTable = false;
    let tableRows: string[] = [];

    const flushList = () => {
      if (inList) {
        processedLines.push(`</${listType}>`);
        inList = false;
      }
    };

    const flushTable = () => {
      if (inTable && tableRows.length > 0) {
        let tableHtml = '<div class="overflow-x-auto my-3"><table class="w-full text-xs text-left border-collapse border border-slate-800 rounded-xl overflow-hidden">';
        tableRows.forEach((row, rIdx) => {
          const isHeader = rIdx === 0;
          const cols = row.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
          if (cols.length === 0 || cols.every(c => /^[-:]+$/.test(c))) {
            return; // Skip separator line
          }
          tableHtml += `<tr class="${isHeader ? 'bg-slate-800/80 font-bold text-white' : 'border-t border-slate-800/60 hover:bg-slate-900/40'}">`;
          cols.forEach(col => {
            if (isHeader) {
              tableHtml += `<th class="p-2.5 border border-slate-800">${formatInline(col)}</th>`;
            } else {
              tableHtml += `<td class="p-2.5 border border-slate-800/60">${formatInline(col)}</td>`;
            }
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</table></div>';
        processedLines.push(tableHtml);
        tableRows = [];
        inTable = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      // Check for Table Row
      if (line.startsWith('|') && line.endsWith('|')) {
        flushList();
        inTable = true;
        tableRows.push(line);
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Check for Headings (Max 2 levels)
      if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
        flushList();
        const headingText = line.replace(/^#+\s*/, '');
        processedLines.push(`<h3 class="text-sm md:text-base font-bold text-emerald-400 mt-4 mb-2 tracking-tight flex items-center gap-1.5">${formatInline(headingText)}</h3>`);
        continue;
      }

      // Check for Bullet list
      if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
        const itemText = line.replace(/^[-*•]\s*/, '');
        if (!inList || listType !== 'ul') {
          flushList();
          processedLines.push('<ul class="list-disc list-inside space-y-1 my-2 text-slate-300 text-xs md:text-sm">');
          inList = true;
          listType = 'ul';
        }
        processedLines.push(`<li class="leading-relaxed pl-1">${formatInline(itemText)}</li>`);
        continue;
      }

      // Check for Numbered list
      const numMatch = line.match(/^(\d+)\.\s*(.*)$/);
      if (numMatch) {
        const itemText = numMatch[2];
        if (!inList || listType !== 'ol') {
          flushList();
          processedLines.push('<ol class="list-decimal list-inside space-y-1 my-2 text-slate-300 text-xs md:text-sm">');
          inList = true;
          listType = 'ol';
        }
        processedLines.push(`<li class="leading-relaxed pl-1">${formatInline(itemText)}</li>`);
        continue;
      }

      flushList();

      if (line.length === 0) {
        processedLines.push('<div class="h-2"></div>');
        continue;
      }

      // Standard Paragraph
      processedLines.push(`<p class="leading-relaxed text-slate-200 text-xs md:text-sm my-1.5">${formatInline(line)}</p>`);
    }

    flushList();
    flushTable();

    let finalHtml = processedLines.join('\n');

    // Restore Math Blocks
    mathBlocks.forEach((block, idx) => {
      finalHtml = finalHtml.replace(`___MATH_BLOCK_${idx}___`, block);
    });

    // Restore Code Blocks
    codeBlocks.forEach((block, idx) => {
      finalHtml = finalHtml.replace(`___CODE_BLOCK_${idx}___`, block);
    });

    return finalHtml;
  }, [content]);

  return (
    <div
      className={`math-content prose prose-invert max-w-none break-words ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

function formatInline(str: string): string {
  let formatted = escapeHtml(str);

  // Bold **text**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  
  // Italic *text*
  formatted = formatted.replace(/\*([^\*]+?)\*/g, '<em class="italic text-slate-300">$1</em>');

  // Inline code `code`
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-slate-950 text-emerald-300 px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-800">$1</code>');

  return formatted;
}

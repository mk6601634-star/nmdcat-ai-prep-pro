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
 * Normalizes plain-text scientific, physiological, chemical, and mathematical expressions
 * so that expressions without explicit $ delimiters (e.g. from PRISM, databases, textbooks)
 * are cleanly upgraded to LaTeX before markdown and math extraction.
 */
function normalizeScientificMathNotation(input: string): string {
  if (!input) return '';

  let text = input;

  // 1. Protect existing LaTeX delimiters ($$, $, \[, \]) and code blocks (```)
  const preservedBlocks: string[] = [];
  text = text.replace(/```[\s\S]*?```|\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|(?<!\\)\$[^\$\n]+?(?<!\\)\$|\\\([\s\S]*?\\\)/g, (match) => {
    const idx = preservedBlocks.length;
    preservedBlocks.push(match);
    return `@@PRESERVED_MATH_OR_CODE_${idx}@@`;
  });

  // 2. High-Yield Physiological Equations
  // e.g. V̇A = (PACO2 - PH2O)/K or V.A = (Pao2 - Ph2o)/K or VA = (PaCO2 - PH2O)/k
  text = text.replace(/\b(V̇A|V\.A|V̇O2|V̇CO2|Vmax|Km)\s*=\s*([^\n\.,;]+)/gi, (match, lhs, rhs) => {
    let cleanLhs = lhs;
    if (/V̇A|V\.A/i.test(lhs)) cleanLhs = '\\dot{V}_{\\text{A}}';
    else if (/V̇O2/i.test(lhs)) cleanLhs = '\\dot{V}_{\\text{O}_2}';
    else if (/V̇CO2/i.test(lhs)) cleanLhs = '\\dot{V}_{\\text{CO}_2}';
    else if (/Vmax/i.test(lhs)) cleanLhs = 'V_{\\max}';
    else if (/Km/i.test(lhs)) cleanLhs = 'K_{\\text{m}}';

    // Format fraction rhs like (A - B)/C
    let cleanRhs = rhs.trim();
    cleanRhs = cleanRhs
      .replace(/PaO2|Pao2/gi, 'P_{\\text{a}\\text{O}_2}')
      .replace(/PAO2|Pao2/gi, 'P_{\\text{A}\\text{O}_2}')
      .replace(/PaCO2|Paco2/gi, 'P_{\\text{a}\\text{CO}_2}')
      .replace(/PACO2|Paco2/gi, 'P_{\\text{A}\\text{CO}_2}')
      .replace(/PvO2|Pvo2/gi, 'P_{\\text{v}\\text{O}_2}')
      .replace(/PH2O|Ph2o/gi, 'P_{\\text{H}_2\\text{O}}');

    const fracMatch = cleanRhs.match(/^\((.*?)\)\s*\/\s*([a-zA-Z0-9_\{\}\\]+)$/);
    if (fracMatch) {
      cleanRhs = `\\frac{${fracMatch[1]}}{${fracMatch[2]}}`;
    }

    return `$${cleanLhs} = ${cleanRhs}$`;
  });

  // 3. Isolated Physiological Gas Pressures & Variables
  // PaO2, PAO2, PaCO2, PACO2, PvO2, PH2O, pKa, pKb, pH, pOH, Vmax, Km, Ka, Kb, Kw, Kp, Kc
  text = text.replace(/\b(PaO2|PAO2|PaCO2|PACO2|PvO2|PH2O)\b/g, (match) => {
    switch (match.toUpperCase()) {
      case 'PAO2': return '$P_{\\text{a}\\text{O}_2}$';
      case 'PACO2': return '$P_{\\text{a}\\text{CO}_2}$';
      case 'PVO2': return '$P_{\\text{v}\\text{O}_2}$';
      case 'PH2O': return '$P_{\\text{H}_2\\text{O}}$';
      default: return match;
    }
  });

  // Handle case variations for PAO2 vs PaO2
  text = text.replace(/\b(P[Aa]O2|P[Aa]CO2)\b/g, (match) => {
    if (match.startsWith('PA')) {
      return match.includes('CO') ? '$P_{\\text{A}\\text{CO}_2}$' : '$P_{\\text{A}\\text{O}_2}$';
    }
    return match.includes('CO') ? '$P_{\\text{a}\\text{CO}_2}$' : '$P_{\\text{a}\\text{O}_2}$';
  });

  // Equilibrium & Kinetic Constants
  text = text.replace(/\b(Vmax|Km|pKa|pKb|pOH|Ka|Kb|Kw|Kp|Kc)\b/g, (match) => {
    switch (match) {
      case 'Vmax': return '$V_{\\max}$';
      case 'Km': return '$K_{\\text{m}}$';
      case 'pKa': return '$\\text{p}K_{\\text{a}}$';
      case 'pKb': return '$\\text{p}K_{\\text{b}}$';
      case 'pOH': return '$\\text{pOH}$';
      case 'Ka': return '$K_{\\text{a}}$';
      case 'Kb': return '$K_{\\text{b}}$';
      case 'Kw': return '$K_{\\text{w}}$';
      case 'Kp': return '$K_{\\text{p}}$';
      case 'Kc': return '$K_{\\text{c}}$';
      default: return match;
    }
  });

  // 4. Common Chemical Formulas & Ions (Safe boundary checks)
  // H2O, CO2, O2, N2, H2SO4, HNO3, HCl, NaOH, NaCl, CaCO3, Ca(OH)2, HCO3-, SO4 2-, PO4 3-, Ca2+, Mg2+, Na+, K+, Cl-, NH4+, CH4, C6H12O6
  text = text.replace(/\b(H2O|CO2|H2SO4|HNO3|CaCO3|C6H12O6|CH4|NH4\+|HCO3\-)\b/g, (match) => {
    switch (match) {
      case 'H2O': return '$\\text{H}_2\\text{O}$';
      case 'CO2': return '$\\text{CO}_2$';
      case 'H2SO4': return '$\\text{H}_2\\text{SO}_4$';
      case 'HNO3': return '$\\text{HNO}_3$';
      case 'CaCO3': return '$\\text{CaCO}_3$';
      case 'C6H12O6': return '$\\text{C}_6\\text{H}_{12}\\text{O}_6$';
      case 'CH4': return '$\\text{CH}_4$';
      case 'NH4+': return '$\\text{NH}_4^+$';
      case 'HCO3-': return '$\\text{HCO}_3^-$';
      default: return match;
    }
  });

  // Polyatomic and monoatomic ions: Ca2+, Mg2+, Na+, K+, Cl-, SO4 2-, SO4^2-, PO4 3-, PO4^3-
  text = text.replace(/\b(Ca2\+|Mg2\+|Fe2\+|Fe3\+|Zn2\+|Cu2\+|Al3\+|Na\+|K\+|Cl\-)\b/g, (match) => {
    const el = match.slice(0, -2);
    const charge = match.slice(-2);
    if (charge === '2+' || charge === '3+') {
      return `$\\text{${el}}^{${charge}}$`;
    }
    const singleEl = match.slice(0, -1);
    const singleCharge = match.slice(-1);
    return `$\\text{${singleEl}}^{${singleCharge}}$`;
  });

  text = text.replace(/\b(SO4\s*2\-|SO4\^2\-|SO4\-2)\b/gi, '$\\text{SO}_4^{2-}$');
  text = text.replace(/\b(PO4\s*3\-|PO4\^3\-|PO4\-3)\b/gi, '$\\text{PO}_4^{3-}$');
  text = text.replace(/\b(NO3\-)\b/gi, '$\\text{NO}_3^-$');

  // 5. Scientific Powers & Exponents (e.g. 10^-6, 10-6 in scientific contexts, 10^3, 3 x 10^8)
  text = text.replace(/(\d+(?:\.\d+)?)\s*(?:[x×\*]\s*)?10\^([+-]?\d+)/g, '$$$1 \\times 10^{$2}$$');
  text = text.replace(/\b10\^([+-]?\d+)/g, '$$10^{$1}$$');
  text = text.replace(/\b10\-(\d{1,2})\b/g, '$$10^{-$1}$$'); // e.g. 10-6 -> 10^-6

  // 6. Common Physics/Chemistry Units & Notation
  // e.g. 37 °C -> 37 °C, 100 mmHg -> 100 mmHg
  text = text.replace(/\b(\d+(?:\.\d+)?)\s*(mmHg|mL\/min|mol\/L|mg\/dL|m\/s\^2|m\/s|kJ\/mol|cm\^3)\b/g, (match, val, unit) => {
    return `$${val}\\ \\text{${unit}}$`;
  });

  // Restore preserved math and code blocks
  preservedBlocks.forEach((block, idx) => {
    text = text.replace(`@@PRESERVED_MATH_OR_CODE_${idx}@@`, block);
  });

  return text;
}

/**
 * Parses markdown text while extracting and rendering math expressions (LaTeX / KaTeX)
 * and cleaning excessive hashes, horizontal rules, and raw syntax.
 */
export const FormattedMathContent: React.FC<FormattedMathContentProps> = ({
  content,
  className = ''
}) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // Step 0: Apply canonical scientific & physiological notation preprocessor
    let text = normalizeScientificMathNotation(content);

    // 1. Extract and protect code blocks using collision-free @@ tokens
    const codeBlocks: string[] = [];
    text = text.replace(/```([\s\S]*?)```/g, (_, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push(`<pre class="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-300 my-2"><code>${escapeHtml(code.trim())}</code></pre>`);
      return `@@CODE_BLOCK_${idx}@@`;
    });

    // 2. Extract and render Display Math $$ ... $$ or \[ ... \]
    const mathBlocks: string[] = [];
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      const idx = mathBlocks.length;
      const html = `<div class="my-3 overflow-x-auto text-center py-2 px-3 bg-slate-950/60 rounded-xl border border-slate-800/80">${renderKatexSafe(math, true)}</div>`;
      mathBlocks.push(html);
      return `@@MATH_BLOCK_${idx}@@`;
    });
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
      const idx = mathBlocks.length;
      const html = `<div class="my-3 overflow-x-auto text-center py-2 px-3 bg-slate-950/60 rounded-xl border border-slate-800/80">${renderKatexSafe(math, true)}</div>`;
      mathBlocks.push(html);
      return `@@MATH_BLOCK_${idx}@@`;
    });

    // 3. Extract and render Inline Math $ ... $ or \( ... \)
    text = text.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (_, math) => {
      const idx = mathBlocks.length;
      const html = `<span class="inline-math px-1">${renderKatexSafe(math, false)}</span>`;
      mathBlocks.push(html);
      return `@@MATH_BLOCK_${idx}@@`;
    });
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
      const idx = mathBlocks.length;
      const html = `<span class="inline-math px-1">${renderKatexSafe(math, false)}</span>`;
      mathBlocks.push(html);
      return `@@MATH_BLOCK_${idx}@@`;
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

      // Skip horizontal divider lines entirely (---, ***, ___)
      if (/^[-*_]{3,}$/.test(line)) {
        flushList();
        flushTable();
        continue;
      }

      // Check for Table Row
      if (line.startsWith('|') && line.endsWith('|')) {
        flushList();
        inTable = true;
        tableRows.push(line);
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Check for Headings (#, ##, ###, ####, #####, ######)
      if (/^#{1,6}\s+/.test(line) || /^#{1,6}[^\s#]/.test(line)) {
        flushList();
        const headingText = line.replace(/^#{1,6}\s*/, '').trim();
        if (headingText) {
          processedLines.push(`<h3 class="text-sm md:text-base font-bold text-emerald-400 mt-4 mb-1.5 tracking-tight flex items-center gap-1.5">${formatInline(headingText)}</h3>`);
        }
        continue;
      }

      // Check for Blockquote (> text)
      if (line.startsWith('>')) {
        flushList();
        const quoteText = line.replace(/^>\s*/, '').trim();
        processedLines.push(`<div class="border-l-2 border-indigo-500 bg-indigo-500/10 px-3 py-2 rounded-r-xl my-2 text-slate-300 text-xs sm:text-sm italic">${formatInline(quoteText)}</div>`);
        continue;
      }

      // Check for Bullet list (- , * , • )
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

      // Check for Numbered list (1. , 2. )
      const numMatch = line.match(/^(\d+)[\.\)]\s*(.*)$/);
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
        processedLines.push('<div class="h-1.5"></div>');
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
      finalHtml = finalHtml.replaceAll(`@@MATH_BLOCK_${idx}@@`, block);
    });

    // Restore Code Blocks
    codeBlocks.forEach((block, idx) => {
      finalHtml = finalHtml.replaceAll(`@@CODE_BLOCK_${idx}@@`, block);
    });

    // Fail-safe Invariant check: Guaranteed zero internal placeholder leaks to DOM
    if (finalHtml.includes('MATH_BLOCK_') || finalHtml.includes('CODE_BLOCK_') || finalHtml.includes('PRESERVED_MATH_')) {
      // In production, fallback to clean math rendering if any rogue token remained
      finalHtml = finalHtml.replace(/[@_]+(?:MATH|CODE|PRESERVED)[A-Z_0-9]*[@_]+/g, '');
    }

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

  // Triple asterisks: ***bold italic***
  formatted = formatted.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-bold text-white"><em class="italic text-emerald-300">$1</em></strong>');

  // Bold **text** and word-bounded __text__
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  formatted = formatted.replace(/(?<!\w)__([^_]+?)__(?!\w)/g, '<strong class="font-bold text-white">$1</strong>');
  
  // Italic *text* and word-bounded _text_
  formatted = formatted.replace(/\*([^\*]+?)\*/g, '<em class="italic text-slate-300">$1</em>');
  formatted = formatted.replace(/(?<!\w)_([^_]+?)_(?!\w)/g, '<em class="italic text-slate-300">$1</em>');

  // Strikethrough ~~text~~
  formatted = formatted.replace(/~~(.*?)~~/g, '<del class="line-through text-slate-500">$1</del>');

  // Inline code `code`
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-slate-950 text-emerald-300 px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-800">$1</code>');

  // Clean any remaining unclosed or stray markdown tokens (excluding @)
  formatted = formatted.replace(/(?<!\\)[#*`~]{2,}/g, '');

  return formatted;
}



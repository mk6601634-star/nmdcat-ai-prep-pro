import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface FormattedMathContentProps {
  content: string;
  className?: string;
}

// High-performance LRU Caches for zero-latency instant formula & markdown rendering
const KATEX_CACHE = new Map<string, string>();
const MAX_KATEX_CACHE_SIZE = 2000;

const CONTENT_RENDER_CACHE = new Map<string, string>();
const MAX_CONTENT_CACHE_SIZE = 800;

/**
 * Safely render KaTeX math with high-performance LRU memoization
 */
function renderKatexSafe(tex: string, displayMode: boolean): string {
  const trimmed = tex.trim();
  const cacheKey = `${displayMode ? 'D' : 'I'}:${trimmed}`;
  const cached = KATEX_CACHE.get(cacheKey);
  if (cached !== undefined) {
    KATEX_CACHE.delete(cacheKey);
    KATEX_CACHE.set(cacheKey, cached);
    return cached;
  }

  try {
    const rendered = katex.renderToString(trimmed, {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
      strict: false,
      trust: false
    });

    if (KATEX_CACHE.size >= MAX_KATEX_CACHE_SIZE) {
      const oldestKey = KATEX_CACHE.keys().next().value;
      if (oldestKey) KATEX_CACHE.delete(oldestKey);
    }
    KATEX_CACHE.set(cacheKey, rendered);
    return rendered;
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
 * Comprehensive Greek Unicode and standard math operators normalizer
 */
export function normalizeGreekSymbols(str: string): string {
  return str
    .replace(/\bpi\b/g, '\\pi ')
    .replace(/\btheta\b/g, '\\theta ')
    .replace(/\balpha\b/g, '\\alpha ')
    .replace(/\bbeta\b/g, '\\beta ')
    .replace(/\bgamma\b/g, '\\gamma ')
    .replace(/\blambda\b/g, '\\lambda ')
    .replace(/\bmu\b/g, '\\mu ')
    .replace(/\bDelta\b/g, '\\Delta ')
    .replace(/\bomega\b/g, '\\omega ')
    .replace(/\bsigma\b/g, '\\sigma ')
    .replace(/\brho\b/g, '\\rho ')
    .replace(/\bepsilon\b/g, '\\varepsilon ')
    .replace(/[εϵ]/g, '\\varepsilon ')
    .replace(/θ/g, '\\theta ')
    .replace(/α/g, '\\alpha ')
    .replace(/β/g, '\\beta ')
    .replace(/γ/g, '\\gamma ')
    .replace(/δ/g, '\\delta ')
    .replace(/λ/g, '\\lambda ')
    .replace(/μ/g, '\\mu ')
    .replace(/π/g, '\\pi ')
    .replace(/σ/g, '\\sigma ')
    .replace(/ω/g, '\\omega ')
    .replace(/ρ/g, '\\rho ')
    .replace(/τ/g, '\\tau ')
    .replace(/η/g, '\\eta ')
    .replace(/ν/g, '\\nu ')
    .replace(/[ϕφ]/g, '\\phi ')
    .replace(/ψ/g, '\\psi ')
    .replace(/χ/g, '\\chi ')
    .replace(/κ/g, '\\kappa ')
    .replace(/ξ/g, '\\xi ')
    .replace(/ζ/g, '\\zeta ')
    .replace(/Δ/g, '\\Delta ')
    .replace(/Ω/g, '\\Omega ')
    .replace(/Σ/g, '\\Sigma ')
    .replace(/Φ/g, '\\Phi ')
    .replace(/Ψ/g, '\\Psi ')
    .replace(/±/g, '\\pm ')
    .replace(/≠/g, '\\ne ')
    .replace(/≤/g, '\\le ')
    .replace(/≥/g, '\\ge ')
    .replace(/≈/g, '\\approx ')
    .replace(/∝/g, '\\propto ')
    .replace(/∞/g, '\\infty ')
    .replace(/°C/g, '^\\circ\\text{C}')
    .replace(/°/g, '^\\circ')
    .replace(/×/g, '\\times ')
    .replace(/·/g, ' \\cdot ');
}

/**
 * Normalizes Unicode vulgar fractions to LaTeX fractions
 */
export function normalizeVulgarFractions(str: string): string {
  return str
    .replace(/½/g, '\\frac{1}{2}')
    .replace(/¼/g, '\\frac{1}{4}')
    .replace(/¾/g, '\\frac{3}{4}')
    .replace(/⅓/g, '\\frac{1}{3}')
    .replace(/⅔/g, '\\frac{2}{3}')
    .replace(/⅕/g, '\\frac{1}{5}')
    .replace(/⅖/g, '\\frac{2}{5}')
    .replace(/⅗/g, '\\frac{3}{5}')
    .replace(/⅘/g, '\\frac{4}{5}')
    .replace(/⅙/g, '\\frac{1}{6}')
    .replace(/⅚/g, '\\frac{5}{6}')
    .replace(/⅛/g, '\\frac{1}{8}')
    .replace(/⅜/g, '\\frac{3}{8}')
    .replace(/⅝/g, '\\frac{5}{8}')
    .replace(/⅞/g, '\\frac{7}{8}');
}

function matchParen(str: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < str.length; i++) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Robust fraction normalizer handling single and composite algebraic terms
 */
export function normalizeFractions(text: string): string {
  let changed = true;
  let s = text;
  let iterations = 0;

  while (changed && iterations < 10) {
    changed = false;
    iterations++;

    let slashIdx = s.indexOf('/');
    while (slashIdx !== -1) {
      const beforeSlash = s.slice(0, slashIdx);
      if (/\\(frac|text|mathrm|sqrt|left|right)\{[^{}]*$/.test(beforeSlash)) {
        slashIdx = s.indexOf('/', slashIdx + 1);
        continue;
      }

      let before = s.slice(0, slashIdx).trimEnd();
      let after = s.slice(slashIdx + 1).trimStart();
      
      let num = '';
      let numStart = -1;
      let den = '';
      let denEnd = -1;

      if (before.endsWith(')')) {
        let depth = 0;
        let p = before.length - 1;
        while (p >= 0) {
          if (before[p] === ')') depth++;
          else if (before[p] === '(') {
            depth--;
            if (depth === 0) {
              numStart = p;
              num = before.slice(p + 1, before.length - 1);
              break;
            }
          }
          p--;
        }
      } else {
        // Capture algebraic products before division: e.g. "\varepsilon_{0} \varepsilon_{r} A" or "v^{2} \sin(2\theta)" or "m_1 m_2" or "k Q_1 Q_2"
        const m = before.match(/((?:\\?[a-zA-Z0-9_^{}\.]+|\\[a-zA-Z]+(?:\([^)]*\))?|\s*\*\s*|\s+)+)$/);
        if (m) {
          num = m[1].trim();
          numStart = before.length - m[1].length;
        }
      }

      if (after.startsWith('(')) {
        const closeIdx = matchParen(after, 0);
        if (closeIdx !== -1) {
          den = after.slice(1, closeIdx);
          denEnd = closeIdx + 1;
        }
      } else {
        const m = after.match(/^(\\?[a-zA-Z0-9_^{}\.]+|\\[a-zA-Z]+)/);
        if (m) {
          den = m[1].trim();
          denEnd = m[0].length;
        }
      }

      if (num && den && numStart !== -1 && denEnd !== -1) {
        const prefix = before.slice(0, numStart);
        const suffix = after.slice(denEnd);
        
        let cleanNum = num.replace(/\s*\*\s*/g, ' ').replace(/\s+/g, ' ').trim();
        let cleanDen = den.replace(/\s*\*\s*/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Remove outer parens inside num/den if present
        if (cleanNum.startsWith('(') && cleanNum.endsWith(')')) {
          cleanNum = cleanNum.slice(1, -1).trim();
        }
        if (cleanDen.startsWith('(') && cleanDen.endsWith(')')) {
          cleanDen = cleanDen.slice(1, -1).trim();
        }

        const frac = `\\frac{${cleanNum}}{${cleanDen}}`;
        s = prefix + frac + suffix;
        changed = true;
        break;
      }

      slashIdx = s.indexOf('/', slashIdx + 1);
    }
  }

  // Strip redundant parens around \frac: (\frac{a}{b}) -> \frac{a}{b}
  s = s.replace(/\((\\frac\{[^{}]+\}\{[^{}]+\})\)/g, '$1');

  return s;
}

/**
 * Converts ASCII math equations (like R = (v^2*sin(2θ))/g or C = ε_0 ε_r A/d or U = ½CV^2)
 * into canonical LaTeX equations.
 */
export function normalizeMathExpression(expr: string): string {
  let s = normalizeVulgarFractions(expr.trim());
  s = normalizeGreekSymbols(s);

  // Subscripts: \varepsilon_0 -> \varepsilon_{0}, \varepsilon_r -> \varepsilon_{r}, v_i -> v_{i}, V_max -> V_{\max}
  s = s.replace(/(\\?[a-zA-Z]+)\s*_([a-zA-Z0-9]+)/g, (match, prefix, sub) => {
    if (sub === 'max') return `${prefix}_{\\max}`;
    if (sub === 'min') return `${prefix}_{\\min}`;
    return `${prefix}_{${sub}}`;
  });

  // Square roots: sqrt(...) -> \sqrt{...}
  s = s.replace(/sqrt\(([^()]+)\)/gi, (_, inner) => `\\sqrt{${inner}}`);
  s = s.replace(/√\(([^()]+)\)/g, (_, inner) => `\\sqrt{${inner}}`);
  s = s.replace(/√([a-zA-Z0-9]+)/g, (_, inner) => `\\sqrt{${inner}}`);

  // Trig / Log functions: sin(2θ) -> \sin(2\theta), cos(θ) -> \cos(\theta)
  s = s.replace(/\b(sin|cos|tan|cot|sec|csc|log|ln|exp)\s*\(([^()]+)\)/gi, '\\$1($2)');
  s = s.replace(/\b(sin|cos|tan|cot|sec|csc|log|ln|exp)\s+([A-Za-z0-9\\_]+)/gi, '\\$1 $2');

  // Powers: V^2 -> V^{2}, x^(2) -> x^{2}, 10^-3 -> 10^{-3}, (x+1)^2 -> (x+1)^{2}
  s = s.replace(/\*\*([0-9a-zA-Z\+\-]+|\([+-]?[0-9a-zA-Z]+\))/g, '^{$1}');
  s = s.replace(/\^([0-9a-zA-Z]+|\([+-]?[0-9a-zA-Z]+\)|-[0-9a-zA-Z]+)/g, '^{$1}');
  s = s.replace(/\^\{\(([^()]+)\)\}/g, '^{$1}');

  // Multiplication: 2*C -> 2C, 1/2 * C * V^2 -> 1/2 C V^2
  s = s.replace(/(\d+)\s*\*\s*([a-zA-Z\\])/g, '$1$2');
  s = s.replace(/\s*\*\s*/g, ' ');

  // Fractions: (v^2*sin(2θ))/g -> \frac{v^2\sin(2\theta)}{g}, Q^2/(2*C) -> \frac{Q^2}{2C}
  s = normalizeFractions(s);

  // Clean trailing spaces before parens: "\theta )" -> "\theta)"
  s = s.replace(/(\\[a-zA-Z]+)\s+\)/g, '$1)');
  s = s.replace(/\s+\)/g, ')');
  s = s.replace(/\(\s+/g, '(');

  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Normalizes plain-text scientific, physiological, chemical, and mathematical expressions
 * so that expressions without explicit $ delimiters (e.g. from PRISM, databases, textbooks, AI)
 * are cleanly upgraded to LaTeX before markdown and math extraction.
 */
export function normalizeScientificMathNotation(input: string): string {
  if (!input) return '';

  let text = input;

  // 0. Standalone $ on separate lines -> $$ display math
  text = text.replace(/(?:^|\n)[ \t]*\$[ \t]*\n([\s\S]+?)\n[ \t]*\$[ \t]*(?=\n|$)/g, (_, formula) => {
    return `\n$$\n${formula.trim()}\n$$\n`;
  });

  // Standalone \begin{...} -> $$ display math
  text = text.replace(/(?:^|\n)[ \t]*(\\begin\{(?:equation|align|aligned|gather|matrix|pmatrix|bmatrix|cases)\*?\}[\s\S]*?\\end\{(?:equation|align|aligned|gather|matrix|pmatrix|bmatrix|cases)\*?\})[ \t]*(?=\n|$)/g, (_, formula) => {
    return `\n$$\n${formula.trim()}\n$$\n`;
  });

  // 1. Protect existing LaTeX delimiters ($$, $, \[, \], \(, \)) and code blocks (```)
  const preservedBlocks: string[] = [];
  text = text.replace(/```[\s\S]*?```|\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|(?<!\\)\$[^\$\n]+?(?<!\\)\$|\\\([\s\S]*?\\\)/g, (match) => {
    const idx = preservedBlocks.length;
    preservedBlocks.push(match);
    return `@@PRESERVED_MATH_OR_CODE_${idx}@@`;
  });

  // 2. High-Yield Mathematical & Physical Equations (stops at prose boundaries)
  text = text.replace(/(?:^|\n|\s)([a-zA-Z_][a-zA-Z0-9_]*(?:\([a-zA-Z0-9_, ]+\))?)\s*(=|\\approx|\\propto|\\le|\\ge)\s*([^;\n,\.]{2,}?)(?=\s+\b(and|where|with|which|when|then|if|or)\b|\n|$|\.|\,|;)/g, (match, lhs, rel, rhs) => {
    if (/[\^\/\*\+\-θαβγδλμπσωΔΩεϵ½¼¾⅓⅔\\_]|\b(sin|cos|tan|sqrt|log|ln|Vmax|Km|eps)\b|\d/i.test(rhs)) {
      const cleanLhs = normalizeMathExpression(lhs);
      const cleanRhs = normalizeMathExpression(rhs);
      const prefix = match.startsWith('\n') ? '\n' : (match.startsWith(' ') ? ' ' : '');
      return `${prefix}$${cleanLhs} ${rel} ${cleanRhs}$`;
    }
    return match;
  });

  // 3. Isolated ASCII Fractions with Parentheses or Symbols (e.g. Q^2/(2*C) or (v^2*sin(2θ))/g or (a+b)/(c+d))
  text = text.replace(/(?:^|\s|\()([a-zA-Z0-9_θαβγδλμπσωΔΩεϵ\^\{\}\*\+\-]+|\([^)\n]+\))\s*\/\s*([a-zA-Z0-9_θαβγδλμπσωΔΩεϵ\^\{\}\*\+\-]+|\([^)\n]+\))(?=\s|$|\.|\,|\))/g, (match, num, den) => {
    if (/[\^\*\+θαβγδλμπσωΔΩεϵ\\_]|\b(sin|cos|tan|sqrt)\b/i.test(match) || (num.length > 0 && den.length > 0 && isNaN(Number(num)) && isNaN(Number(den)))) {
      const cleanExpr = normalizeMathExpression(`${num}/${den}`);
      return ` $${cleanExpr}$`;
    }
    return match;
  });

  // 4. Isolated math terms in prose (e.g. "ε_0", "ε_r", "V^2", "v^2", "Q^2", "½CV^2", "1/2*C*V^2")
  text = text.replace(/(?:^|\s)(ε_0|ε_r|ε₀|εᵣ|V\^2|v\^2|Q\^2|r\^2|x\^2|t\^2|c\^2|½CV\^2|½mv\^2)(?=\s|$|\.|\,)/g, (_, term) => {
    const clean = normalizeMathExpression(term);
    return ` $${clean}$`;
  });

  // 5. High-Yield Physiological Equations (e.g. V̇A = (PACO2 - PH2O)/K or Vmax / Km)
  text = text.replace(/\b(V̇A|V\.A|V̇O2|V̇CO2|Vmax|Km)\s*=\s*([^\n\.,;]+)/gi, (_, lhs, rhs) => {
    let cleanLhs = lhs;
    if (/V̇A|V\.A/i.test(lhs)) cleanLhs = '\\dot{V}_{\\text{A}}';
    else if (/V̇O2/i.test(lhs)) cleanLhs = '\\dot{V}_{\\text{O}_2}';
    else if (/V̇CO2/i.test(lhs)) cleanLhs = '\\dot{V}_{\\text{CO}_2}';
    else if (/Vmax/i.test(lhs)) cleanLhs = 'V_{\\max}';
    else if (/Km/i.test(lhs)) cleanLhs = 'K_{\\text{m}}';

    let cleanRhs = rhs.trim();
    cleanRhs = cleanRhs
      .replace(/PaO2|Pao2/gi, 'P_{\\text{a}\\text{O}_2}')
      .replace(/PAO2|Pao2/gi, 'P_{\\text{A}\\text{O}_2}')
      .replace(/PaCO2|Paco2/gi, 'P_{\\text{a}\\text{CO}_2}')
      .replace(/PACO2|Paco2/gi, 'P_{\\text{A}\\text{CO}_2}')
      .replace(/PvO2|Pvo2/gi, 'P_{\\text{v}\\text{O}_2}')
      .replace(/PH2O|Ph2o/gi, 'P_{\\text{H}_2\\text{O}}');

    cleanRhs = normalizeMathExpression(cleanRhs);

    return `$${cleanLhs} = ${cleanRhs}$`;
  });

  // 6. Isolated Physiological Gas Pressures & Variables
  text = text.replace(/\b(PaO2|PAO2|PaCO2|PACO2|PvO2|PH2O)\b/g, (match) => {
    switch (match.toUpperCase()) {
      case 'PAO2': return '$P_{\\text{a}\\text{O}_2}$';
      case 'PACO2': return '$P_{\\text{a}\\text{CO}_2}$';
      case 'PVO2': return '$P_{\\text{v}\\text{O}_2}$';
      case 'PH2O': return '$P_{\\text{H}_2\\text{O}}$';
      default: return match;
    }
  });

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

  // 7. Common Chemical Formulas & Polyatomic Ions
  text = text.replace(/(?<![a-zA-Z0-9])(H2O|CO2|H2SO4|HNO3|CaCO3|C6H12O6|CH4|NH4\+|HCO3\-)(?![a-zA-Z0-9])/g, (match) => {
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

  text = text.replace(/(?<![a-zA-Z0-9])(Ca2\+|Mg2\+|Fe2\+|Fe3\+|Zn2\+|Cu2\+|Al3\+|Na\+|K\+|Cl\-)(?![a-zA-Z0-9])/g, (match) => {
    const el = match.slice(0, -2);
    const charge = match.slice(-2);
    if (charge === '2+' || charge === '3+') {
      return `$\\text{${el}}^{${charge}}$`;
    }
    const singleEl = match.slice(0, -1);
    const singleCharge = match.slice(-1);
    return `$\\text{${singleEl}}^{${singleCharge}}$`;
  });

  text = text.replace(/(?<![a-zA-Z0-9])(SO4\s*2\-|SO4\^2\-|SO4\-2)(?![a-zA-Z0-9])/gi, '$\\text{SO}_4^{2-}$');
  text = text.replace(/(?<![a-zA-Z0-9])(PO4\s*3\-|PO4\^3\-|PO4\-3)(?![a-zA-Z0-9])/gi, '$\\text{PO}_4^{3-}$');
  text = text.replace(/(?<![a-zA-Z0-9])(NO3\-)(?![a-zA-Z0-9])/gi, '$\\text{NO}_3^-$');

  // Chemical Reactions: e.g. 2H2 + O2 -> 2H2O or N2 + 3H2 <=> 2NH3
  text = text.replace(/([0-9]*\s*[A-Z][A-Za-z0-9_\^\{\}\+\-\(\)]*(?:\s*\+\s*[0-9]*\s*[A-Z][A-Za-z0-9_\^\{\}\+\-\(\)]*)*)\s*(-->|->|=>|⇌|<=>|<==>)\s*([0-9]*\s*[A-Z][A-Za-z0-9_\^\{\}\+\-\(\)]*(?:\s*\+\s*[0-9]*\s*[A-Z][A-Za-z0-9_\^\{\}\+\-\(\)]*)*)/g, (match, lhs, arrow, rhs) => {
    if (/\b(H2|O2|N2|H2O|CO2|NH3|HCl|NaOH|NaCl|CH4|C6H12O6)\b/i.test(match)) {
      const isEq = arrow.includes('<') || arrow.includes('⇌');
      const arrowLatex = isEq ? '\\rightleftharpoons' : '\\rightarrow';

      const fmtSide = (side: string) => {
        return side.split('+').map(part => {
          const t = part.trim();
          const m = t.match(/^(\d+)\s*(.*)$/);
          const coef = m ? m[1] + ' ' : '';
          const formula = m ? m[2] : t;
          const chemFormula = formula.replace(/([A-Za-z\(\)])(\d+)/g, '$1_{$2}');
          return `${coef}\\mathrm{${chemFormula}}`;
        }).join(' + ');
      };

      return `$$${fmtSide(lhs)} ${arrowLatex} ${fmtSide(rhs)}$$`;
    }
    return match;
  });

  // 8. Scientific Powers & Exponents (e.g. 10^-6, 10-6 in scientific contexts, 10^3, 3 x 10^8)
  text = text.replace(/(\d+(?:\.\d+)?)\s*(?:[x×\*]\s*)?10\^([+-]?\d+)/g, '$$$1 \\times 10^{$2}$$');
  text = text.replace(/\b10\^([+-]?\d+)/g, '$$10^{$1}$$');
  text = text.replace(/\b10\-(\d{1,2})\b/g, '$$10^{-$1}$$');

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
export const FormattedMathContent: React.FC<FormattedMathContentProps> = React.memo(({
  content,
  className = ''
}) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    const cachedContent = CONTENT_RENDER_CACHE.get(content);
    if (cachedContent !== undefined) {
      CONTENT_RENDER_CACHE.delete(content);
      CONTENT_RENDER_CACHE.set(content, cachedContent);
      return cachedContent;
    }

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
      const html = `<span class="inline-math px-0.5">${renderKatexSafe(math, false)}</span>`;
      mathBlocks.push(html);
      return `@@MATH_BLOCK_${idx}@@`;
    });
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
      const idx = mathBlocks.length;
      const html = `<span class="inline-math px-0.5">${renderKatexSafe(math, false)}</span>`;
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
          const cols = row.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
          if (cols.length === 0 || cols.every(c => /^[-:]+$/.test(c))) {
            return;
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
      finalHtml = finalHtml.replace(/[@_]+(?:MATH|CODE|PRESERVED)[A-Z_0-9]*[@_]+/g, '');
    }

    if (CONTENT_RENDER_CACHE.size >= MAX_CONTENT_CACHE_SIZE) {
      const oldestKey = CONTENT_RENDER_CACHE.keys().next().value;
      if (oldestKey) CONTENT_RENDER_CACHE.delete(oldestKey);
    }
    CONTENT_RENDER_CACHE.set(content, finalHtml);

    return finalHtml;
  }, [content]);

  return (
    <div
      className={`math-content prose prose-invert max-w-none break-words ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
});

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

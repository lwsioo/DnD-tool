import { m as msg } from '@/i18n';
/**
 * Parser sicuro per le formule della scheda (niente eval).
 *
 * Sintassi: numeri, + - * /, parentesi, funzioni floor ceil round min max abs, variabili:
 *   pb (alias bc)            bonus di competenza
 *   lvl (alias liv)          livello totale
 *   lvl.<classe>             livello in una classe (0 se assente), es. lvl.monk
 *   mod.<car> / score.<car>  modificatore / punteggio (str dex con int wis cha, o for des cos int sag car)
 *
 * Esempi: "3", "pb", "max(1, mod.cha)", "floor(lvl.monk / 2) + 1", "2 * lvl"
 */

export class FormulaError extends Error {
  constructor(
    message: string,
    readonly formula: string,
  ) {
    super(message);
    this.name = 'FormulaError';
  }
}

export interface FormulaVars {
  pb: number;
  lvl: number;
  /** Livelli per classKey. */
  classLevels: Record<string, number>;
  mods: Record<string, number>;
  scores: Record<string, number>;
}

const ABILITY_ALIASES: Record<string, string> = {
  str: 'str',
  dex: 'dex',
  con: 'con',
  int: 'int',
  wis: 'wis',
  cha: 'cha',
  for: 'str',
  des: 'dex',
  cos: 'con',
  sag: 'wis',
  car: 'cha',
};

type Token =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: '+' | '-' | '*' | '/' }
  | { t: '(' }
  | { t: ')' }
  | { t: ',' };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (/\s/.test(ch)) {
      i++;
    } else if (/[0-9.]/.test(ch)) {
      const m = /^\d*\.?\d+/.exec(src.slice(i));
      if (!m) throw new FormulaError(msg.engine.formula.badNumber(src.slice(i, i + 5)), src);
      tokens.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
    } else if (/[a-zA-Z_]/.test(ch)) {
      const m = /^[a-zA-Z_][\w.]*/.exec(src.slice(i))!;
      tokens.push({ t: 'id', v: m[0].toLowerCase() });
      i += m[0].length;
    } else if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ t: 'op', v: ch });
      i++;
    } else if (ch === '(' || ch === ')' || ch === ',') {
      tokens.push({ t: ch });
      i++;
    } else {
      throw new FormulaError(msg.engine.formula.badChar(ch), src);
    }
  }
  return tokens;
}

const FUNCTIONS: Record<string, (args: number[]) => number> = {
  floor: ([a = 0]) => Math.floor(a),
  ceil: ([a = 0]) => Math.ceil(a),
  round: ([a = 0]) => Math.round(a),
  abs: ([a = 0]) => Math.abs(a),
  min: (args) => Math.min(...args),
  max: (args) => Math.max(...args),
};

function resolveVariable(name: string, vars: FormulaVars, src: string): number {
  if (name === 'pb' || name === 'bc') return vars.pb;
  if (name === 'lvl' || name === 'liv') return vars.lvl;
  const dot = name.indexOf('.');
  if (dot < 0) throw new FormulaError(msg.engine.formula.unknownVar(name), src);
  const head = name.slice(0, dot);
  const rest = name.slice(dot + 1);
  if ((head === 'lvl' || head === 'liv') && rest) return vars.classLevels[rest] ?? 0;
  if (head === 'mod' || head === 'score') {
    const ability = ABILITY_ALIASES[rest];
    if (!ability) throw new FormulaError(msg.engine.formula.unknownAbility(rest), src);
    return (head === 'mod' ? vars.mods : vars.scores)[ability] ?? 0;
  }
  throw new FormulaError(msg.engine.formula.unknownVar(name), src);
}

/** Valuta una formula. Lancia FormulaError se non è valida. */
export function evaluateFormula(src: string, vars: FormulaVars): number {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  const expect = (t: Token['t']) => {
    const tok = next();
    if (tok?.t !== t) throw new FormulaError(msg.engine.formula.expected(t), src);
  };

  function expr(): number {
    let value = term();
    for (let tok = peek(); tok?.t === 'op' && (tok.v === '+' || tok.v === '-'); tok = peek()) {
      next();
      value = tok.v === '+' ? value + term() : value - term();
    }
    return value;
  }

  function term(): number {
    let value = unary();
    for (let tok = peek(); tok?.t === 'op' && (tok.v === '*' || tok.v === '/'); tok = peek()) {
      next();
      const rhs = unary();
      if (tok.v === '/' && rhs === 0) throw new FormulaError(msg.engine.formula.divByZero, src);
      value = tok.v === '*' ? value * rhs : value / rhs;
    }
    return value;
  }

  function unary(): number {
    const tok = peek();
    if (tok?.t === 'op' && (tok.v === '-' || tok.v === '+')) {
      next();
      return tok.v === '-' ? -unary() : unary();
    }
    return primary();
  }

  function primary(): number {
    const tok = next();
    if (!tok) throw new FormulaError(msg.engine.formula.incomplete, src);
    if (tok.t === 'num') return tok.v;
    if (tok.t === '(') {
      const value = expr();
      expect(')');
      return value;
    }
    if (tok.t === 'id') {
      if (peek()?.t === '(') {
        const fn = FUNCTIONS[tok.v];
        if (!fn) throw new FormulaError(msg.engine.formula.unknownFn(tok.v), src);
        next();
        const args: number[] = [];
        if (peek()?.t !== ')') {
          args.push(expr());
          while (peek()?.t === ',') {
            next();
            args.push(expr());
          }
        }
        expect(')');
        if (args.length === 0) throw new FormulaError(msg.engine.formula.needsArg(tok.v), src);
        return fn(args);
      }
      return resolveVariable(tok.v, vars, src);
    }
    throw new FormulaError(msg.engine.formula.invalid, src);
  }

  if (tokens.length === 0) throw new FormulaError(msg.engine.formula.empty, src);
  const result = expr();
  if (pos < tokens.length) throw new FormulaError(msg.engine.formula.trailing, src);
  if (!Number.isFinite(result)) throw new FormulaError(msg.engine.formula.notFinite, src);
  return result;
}

export type FormulaResult = { ok: true; value: number } | { ok: false; error: string };

/** Variante che non lancia: utile nei form e nel motore (una formula errata vale `fallback`). */
export function tryEvaluateFormula(src: string, vars: FormulaVars): FormulaResult {
  try {
    return { ok: true, value: evaluateFormula(src, vars) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function evaluateOr(src: string | undefined, vars: FormulaVars, fallback = 0): number {
  if (src === undefined || src.trim() === '') return fallback;
  const r = tryEvaluateFormula(src, vars);
  return r.ok ? r.value : fallback;
}

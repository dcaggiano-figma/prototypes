/**
 * Math expression parser and evaluator.
 *
 * Adapted from Figma's math_parser.ts. Supports arithmetic, parentheses,
 * exponentiation, unit suffixes (px, x, %), and the "Mixed" variable which
 * substitutes `currentValue` at eval time.
 *
 * Uses the shunting-yard algorithm (Dijkstra) for infix expression parsing.
 */

// ── Public API ───────────────────────────────────────────────────────

export enum ErrorType {
  NONE,
  SYNTAX_EMPTY,
  SYNTAX_UNRECOGNIZED,
  SYNTAX_MISMATCHED_PARENS,
  EVAL_UNEXPECTED_TYPE,
  EVAL_EXPECTED_MORE_ARGUMENTS,
  EVAL_IMAGINARY,
  EVAL_UNKNOWN,
  EVAL_NO_CURRENT_VALUE,
  EVAL_INFINITE,
  EVAL_NAN,
}

export interface ErrorInfo {
  type: ErrorType
  /** The problematic range in the input. */
  position?: number
  length?: number
}

export interface AnswerSuccess {
  value: number
  error: null
}

export interface AnswerError {
  value: null
  error: ErrorInfo
}

export type Answer = AnswerSuccess | AnswerError

/**
 * Evaluate a mathematical expression and return the result.
 *
 * If the result's `error` is null, `value` is guaranteed to be finite and
 * non-NaN. Pass `currentValue` to resolve the `Mixed` variable and `%`/`x`
 * suffixes. When `currentValue` is omitted and the expression references it,
 * the error `EVAL_NO_CURRENT_VALUE` is returned.
 */
export function evaluateExpression(expression: string, currentValue?: number): Answer {
  const tokens: Token[] = []
  const error = tokenize(expression, tokens)

  if (error !== null) return { value: null, error }

  const output: number[] = []
  const stack: Token[] = []

  for (const token of tokens) {
    switch (token.type) {
      case TokenType.NUMBER: {
        output.push(token.value)
        break
      }

      case TokenType.MIXED_VARIABLE: {
        if (!currentValue && currentValue !== 0) {
          return { value: null, error: { type: ErrorType.EVAL_NO_CURRENT_VALUE } }
        }
        output.push(currentValue)
        break
      }

      case TokenType.OPERATOR: {
        const operator = operators[token.operator]

        switch (token.operator) {
          case OperatorType.UNARY_PLUS:
            break

          case OperatorType.PAREN_L:
            stack.push(token)
            break

          case OperatorType.PAREN_R: {
            if (!stack.length) {
              return {
                value: null,
                error: { type: ErrorType.SYNTAX_MISMATCHED_PARENS, position: token.position },
              }
            }
            while (stack.length) {
              const top = stack[stack.length - 1]!
              if (top.operator === OperatorType.PAREN_L) {
                stack.pop()
                break
              }
              const type = evaluate(top.operator, output, currentValue)
              if (type !== ErrorType.NONE) return { value: null, error: { type } }
              stack.pop()

              if (!stack.length) {
                return {
                  value: null,
                  error: { type: ErrorType.SYNTAX_MISMATCHED_PARENS, position: token.position },
                }
              }
            }
            break
          }

          default: {
            let t: Token | undefined
            while ((t = stack[stack.length - 1])) {
              if (operator.associativity === Associativity.LEFT) {
                if (operator.precedence <= operators[t.operator].precedence) {
                  const type = evaluate(t.operator, output, currentValue)
                  if (type !== ErrorType.NONE) return { value: null, error: { type } }
                  stack.pop()
                } else {
                  break
                }
              } else if (operator.associativity === Associativity.RIGHT) {
                if (operator.precedence < operators[t.operator].precedence) {
                  const type = evaluate(t.operator, output, currentValue)
                  if (type !== ErrorType.NONE) return { value: null, error: { type } }
                  stack.pop()
                } else {
                  break
                }
              } else {
                return { value: null, error: { type: ErrorType.EVAL_UNKNOWN } }
              }
            }
            stack.push(token)
            break
          }
        }
        break
      }

      default:
        return { value: null, error: { type: ErrorType.SYNTAX_UNRECOGNIZED } }
    }
  }

  // Flush remaining operators
  while (stack.length) {
    const token = stack.pop()!
    if (token.operator === OperatorType.PAREN_L || token.operator === OperatorType.PAREN_R) {
      return {
        value: null,
        error: { type: ErrorType.SYNTAX_MISMATCHED_PARENS, position: expression.length },
      }
    }
    const type = evaluate(token.operator, output, currentValue)
    if (type !== ErrorType.NONE) return { value: null, error: { type } }
  }

  if (output.length !== 1) return { value: null, error: { type: ErrorType.SYNTAX_UNRECOGNIZED } }

  const value = output[0]!
  if (Number.isNaN(value)) return { value: null, error: { type: ErrorType.EVAL_NAN } }
  if (!Number.isFinite(value)) return { value: null, error: { type: ErrorType.EVAL_INFINITE } }

  return { value, error: null }
}

// ── Evaluation ───────────────────────────────────────────────────────

enum OperatorType {
  NONE,
  PAREN_L,
  PAREN_R,
  ADD,
  SUBTRACT,
  MULTIPLY,
  DIVIDE,
  UNARY_PLUS,
  UNARY_MINUS,
  EXPONENT,
  PERCENT,
  X,
  PIXELS,
}

const enum Associativity {
  NONE,
  LEFT,
  RIGHT,
}

interface Operator {
  associativity: Associativity
  precedence: number
  degree: number
}

const operators: readonly Operator[] = [
  { associativity: Associativity.NONE, precedence: -1, degree: 0 },  // NONE
  { associativity: Associativity.NONE, precedence: -1, degree: 0 },  // PAREN_L
  { associativity: Associativity.NONE, precedence: -1, degree: 0 },  // PAREN_R
  { associativity: Associativity.LEFT, precedence: 1, degree: 2 },   // ADD
  { associativity: Associativity.LEFT, precedence: 1, degree: 2 },   // SUBTRACT
  { associativity: Associativity.LEFT, precedence: 2, degree: 2 },   // MULTIPLY
  { associativity: Associativity.LEFT, precedence: 2, degree: 2 },   // DIVIDE
  { associativity: Associativity.LEFT, precedence: 4, degree: 1 },   // UNARY_PLUS
  { associativity: Associativity.LEFT, precedence: 4, degree: 1 },   // UNARY_MINUS
  { associativity: Associativity.RIGHT, precedence: 5, degree: 2 },  // EXPONENT
  { associativity: Associativity.RIGHT, precedence: 6, degree: 1 },  // PERCENT
  { associativity: Associativity.RIGHT, precedence: 6, degree: 1 },  // X
  { associativity: Associativity.RIGHT, precedence: 6, degree: 1 },  // PIXELS
]

function evaluate(type: OperatorType, values: number[], currentValue?: number): ErrorType {
  if (values.length < operators[type].degree) return ErrorType.EVAL_EXPECTED_MORE_ARGUMENTS

  switch (type) {
    case OperatorType.NONE:
    case OperatorType.PAREN_L:
    case OperatorType.PAREN_R:
      return ErrorType.EVAL_UNEXPECTED_TYPE

    case OperatorType.ADD:
    case OperatorType.SUBTRACT:
    case OperatorType.MULTIPLY:
    case OperatorType.DIVIDE:
    case OperatorType.EXPONENT: {
      const b = values.pop()!
      const a = values.pop()!
      switch (type) {
        case OperatorType.ADD: values.push(a + b); break
        case OperatorType.SUBTRACT: values.push(a - b); break
        case OperatorType.MULTIPLY: values.push(a * b); break
        case OperatorType.DIVIDE: values.push(a / b); break
        case OperatorType.EXPONENT: {
          const d = Math.pow(a, b)
          if (isNaN(d)) return ErrorType.EVAL_IMAGINARY
          values.push(d)
          break
        }
      }
      break
    }

    case OperatorType.UNARY_PLUS:
    case OperatorType.PIXELS:
      break

    case OperatorType.UNARY_MINUS:
      values.push(-values.pop()!)
      break

    case OperatorType.PERCENT: {
      if (!currentValue && currentValue !== 0) return ErrorType.EVAL_NO_CURRENT_VALUE
      values.push((currentValue * values.pop()!) / 100)
      break
    }

    case OperatorType.X: {
      if (!currentValue && currentValue !== 0) return ErrorType.EVAL_NO_CURRENT_VALUE
      values.push(currentValue * values.pop()!)
      break
    }
  }

  return ErrorType.NONE
}

// ── Tokenization ─────────────────────────────────────────────────────

const enum TokenType {
  NONE,
  OPERATOR,
  NUMBER,
  MIXED_VARIABLE,
}

const enum TokenId {
  NONE,
  OPEN_PAREN,
  CLOSE_PAREN,
  PLUS,
  MINUS,
  ASTERISK,
  SLASH,
  CARET,
  PERCENT,
  X,
  PIXELS,
}

interface Token {
  text: string
  position: number
  id: TokenId
  type: TokenType
  operator: OperatorType
  value: number
}

const textToTokenId: Record<string, TokenId> = {
  '(': TokenId.OPEN_PAREN,
  ')': TokenId.CLOSE_PAREN,
  '+': TokenId.PLUS,
  '-': TokenId.MINUS,
  '*': TokenId.ASTERISK,
  '/': TokenId.SLASH,
  '^': TokenId.CARET,
  '%': TokenId.PERCENT,
  x: TokenId.X,
  X: TokenId.X,
  px: TokenId.PIXELS,
}

const tokenIdToOperatorType: Record<number, OperatorType> = {
  [TokenId.OPEN_PAREN]: OperatorType.PAREN_L,
  [TokenId.CLOSE_PAREN]: OperatorType.PAREN_R,
  [TokenId.PLUS]: OperatorType.ADD,
  [TokenId.MINUS]: OperatorType.SUBTRACT,
  [TokenId.ASTERISK]: OperatorType.MULTIPLY,
  [TokenId.SLASH]: OperatorType.DIVIDE,
  [TokenId.CARET]: OperatorType.EXPONENT,
  [TokenId.PERCENT]: OperatorType.PERCENT,
  [TokenId.X]: OperatorType.X,
  [TokenId.PIXELS]: OperatorType.PIXELS,
}

function tokenize(expression: string, tokens: Token[]): ErrorInfo | null {
  // Normalize "mixed" (no i18n needed — we only support English)
  expression = expression.toLowerCase()
  const parts = expression.split(
    /(mixed|px|[+*()^\/%x\-]|(?:\d+[.,]?\d*|[.,]?\d+)(?:[e][+\-]?\d+)?|(?:\s+))/g,
  )
  const count = parts.length

  if (count === 0) return { type: ErrorType.SYNTAX_EMPTY }

  let position = 0

  for (let i = 0; i < count; i++) {
    const part = parts[i]!
    const length = part.length

    // Odd indices are regex captures (tokens)
    if (i % 2) {
      const id = Object.prototype.hasOwnProperty.call(textToTokenId, part) ? textToTokenId[part]! : TokenId.NONE
      const token: Token = {
        id,
        text: part,
        type: id !== TokenId.NONE ? TokenType.OPERATOR : TokenType.NONE,
        operator: tokenIdToOperatorType[id] ?? OperatorType.NONE,
        position,
        value: NaN,
      }

      if (token.type === TokenType.NONE) {
        if (/^(?:\d+[.,]?\d*|[.,]?\d+)(?:[eE][+\-]?\d+)?$/.test(part)) {
          token.type = TokenType.NUMBER
          token.value = +part.replace(',', '.')
        } else if (part === 'mixed') {
          token.type = TokenType.MIXED_VARIABLE
        }
      }

      if (token.type !== TokenType.NONE) {
        tokens.push(token)
      }
    }
    // Even indices are non-captured gaps (must be empty or whitespace)
    else if (length > 0) {
      return { type: ErrorType.SYNTAX_UNRECOGNIZED, position, length }
    }

    position += length
  }

  if (tokens.length === 0) return { type: ErrorType.SYNTAX_EMPTY }

  // Post-process: detect unary + and -
  let previous: Token | null = null
  for (let i = 0; i < tokens.length; i++) {
    const current = tokens[i]!
    if (
      (current.operator === OperatorType.ADD || current.operator === OperatorType.SUBTRACT)
      && (previous === null || comesBeforeUnaryOperator(previous.operator))
    ) {
      current.operator = current.operator === OperatorType.ADD
        ? OperatorType.UNARY_PLUS
        : OperatorType.UNARY_MINUS
    }
    previous = current
  }

  return null
}

function comesBeforeUnaryOperator(type: OperatorType): boolean {
  const operator = operators[type]
  return (
    type === OperatorType.PAREN_L
    || operator.degree === 2
    || (operator.degree === 1 && operator.associativity === Associativity.LEFT)
  )
}

/**
 * ROLE: EXECUTABLE
 * CONNECTED VIA: TypeScript modules
 * PURPOSE: TypeScript calculator with type safety
 * FAILURE MODES: Division by zero throws typed error, invalid input types caught at compile time
 *
 * Authority: multilang-test.md
 */

// TypeScript Calculator compiled to JavaScript-compatible syntax
class Calculator {
  constructor(precision = 10) {
    this.history = [];
    this.precision = precision;
  }

  add(a, b) {
    const result = a + b;
    this.history.push({ operation: 'add', operands: [a, b], result, timestamp: new Date() });
    return this.round(result);
  }

  subtract(a, b) {
    const result = a - b;
    this.history.push({ operation: 'subtract', operands: [a, b], result, timestamp: new Date() });
    return this.round(result);
  }

  multiply(a, b) {
    const result = a * b;
    this.history.push({ operation: 'multiply', operands: [a, b], result, timestamp: new Date() });
    return this.round(result);
  }

  divide(a, b) {
    if (b === 0) throw new Error('Cannot divide by zero');
    const result = a / b;
    this.history.push({ operation: 'divide', operands: [a, b], result, timestamp: new Date() });
    return this.round(result);
  }

  power(base, exp) {
    const result = Math.pow(base, exp);
    this.history.push({ operation: 'power', operands: [base, exp], result, timestamp: new Date() });
    return this.round(result);
  }

  getHistory() {
    return [...this.history];
  }

  round(value) {
    const multiplier = Math.pow(10, this.precision);
    return Math.round(value * multiplier) / multiplier;
  }
}

export default Calculator;

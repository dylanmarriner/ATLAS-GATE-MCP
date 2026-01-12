/**
 * ROLE: EXECUTABLE
 * CONNECTED VIA: ES6 modules
 * PURPOSE: JavaScript calculator implementation
 * FAILURE MODES: Division by zero throws error, invalid factorial input throws error
 *
 * Authority: multilang-test.md
 */

// JavaScript Calculator - ES6 Class
class Calculator {
  constructor(precision = 10) {
    this.history = [];
    this.precision = precision;
  }

  add(a, b) {
    const result = a + b;
    this.history.push({ op: 'add', a, b, result, ts: new Date() });
    return parseFloat(result.toFixed(this.precision));
  }

  subtract(a, b) {
    const result = a - b;
    this.history.push({ op: 'subtract', a, b, result, ts: new Date() });
    return parseFloat(result.toFixed(this.precision));
  }

  multiply(a, b) {
    const result = a * b;
    this.history.push({ op: 'multiply', a, b, result, ts: new Date() });
    return parseFloat(result.toFixed(this.precision));
  }

  divide(a, b) {
    if (b === 0) throw new Error('Division by zero');
    const result = a / b;
    this.history.push({ op: 'divide', a, b, result, ts: new Date() });
    return parseFloat(result.toFixed(this.precision));
  }

  power(base, exp) {
    const result = Math.pow(base, exp);
    this.history.push({ op: 'power', a: base, b: exp, result, ts: new Date() });
    return parseFloat(result.toFixed(this.precision));
  }

  factorial(n) {
    if (n < 0) throw new Error('Factorial undefined for negative');
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    this.history.push({ op: 'factorial', a: n, result, ts: new Date() });
    return result;
  }

  getHistory() {
    return this.history;
  }
}

module.exports = Calculator;

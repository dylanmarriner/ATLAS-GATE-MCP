/**
 * ROLE: EXECUTABLE
 * CONNECTED VIA: CommonJS module export
 * PURPOSE: Production data pipeline with validation and transformation stages
 * FAILURE MODES: Invalid id throws validation error, negative amounts throw error, missing transformations throw execution error
 *
 * Authority: 03-python-functions.md
 */

// Data Analytics Pipeline with Real Processing Logic
class DataProcessor {
  constructor() {
    this.transformations = [];
    this.validations = [];
    this.records = [];
  }
  
  registerValidation(validationName, validationFunction) {
    this.validations.push({ name: validationName, fn: validationFunction });
  }
  
  registerTransformation(transformName, transformFunction) {
    this.transformations.push({ name: transformName, fn: transformFunction });
  }
  
  processRecords(inputData) {
    const results = [];
    
    for (const record of inputData) {
      let processedRecord = { ...record, validations: [], transformations: [] };
      
      for (const validation of this.validations) {
        try {
          validation.fn(processedRecord);
          processedRecord.validations.push({ name: validation.name, status: 'passed' });
        } catch (error) {
          processedRecord.validations.push({ name: validation.name, status: 'failed', error: error.message });
          throw error;
        }
      }
      
      for (const transformation of this.transformations) {
        try {
          processedRecord = transformation.fn(processedRecord);
          processedRecord.transformations.push(transformation.name);
        } catch (error) {
          throw new Error(`Transformation ${transformation.name} failed: ${error.message}`);
        }
      }
      
      results.push(processedRecord);
    }
    
    return results;
  }
  
  getStatistics(records) {
    const numericValues = records
      .map(r => r.value)
      .filter(v => typeof v === 'number');
    
    if (numericValues.length === 0) {
      throw new Error('No numeric values found');
    }
    
    const sum = numericValues.reduce((a, b) => a + b, 0);
    const mean = sum / numericValues.length;
    const sorted = numericValues.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const max = Math.max(...numericValues);
    const min = Math.min(...numericValues);
    
    return { sum, mean, median, max, min, count: numericValues.length };
  }
}

// Real customer transaction data
const transactionData = [
  { id: 101, customer: 'Alice Smith', amount: 250.75, category: 'Electronics', date: '2024-01-12' },
  { id: 102, customer: 'Bob Johnson', amount: 1500.00, category: 'Furniture', date: '2024-01-12' },
  { id: 103, customer: 'Carol White', amount: 89.99, category: 'Books', date: '2024-01-11' },
  { id: 104, customer: 'David Brown', amount: 3200.50, category: 'Electronics', date: '2024-01-10' }
];

const processor = new DataProcessor();

processor.registerValidation('checkId', (record) => {
  if (!record.id || typeof record.id !== 'number') {
    throw new Error('Invalid id');
  }
});

processor.registerValidation('checkAmount', (record) => {
  if (!record.amount || record.amount <= 0) {
    throw new Error('Amount must be positive');
  }
});

processor.registerTransformation('normalizeCustomerName', (record) => ({
  ...record,
  customer: record.customer.toUpperCase()
}));

processor.registerTransformation('addTaxAmount', (record) => ({
  ...record,
  tax: parseFloat((record.amount * 0.08).toFixed(2)),
  total: parseFloat((record.amount * 1.08).toFixed(2))
}));

processor.registerTransformation('categorizeAmount', (record) => ({
  ...record,
  amountRange: record.amount > 1000 ? 'high' : record.amount > 500 ? 'medium' : 'low'
}));

module.exports = { DataProcessor, transactionData, processor };

/**
 * ROLE: EXECUTABLE
 * CONNECTED VIA: CommonJS module export
 * PURPOSE: Data pipeline with validation, transformation, and analytics
 * FAILURE MODES: Missing fields throw validation error, non-numeric values throw error, empty dataset throws analysis error
 *
 * Authority: 03-python-functions.md
 */

// Plan 03: Data Analytics ETL Pipeline
class DataValidator {
  validateRecord(record) {
    if (!record.id) {
      throw new Error('Record missing id field');
    }
    if (!record.timestamp) {
      throw new Error('Record missing timestamp');
    }
    if (record.value === undefined || record.value === null) {
      throw new Error('Record missing value field');
    }
    if (typeof record.value !== 'number') {
      throw new Error('Value must be numeric');
    }
    return true;
  }
}

class DataTransformer {
  normalizeValue(record) {
    return {
      ...record,
      normalized_value: record.value / 100,
      processed_at: new Date()
    };
  }
  
  enrichWithDate(record) {
    const date = new Date(record.timestamp);
    return {
      ...record,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate()
    };
  }
  
  calculateMetrics(record) {
    return {
      ...record,
      is_high_value: record.value > 1000,
      value_category: record.value < 100 ? 'low' : record.value < 500 ? 'medium' : 'high'
    };
  }
}

class ETLPipeline {
  constructor() {
    this.validator = new DataValidator();
    this.transformer = new DataTransformer();
    this.processedRecords = [];
    this.errorRecords = [];
  }
  
  process(inputData) {
    for (const record of inputData) {
      try {
        this.validator.validateRecord(record);
        
        let processedRecord = record;
        processedRecord = this.transformer.normalizeValue(processedRecord);
        processedRecord = this.transformer.enrichWithDate(processedRecord);
        processedRecord = this.transformer.calculateMetrics(processedRecord);
        
        this.processedRecords.push(processedRecord);
      } catch (error) {
        this.errorRecords.push({
          record,
          error: error.message
        });
      }
    }
  }
  
  getStatistics() {
    const values = this.processedRecords.map(r => r.value);
    
    if (values.length === 0) {
      throw new Error('No valid records to analyze');
    }
    
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const sorted = values.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return {
      count: values.length,
      sum: parseFloat(sum.toFixed(2)),
      mean: parseFloat(mean.toFixed(2)),
      median: parseFloat(median.toFixed(2)),
      min,
      max,
      errors: this.errorRecords.length
    };
  }
}

const inputData = [
  { id: 'R001', timestamp: '2024-01-12T10:00:00Z', value: 150 },
  { id: 'R002', timestamp: '2024-01-12T11:00:00Z', value: 2500 },
  { id: 'R003', timestamp: '2024-01-12T12:00:00Z', value: 450 },
  { id: 'R004', timestamp: '2024-01-12T13:00:00Z', value: 1200 },
  { id: 'R005', timestamp: '2024-01-12T14:00:00Z', value: 800 }
];

const pipeline = new ETLPipeline();
pipeline.process(inputData);
const stats = pipeline.getStatistics();

module.exports = { DataValidator, DataTransformer, ETLPipeline, stats };

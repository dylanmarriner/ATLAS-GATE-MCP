---
status: APPROVED
title: "SQL Full-Stack Data Warehouse"
description: "Advanced SQL analytics system with CTEs, window functions, and complex queries for business intelligence"
author: "AMP"
created: "2024-01-12"
scope: "tests/lang/sql/**"
---

# SQL Full-Stack Implementation Plan

## Overview
Build a comprehensive data warehouse using SQL with advanced query optimization, dimensional modeling, and analytics capabilities.

## Schema Design

### 1. Fact and Dimension Tables
```sql
-- Dimensional Tables
CREATE TABLE dim_customer (
    customer_id INT PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    country VARCHAR(100),
    city VARCHAR(100),
    join_date DATE,
    customer_segment VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE dim_product (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    unit_price DECIMAL(10, 2),
    supplier_id INT,
    is_discontinued BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE dim_date (
    date_id INT PRIMARY KEY,
    full_date DATE UNIQUE,
    day_of_week VARCHAR(20),
    month INT,
    quarter INT,
    year INT,
    is_weekend BOOLEAN,
    is_holiday BOOLEAN
);

-- Fact Table
CREATE TABLE fact_sales (
    sales_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    product_id INT NOT NULL,
    date_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2),
    discount_percent DECIMAL(5, 2),
    sales_amount DECIMAL(12, 2),
    tax_amount DECIMAL(10, 2),
    total_amount DECIMAL(12, 2),
    FOREIGN KEY (customer_id) REFERENCES dim_customer(customer_id),
    FOREIGN KEY (product_id) REFERENCES dim_product(product_id),
    FOREIGN KEY (date_id) REFERENCES dim_date(date_id)
);

-- Create indexes for performance
CREATE INDEX idx_fact_customer ON fact_sales(customer_id);
CREATE INDEX idx_fact_product ON fact_sales(product_id);
CREATE INDEX idx_fact_date ON fact_sales(date_id);
CREATE INDEX idx_fact_amount ON fact_sales(total_amount);
```

## Advanced Query Patterns

### 1. Common Table Expressions (CTEs)
```sql
-- Revenue analysis with CTEs
WITH monthly_sales AS (
    SELECT
        d.year,
        d.month,
        SUM(fs.total_amount) as total_revenue,
        COUNT(DISTINCT fs.customer_id) as unique_customers,
        COUNT(DISTINCT fs.sales_id) as transaction_count
    FROM fact_sales fs
    JOIN dim_date d ON fs.date_id = d.date_id
    GROUP BY d.year, d.month
),
growth_analysis AS (
    SELECT
        year,
        month,
        total_revenue,
        LAG(total_revenue) OVER (ORDER BY year, month) as prev_month_revenue,
        ((total_revenue - LAG(total_revenue) OVER (ORDER BY year, month))
            / LAG(total_revenue) OVER (ORDER BY year, month) * 100) as revenue_growth_pct
    FROM monthly_sales
)
SELECT
    year,
    month,
    total_revenue,
    revenue_growth_pct,
    CASE
        WHEN revenue_growth_pct > 10 THEN 'Strong Growth'
        WHEN revenue_growth_pct > 0 THEN 'Moderate Growth'
        WHEN revenue_growth_pct < -10 THEN 'Significant Decline'
        ELSE 'Stable'
    END as growth_status
FROM growth_analysis
ORDER BY year, month;
```

### 2. Window Functions
```sql
-- Customer lifetime value and ranking
SELECT
    dc.customer_id,
    dc.customer_name,
    SUM(fs.total_amount) as lifetime_value,
    RANK() OVER (ORDER BY SUM(fs.total_amount) DESC) as customer_rank,
    ROW_NUMBER() OVER (PARTITION BY dc.customer_segment ORDER BY SUM(fs.total_amount) DESC) as segment_rank,
    PERCENT_RANK() OVER (ORDER BY SUM(fs.total_amount) DESC) as percentile,
    SUM(SUM(fs.total_amount)) OVER (ORDER BY SUM(fs.total_amount) DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as running_total
FROM dim_customer dc
LEFT JOIN fact_sales fs ON dc.customer_id = fs.customer_id
GROUP BY dc.customer_id, dc.customer_name, dc.customer_segment
ORDER BY lifetime_value DESC;
```

### 3. Complex Aggregations
```sql
-- Cohort analysis
WITH customer_cohorts AS (
    SELECT
        customer_id,
        YEAR(MIN(dd.full_date)) as cohort_year,
        MONTH(MIN(dd.full_date)) as cohort_month,
        DATE_TRUNC('month', MIN(dd.full_date)) as cohort_date
    FROM fact_sales fs
    JOIN dim_date dd ON fs.date_id = dd.date_id
    GROUP BY customer_id
),
customer_activity AS (
    SELECT
        cc.customer_id,
        cc.cohort_date,
        DATE_TRUNC('month', dd.full_date) as activity_month,
        DATEDIFF(MONTH, cc.cohort_date, DATE_TRUNC('month', dd.full_date)) as months_since_cohort,
        SUM(fs.total_amount) as cohort_revenue
    FROM fact_sales fs
    JOIN dim_date dd ON fs.date_id = dd.date_id
    JOIN customer_cohorts cc ON fs.customer_id = cc.customer_id
    GROUP BY cc.customer_id, cc.cohort_date, DATE_TRUNC('month', dd.full_date)
)
SELECT
    cohort_date,
    months_since_cohort,
    COUNT(DISTINCT customer_id) as customers,
    SUM(cohort_revenue) as total_revenue,
    ROUND(SUM(cohort_revenue) / COUNT(DISTINCT customer_id), 2) as avg_revenue_per_customer
FROM customer_activity
WHERE months_since_cohort >= 0
GROUP BY cohort_date, months_since_cohort
ORDER BY cohort_date, months_since_cohort;
```

## Performance Optimization

### 1. Query Optimization
```sql
-- Inefficient: Multiple aggregations
SELECT customer_id, COUNT(*) as order_count
FROM fact_sales
GROUP BY customer_id
UNION ALL
SELECT customer_id, SUM(total_amount)
FROM fact_sales
GROUP BY customer_id;

-- Optimized: Single pass
SELECT
    customer_id,
    COUNT(*) as order_count,
    SUM(total_amount) as total_revenue
FROM fact_sales
GROUP BY customer_id;

-- Use EXPLAIN to analyze query plans
EXPLAIN ANALYZE
SELECT
    dc.customer_name,
    SUM(fs.total_amount) as total_spent
FROM dim_customer dc
JOIN fact_sales fs ON dc.customer_id = fs.customer_id
WHERE dc.is_active = TRUE
    AND YEAR(CAST(fs.sales_date AS DATE)) = 2023
GROUP BY dc.customer_id, dc.customer_name
HAVING SUM(fs.total_amount) > 1000
ORDER BY total_spent DESC;
```

### 2. Materialized Views
```sql
-- Create materialized view for frequent queries
CREATE MATERIALIZED VIEW mv_customer_summary AS
SELECT
    dc.customer_id,
    dc.customer_name,
    dc.customer_segment,
    COUNT(DISTINCT fs.sales_id) as purchase_count,
    SUM(fs.total_amount) as lifetime_value,
    AVG(fs.total_amount) as avg_purchase_value,
    MAX(dd.full_date) as last_purchase_date,
    DATEDIFF(DAY, MAX(dd.full_date), CURRENT_DATE) as days_since_purchase
FROM dim_customer dc
LEFT JOIN fact_sales fs ON dc.customer_id = fs.customer_id
LEFT JOIN dim_date dd ON fs.date_id = dd.date_id
WHERE dc.is_active = TRUE
GROUP BY dc.customer_id, dc.customer_name, dc.customer_segment;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_summary;

-- Create index on materialized view
CREATE INDEX idx_mv_customer_ltv ON mv_customer_summary(lifetime_value DESC);
```

## Data Analysis Queries

### 1. Sales Analysis
```sql
-- Sales trend analysis
SELECT
    dd.year,
    dd.month,
    dd.day_of_week,
    SUM(fs.total_amount) as daily_revenue,
    COUNT(DISTINCT fs.customer_id) as unique_customers,
    COUNT(DISTINCT fs.product_id) as products_sold,
    AVG(fs.total_amount) as avg_transaction,
    MIN(fs.total_amount) as min_transaction,
    MAX(fs.total_amount) as max_transaction
FROM fact_sales fs
JOIN dim_date dd ON fs.date_id = dd.date_id
GROUP BY dd.year, dd.month, dd.day_of_week
ORDER BY dd.year DESC, dd.month DESC;
```

### 2. Customer Segmentation
```sql
-- RFM (Recency, Frequency, Monetary) Analysis
WITH rfm_calc AS (
    SELECT
        dc.customer_id,
        dc.customer_name,
        MAX(dd.full_date) as last_purchase,
        DATEDIFF(DAY, MAX(dd.full_date), CURRENT_DATE) as recency_days,
        COUNT(DISTINCT fs.sales_id) as frequency,
        SUM(fs.total_amount) as monetary
    FROM dim_customer dc
    LEFT JOIN fact_sales fs ON dc.customer_id = fs.customer_id
    LEFT JOIN dim_date dd ON fs.date_id = dd.date_id
    WHERE dc.is_active = TRUE
    GROUP BY dc.customer_id, dc.customer_name
),
rfm_ranking AS (
    SELECT
        customer_id,
        customer_name,
        recency_days,
        frequency,
        monetary,
        NTILE(4) OVER (ORDER BY recency_days DESC) as r_score,
        NTILE(4) OVER (ORDER BY frequency) as f_score,
        NTILE(4) OVER (ORDER BY monetary) as m_score
    FROM rfm_calc
)
SELECT
    customer_id,
    customer_name,
    CONCAT(r_score, f_score, m_score) as rfm_segment,
    CASE
        WHEN r_score = 4 AND f_score = 4 AND m_score = 4 THEN 'Champions'
        WHEN r_score >= 3 AND f_score >= 3 AND m_score >= 3 THEN 'Loyal Customers'
        WHEN r_score >= 3 AND f_score <= 2 THEN 'At Risk'
        WHEN r_score <= 2 THEN 'Lost'
        ELSE 'Potential'
    END as customer_segment
FROM rfm_ranking
ORDER BY r_score DESC, f_score DESC, m_score DESC;
```

### 3. Product Performance
```sql
-- Product analysis with market basket
SELECT
    dp.product_id,
    dp.product_name,
    dp.category,
    COUNT(DISTINCT fs.sales_id) as sales_count,
    SUM(fs.quantity) as total_quantity_sold,
    SUM(fs.total_amount) as total_revenue,
    AVG(fs.total_amount) as avg_sale_value,
    SUM(fs.discount_percent) / COUNT(*) as avg_discount_pct,
    RANK() OVER (PARTITION BY dp.category ORDER BY SUM(fs.total_amount) DESC) as category_rank
FROM fact_sales fs
JOIN dim_product dp ON fs.product_id = dp.product_id
WHERE YEAR(CAST(fs.sales_date AS DATE)) = 2023
GROUP BY dp.product_id, dp.product_name, dp.category
HAVING COUNT(DISTINCT fs.sales_id) >= 10
ORDER BY category_rank;
```

## ETL Operations

### 1. Data Loading
```sql
-- Incremental data load
INSERT INTO fact_sales (customer_id, product_id, date_id, quantity, unit_price, total_amount)
SELECT
    c.customer_id,
    p.product_id,
    d.date_id,
    s.quantity,
    s.price,
    s.quantity * s.price
FROM staging.sales s
LEFT JOIN dim_customer c ON s.customer_name = c.customer_name
LEFT JOIN dim_product p ON s.product_sku = p.product_sku
LEFT JOIN dim_date d ON DATE(s.sale_datetime) = d.full_date
WHERE NOT EXISTS (
    SELECT 1 FROM fact_sales fs
    WHERE fs.customer_id = c.customer_id
    AND fs.product_id = p.product_id
    AND fs.date_id = d.date_id
    AND fs.quantity = s.quantity
);
```

## Deliverables

1. Dimensional data model
2. Fact and dimension tables
3. Advanced CTE queries
4. Window function implementations
5. Materialized views
6. Performance-optimized queries
7. Cohort analysis
8. Customer segmentation
9. Product analytics
10. ETL procedures
11. Index strategy
12. Query optimization guidelines

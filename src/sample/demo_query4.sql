/*
 ============================================================================
 ENTEPRISE E-COMMERCE ANALYTICS MASTER SCRIPT
 RDBMS: MySQL 8.0+
 DOMAINS COVERED:
 1. Recursive Date Dimension Generation
 2. Dynamic Currency Conversion
 3. Product Catalog & COGS Hierarchy
 4. RFM (Recency, Frequency, Monetary) Customer Segmentation
 5. User Cohort Retention Analysis
 6. Inventory Moving Averages & Stockout Prediction
 7. Fraud Detection Heuristics (Velocity & Geo-mismatch)
 8. Logistics SLA Breaches
 9. Marketing ROI & Discount Cannibalization
 ============================================================================
*/

WITH RECURSIVE

-- -----------------------------------------------------------------------------
-- 1. DATE DIMENSION: Generate last 365 days dynamically
-- -----------------------------------------------------------------------------
date_dim AS (
    SELECT 
        CURRENT_DATE - INTERVAL 365 DAY AS report_date
    UNION ALL
    SELECT 
        report_date + INTERVAL 1 DAY
    FROM 
        date_dim
    WHERE 
        report_date + INTERVAL 1 DAY <= CURRENT_DATE
),

-- -----------------------------------------------------------------------------
-- 2. CURRENCY CONVERSION: Latest exchange rates for global retail
-- -----------------------------------------------------------------------------
fx_rates AS (
    SELECT 
        base_currency,
        target_currency,
        exchange_rate,
        effective_date,
        LEAD(effective_date) OVER (
            PARTITION BY base_currency, target_currency 
            ORDER BY effective_date ASC
        ) AS next_effective_date
    FROM 
        exchange_rates
),

-- -----------------------------------------------------------------------------
-- 3. PRODUCT HIERARCHY & COGS (Cost of Goods Sold)
-- -----------------------------------------------------------------------------
product_hierarchy AS (
    SELECT 
        p.product_id,
        p.sku,
        p.name AS product_name,
        p.category_id,
        c.name AS category_name,
        c.parent_category_id,
        pc.name AS parent_category_name,
        p.base_price,
        p.supplier_id,
        s.name AS supplier_name,
        COALESCE(
            (SELECT cost 
             FROM product_costs pc 
             WHERE pc.product_id = p.product_id 
             ORDER BY effective_date DESC LIMIT 1), 
            p.base_price * 0.4
        ) AS current_cogs
    FROM 
        products p
    INNER JOIN 
        categories c 
        ON p.category_id = c.category_id
    LEFT JOIN 
        categories pc 
        ON c.parent_category_id = pc.category_id
    LEFT JOIN 
        suppliers s 
        ON p.supplier_id = s.supplier_id
    WHERE 
        p.is_active = 1
),

-- -----------------------------------------------------------------------------
-- 4. CLEANED ORDER FACT TABLE
-- -----------------------------------------------------------------------------
order_fact AS (
    SELECT 
        o.order_id,
        o.customer_id,
        o.created_at,
        DATE(o.created_at) AS order_date,
        o.status,
        o.currency_code,
        o.shipping_address_id,
        o.billing_address_id,
        o.payment_method_id,
        o.marketing_channel_id,
        o.applied_coupon_code,
        -- Calculate total before discounts directly from lines
        SUM(ol.quantity * ol.unit_price) AS raw_subtotal,
        -- Apportion discounts proportionally across lines
        SUM(ol.quantity * ol.unit_price) - o.discount_amount AS net_revenue,
        -- Convert to USD for master reporting
        (SUM(ol.quantity * ol.unit_price) - o.discount_amount) * COALESCE(fx.exchange_rate, 1) AS net_revenue_usd,
        SUM(ol.quantity * ph.current_cogs) * COALESCE(fx.exchange_rate, 1) AS total_cogs_usd,
        o.shipping_cost * COALESCE(fx.exchange_rate, 1) AS shipping_cost_usd
    FROM 
        orders o
    INNER JOIN 
        order_lines ol 
        ON o.order_id = ol.order_id
    INNER JOIN 
        product_hierarchy ph 
        ON ol.product_id = ph.product_id
    LEFT JOIN 
        fx_rates fx 
        ON o.currency_code = fx.base_currency 
        AND fx.target_currency = 'USD'
        AND DATE(o.created_at) >= fx.effective_date
        AND (DATE(o.created_at) < fx.next_effective_date OR fx.next_effective_date IS NULL)
    WHERE 
        o.status NOT IN ('CANCELLED', 'FAILED', 'REJECTED')
        AND o.created_at >= CURRENT_DATE - INTERVAL 365 DAY
    GROUP BY 
        o.order_id,
        o.customer_id,
        o.created_at,
        o.status,
        o.currency_code,
        o.shipping_address_id,
        o.billing_address_id,
        o.payment_method_id,
        o.marketing_channel_id,
        o.applied_coupon_code,
        o.discount_amount,
        o.shipping_cost,
        fx.exchange_rate
),

-- -----------------------------------------------------------------------------
-- 5. RFM METRICS (Recency, Frequency, Monetary)
-- -----------------------------------------------------------------------------
rfm_base AS (
    SELECT 
        customer_id,
        MAX(order_date) AS last_purchase_date,
        DATEDIFF(CURRENT_DATE, MAX(order_date)) AS recency_days,
        COUNT(DISTINCT order_id) AS frequency_count,
        SUM(net_revenue_usd) AS monetary_value,
        AVG(net_revenue_usd) AS aov_usd
    FROM 
        order_fact
    GROUP BY 
        customer_id
),

rfm_scoring AS (
    SELECT 
        customer_id,
        recency_days,
        frequency_count,
        monetary_value,
        NTILE(5) OVER (ORDER BY recency_days DESC) AS r_score,
        NTILE(5) OVER (ORDER BY frequency_count ASC) AS f_score,
        NTILE(5) OVER (ORDER BY monetary_value ASC) AS m_score
    FROM 
        rfm_base
),

rfm_segmentation AS (
    SELECT 
        customer_id,
        r_score,
        f_score,
        m_score,
        CAST(r_score AS CHAR) || CAST(f_score AS CHAR) || CAST(m_score AS CHAR) AS rfm_cell,
        CASE 
            WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'Champions'
            WHEN r_score >= 3 AND f_score >= 3 AND m_score >= 3 THEN 'Loyal Customers'
            WHEN r_score >= 4 AND f_score <= 2 THEN 'Recent Users'
            WHEN r_score <= 2 AND f_score >= 4 THEN 'At Risk / Churning'
            WHEN r_score <= 2 AND f_score <= 2 THEN 'Lost Customers'
            ELSE 'Average Users'
        END AS rfm_segment
    FROM 
        rfm_scoring
),

-- -----------------------------------------------------------------------------
-- 6. COHORT RETENTION ANALYSIS
-- -----------------------------------------------------------------------------
user_first_purchase AS (
    SELECT 
        customer_id,
        DATE_FORMAT(MIN(order_date), '%Y-%m-01') AS cohort_month
    FROM 
        order_fact
    GROUP BY 
        customer_id
),

cohort_activity AS (
    SELECT 
        ufp.cohort_month,
        DATE_FORMAT(ofc.order_date, '%Y-%m-01') AS activity_month,
        COUNT(DISTINCT ofc.customer_id) AS active_users,
        SUM(ofc.net_revenue_usd) AS cohort_revenue
    FROM 
        user_first_purchase ufp
    INNER JOIN 
        order_fact ofc 
        ON ufp.customer_id = ofc.customer_id
    GROUP BY 
        ufp.cohort_month,
        DATE_FORMAT(ofc.order_date, '%Y-%m-01')
),

cohort_retention_matrix AS (
    SELECT 
        cohort_month,
        activity_month,
        PERIOD_DIFF(
            DATE_FORMAT(STR_TO_DATE(activity_month, '%Y-%m-%d'), '%Y%m'),
            DATE_FORMAT(STR_TO_DATE(cohort_month, '%Y-%m-%d'), '%Y%m')
        ) AS month_index,
        active_users,
        FIRST_VALUE(active_users) OVER (
            PARTITION BY cohort_month 
            ORDER BY activity_month ASC
        ) AS initial_users,
        ROUND((active_users / FIRST_VALUE(active_users) OVER (
            PARTITION BY cohort_month 
            ORDER BY activity_month ASC
        )) * 100, 2) AS retention_rate_pct
    FROM 
        cohort_activity
),

-- -----------------------------------------------------------------------------
-- 7. INVENTORY FORECASTING & STOCKOUT PREDICTION
-- -----------------------------------------------------------------------------
daily_product_sales AS (
    SELECT 
        ol.product_id,
        DATE(o.created_at) AS sales_date,
        SUM(ol.quantity) AS daily_qty_sold
    FROM 
        orders o
    INNER JOIN 
        order_lines ol 
        ON o.order_id = ol.order_id
    WHERE 
        o.created_at >= CURRENT_DATE - INTERVAL 30 DAY
    GROUP BY 
        ol.product_id,
        DATE(o.created_at)
),

product_moving_averages AS (
    SELECT 
        dd.report_date,
        ph.product_id,
        COALESCE(dps.daily_qty_sold, 0) AS qty_sold,
        AVG(COALESCE(dps.daily_qty_sold, 0)) OVER (
            PARTITION BY ph.product_id 
            ORDER BY dd.report_date 
            ROWS BETWEEN 7 PRECEDING AND CURRENT ROW
        ) AS moving_avg_7d,
        AVG(COALESCE(dps.daily_qty_sold, 0)) OVER (
            PARTITION BY ph.product_id 
            ORDER BY dd.report_date 
            ROWS BETWEEN 30 PRECEDING AND CURRENT ROW
        ) AS moving_avg_30d
    FROM 
        date_dim dd
    CROSS JOIN 
        product_hierarchy ph
    LEFT JOIN 
        daily_product_sales dps 
        ON dd.report_date = dps.sales_date 
        AND ph.product_id = dps.product_id
),

inventory_status AS (
    SELECT 
        i.product_id,
        SUM(i.quantity_on_hand) AS total_stock,
        SUM(i.quantity_allocated) AS reserved_stock,
        (SUM(i.quantity_on_hand) - SUM(i.quantity_allocated)) AS available_stock
    FROM 
        inventory i
    GROUP BY 
        i.product_id
),

stockout_prediction AS (
    SELECT 
        pma.product_id,
        i.available_stock,
        pma.moving_avg_30d,
        CASE 
            WHEN pma.moving_avg_30d > 0 THEN ROUND(i.available_stock / pma.moving_avg_30d, 0)
            ELSE 9999 
        END AS days_of_inventory_left
    FROM 
        (SELECT product_id, moving_avg_30d FROM product_moving_averages WHERE report_date = CURRENT_DATE - INTERVAL 1 DAY) pma
    INNER JOIN 
        inventory_status i 
        ON pma.product_id = i.product_id
),

-- -----------------------------------------------------------------------------
-- 8. FRAUD DETECTION HEURISTICS
-- -----------------------------------------------------------------------------
fraud_flags AS (
    SELECT 
        o.order_id,
        o.customer_id,
        o.net_revenue_usd,
        CASE 
            WHEN COUNT(o.order_id) OVER (
                PARTITION BY o.customer_id 
                ORDER BY UNIX_TIMESTAMP(o.created_at) 
                RANGE BETWEEN 3600 PRECEDING AND CURRENT ROW
            ) >= 5 THEN 1 
            ELSE 0 
        END AS high_velocity_flag,
        CASE 
            WHEN sa.country_code != ba.country_code THEN 1 
            ELSE 0 
        END AS geo_mismatch_flag,
        CASE 
            WHEN JSON_UNQUOTE(JSON_EXTRACT(o.risk_data, '$.cvv_match')) = 'N' THEN 1
            ELSE 0
        END AS cvv_failure_flag
    FROM 
        order_fact o
    INNER JOIN 
        addresses sa ON o.shipping_address_id = sa.address_id
    INNER JOIN 
        addresses ba ON o.billing_address_id = ba.address_id
),

order_risk_score AS (
    SELECT 
        order_id,
        customer_id,
        (high_velocity_flag * 40) + (geo_mismatch_flag * 30) + (cvv_failure_flag * 30) AS total_risk_score
    FROM 
        fraud_flags
),

-- -----------------------------------------------------------------------------
-- 9. LOGISTICS SLA & PERFORMANCE
-- -----------------------------------------------------------------------------
logistics_sla AS (
    SELECT 
        s.order_id,
        s.carrier_id,
        c.carrier_name,
        s.shipped_at,
        s.delivered_at,
        DATEDIFF(s.delivered_at, s.shipped_at) AS transit_days,
        c.sla_days,
        CASE 
            WHEN DATEDIFF(s.delivered_at, s.shipped_at) > c.sla_days THEN 1 
            ELSE 0 
        END AS is_sla_breach
    FROM 
        shipments s
    INNER JOIN 
        carriers c 
        ON s.carrier_id = c.carrier_id
    WHERE 
        s.delivered_at IS NOT NULL
),

-- -----------------------------------------------------------------------------
-- 10. MASTER AGGREGATION (Combining all models)
-- -----------------------------------------------------------------------------
master_aggregation AS (
    SELECT 
        -- Dimensions
        dd.report_date,
        ph.category_name,
        ph.supplier_name,
        rs.rfm_segment,
        mc.channel_name AS marketing_channel,
        
        -- Financials
        COUNT(DISTINCT ofc.order_id) AS total_orders,
        COUNT(DISTINCT CASE WHEN ors.total_risk_score >= 70 THEN ofc.order_id END) AS fraudulent_orders,
        SUM(ofc.net_revenue_usd) AS gross_revenue_usd,
        SUM(ofc.total_cogs_usd) AS total_cogs_usd,
        SUM(ofc.net_revenue_usd) - SUM(ofc.total_cogs_usd) - SUM(ofc.shipping_cost_usd) AS gross_profit_margin_usd,
        
        -- Logistics
        AVG(ls.transit_days) AS avg_transit_time_days,
        SUM(ls.is_sla_breach) / NULLIF(COUNT(ls.order_id), 0) AS carrier_sla_breach_rate,
        
        -- Inventory Risk
        SUM(CASE WHEN sp.days_of_inventory_left < 7 THEN 1 ELSE 0 END) AS skus_at_stockout_risk
        
    FROM 
        date_dim dd
    INNER JOIN 
        order_fact ofc 
        ON dd.report_date = ofc.order_date
    INNER JOIN 
        order_lines ol 
        ON ofc.order_id = ol.order_id
    INNER JOIN 
        product_hierarchy ph 
        ON ol.product_id = ph.product_id
    LEFT JOIN 
        rfm_segmentation rs 
        ON ofc.customer_id = rs.customer_id
    LEFT JOIN 
        marketing_channels mc 
        ON ofc.marketing_channel_id = mc.channel_id
    LEFT JOIN 
        order_risk_score ors 
        ON ofc.order_id = ors.order_id
    LEFT JOIN 
        logistics_sla ls 
        ON ofc.order_id = ls.order_id
    LEFT JOIN 
        stockout_prediction sp 
        ON ph.product_id = sp.product_id
    GROUP BY 
        dd.report_date,
        ph.category_name,
        ph.supplier_name,
        rs.rfm_segment,
        mc.channel_name
)

-- -----------------------------------------------------------------------------
-- FINAL OUTPUT
-- -----------------------------------------------------------------------------
SELECT 
    report_date,
    category_name,
    supplier_name,
    rfm_segment,
    marketing_channel,
    total_orders,
    fraudulent_orders,
    ROUND(gross_revenue_usd, 2) AS gross_revenue,
    ROUND(total_cogs_usd, 2) AS total_cogs,
    ROUND(gross_profit_margin_usd, 2) AS gross_profit,
    ROUND((gross_profit_margin_usd / NULLIF(gross_revenue_usd, 0)) * 100, 2) AS profit_margin_pct,
    ROUND(avg_transit_time_days, 1) AS avg_transit_days,
    ROUND(carrier_sla_breach_rate * 100, 2) AS sla_breach_pct,
    skus_at_stockout_risk
FROM 
    master_aggregation
ORDER BY 
    report_date DESC, 
    gross_revenue DESC;
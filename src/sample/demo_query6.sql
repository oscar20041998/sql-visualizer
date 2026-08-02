/*
 ============================================================================
 LOGISTICS DIGITAL TWIN & INVENTORY ZERO-FILL MATRIX
 RDBMS: MySQL 8.0+
 
 DEMONSTRATING ADVANCED JOINS:
 1. CROSS JOIN: Creating a Cartesian product for sparse data zero-filling.
 2. SELF JOIN: Resolving Employee/Manager hierarchies for warehouse directors.
 3. RIGHT JOIN: Detecting "Phantom Invoices" (Invoices without matching shipments).
 4. INNER JOIN: Deep relational mapping of inventory ledgers.
 5. LEFT JOIN: Mapping factual data back to the dense Cartesian grid.
 ============================================================================
*/

WITH RECURSIVE

-- ============================================================================
-- 1. RECURSIVE CTE: Generate the last 30 days calendar
-- ============================================================================
calendar_days AS (
    SELECT CURRENT_DATE - INTERVAL 30 DAY AS report_date
    UNION ALL
    SELECT report_date + INTERVAL 1 DAY 
    FROM calendar_days 
    WHERE report_date + INTERVAL 1 DAY <= CURRENT_DATE
),

-- ============================================================================
-- 2. SELF JOIN: Resolve Warehouse Manager Hierarchy
-- ============================================================================
employee_hierarchy AS (
    SELECT 
        emp.employee_id,
        emp.first_name || ' ' || emp.last_name AS employee_name,
        emp.role AS employee_role,
        emp.facility_id,
        mgr.employee_id AS manager_id,
        COALESCE(mgr.first_name || ' ' || mgr.last_name, 'NO MANAGER') AS manager_name,
        COALESCE(mgr.role, 'BOARD_MEMBER') AS manager_role
    FROM dim_employees emp
    -- [SELF JOIN] to find the employee's direct supervisor
    LEFT JOIN dim_employees mgr ON emp.manager_id = mgr.employee_id
    WHERE emp.department = 'WAREHOUSE_OPS'
),

active_facilities AS (
    SELECT 
        f.facility_id,
        f.facility_code,
        f.region,
        eh.employee_name AS facility_director
    FROM dim_facilities f
    -- [INNER JOIN] connecting to the resolved hierarchy
    INNER JOIN employee_hierarchy eh 
        ON f.facility_id = eh.facility_id 
        AND eh.employee_role = 'FACILITY_DIRECTOR'
    WHERE f.is_active = 1
),

strategic_skus AS (
    SELECT sku_id, sku_code, category, unit_cost 
    FROM dim_products 
    WHERE classification_tier IN ('TIER_1_FAST_MOVING', 'TIER_2_CORE')
),

-- ============================================================================
-- 3. CROSS JOIN: The Cartesian Product (The Dense Grid)
--    Creates a row for EVERY Day, EVERY Facility, and EVERY SKU
-- ============================================================================
dense_grid_baseline AS (
    SELECT 
        cd.report_date,
        af.facility_id,
        af.facility_code,
        af.region,
        af.facility_director,
        sk.sku_id,
        sk.sku_code,
        sk.category,
        sk.unit_cost
    FROM calendar_days cd
    -- [CROSS JOIN] forces every combination, generating millions of rows 
    -- to ensure we can track days with ZERO activity.
    CROSS JOIN active_facilities af
    CROSS JOIN strategic_skus sk
),

-- ============================================================================
-- 4. INNER JOIN FEST: Materializing the Inventory Ledger
-- ============================================================================
inventory_ledger AS (
    SELECT 
        DATE(il.transaction_timestamp) AS txn_date,
        il.facility_id,
        il.sku_id,
        -- Summarize inflows and outflows
        SUM(CASE WHEN tt.direction = 'INBOUND' THEN il.quantity ELSE 0 END) AS units_received,
        SUM(CASE WHEN tt.direction = 'OUTBOUND' THEN il.quantity ELSE 0 END) AS units_shipped,
        SUM(CASE WHEN tt.direction = 'ADJUSTMENT_LOSS' THEN il.quantity ELSE 0 END) AS units_lost,
        -- Calculate financial impact of shrinkage
        SUM(CASE WHEN tt.direction = 'ADJUSTMENT_LOSS' THEN il.quantity * il.recorded_unit_cost ELSE 0 END) AS shrinkage_cost_usd
    FROM fct_inventory_transactions il
    -- Multiple [INNER JOINs] to validate master data integrity
    INNER JOIN dim_transaction_types tt ON il.transaction_type_id = tt.type_id
    INNER JOIN dim_products p ON il.sku_id = p.sku_id
    INNER JOIN dim_facilities f ON il.facility_id = f.facility_id
    WHERE il.transaction_timestamp >= CURRENT_DATE - INTERVAL 30 DAY
    GROUP BY 
        DATE(il.transaction_timestamp),
        il.facility_id,
        il.sku_id
),

-- ============================================================================
-- 5. RIGHT JOIN: Detecting Anomaly/Phantom Carrier Invoices
-- ============================================================================
-- Sometimes carriers bill us for shipments that don't exist in our system.
-- We use a RIGHT JOIN to find invoices that have NO matching shipment.
phantom_invoices AS (
    SELECT 
        ci.invoice_id,
        ci.carrier_id,
        ci.billed_amount_usd,
        ci.invoice_date,
        ci.reference_tracking_number
    FROM fct_shipments fs
    -- [RIGHT JOIN] returns ALL carrier invoices, even if `fs` has no match.
    RIGHT JOIN ext_carrier_invoices ci 
        ON fs.tracking_number = ci.reference_tracking_number
    -- The WHERE NULL condition filters out the valid ones, leaving only anomalies.
    WHERE fs.shipment_id IS NULL
      AND ci.invoice_date >= CURRENT_DATE - INTERVAL 30 DAY
),
phantom_invoice_rollup AS (
    SELECT 
        invoice_date,
        SUM(billed_amount_usd) AS total_phantom_billing_usd,
        COUNT(invoice_id) AS phantom_invoice_count
    FROM phantom_invoices
    GROUP BY invoice_date
),

-- ============================================================================
-- 6. LEFT JOIN: Mapping Facts to the Cartesian Grid (The Zero-Fill)
-- ============================================================================
zero_filled_daily_matrix AS (
    SELECT 
        grid.report_date,
        grid.region,
        grid.facility_code,
        grid.facility_director,
        grid.sku_code,
        grid.category,
        
        -- Using COALESCE to turn NULLs (days with no transactions) into 0s
        COALESCE(inv.units_received, 0) AS units_received,
        COALESCE(inv.units_shipped, 0) AS units_shipped,
        COALESCE(inv.units_lost, 0) AS units_lost,
        COALESCE(inv.shrinkage_cost_usd, 0) AS shrinkage_cost_usd,
        
        -- Business Logic: Flagging "Dead Stock Days"
        CASE 
            WHEN COALESCE(inv.units_shipped, 0) = 0 THEN 1 
            ELSE 0 
        END AS is_zero_sales_day

    FROM dense_grid_baseline grid
    -- [LEFT JOIN] to attach the real data to the synthetic grid
    LEFT JOIN inventory_ledger inv 
        ON grid.report_date = inv.txn_date
        AND grid.facility_id = inv.facility_id
        AND grid.sku_id = inv.sku_id
)

-- ============================================================================
-- 7. THE FINAL MASTER AGGREGATION
-- ============================================================================
SELECT 
    zfm.report_date,
    zfm.region,
    zfm.facility_code,
    zfm.facility_director,
    zfm.category,
    
    -- Transaction Metrics
    SUM(zfm.units_received) AS total_inbound_units,
    SUM(zfm.units_shipped) AS total_outbound_units,
    SUM(zfm.units_lost) AS total_shrinkage_units,
    SUM(zfm.shrinkage_cost_usd) AS total_shrinkage_usd,
    
    -- Stockout / Dead Stock Analytics enabled by the CROSS JOIN
    SUM(zfm.is_zero_sales_day) AS sku_days_with_zero_movement,
    
    -- Attaching the RIGHT JOIN anomalies
    COALESCE(pir.total_phantom_billing_usd, 0) AS unverified_carrier_billing_usd,
    COALESCE(pir.phantom_invoice_count, 0) AS unverified_invoice_count

FROM zero_filled_daily_matrix zfm
-- [LEFT JOIN] attaching the phantom invoices by date
LEFT JOIN phantom_invoice_rollup pir 
    ON zfm.report_date = pir.invoice_date

GROUP BY 
    zfm.report_date,
    zfm.region,
    zfm.facility_code,
    zfm.facility_director,
    zfm.category,
    pir.total_phantom_billing_usd,
    pir.phantom_invoice_count

ORDER BY 
    zfm.report_date DESC, 
    zfm.region ASC, 
    zfm.facility_code ASC, 
    total_shrinkage_usd DESC;
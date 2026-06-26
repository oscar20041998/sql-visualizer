WITH -- CTE 1: Doanh thu thô từ các giao dịch trực tiếp và tính toán thuế suất lồng nhau (7 Subqueries)
cte_raw_sales AS (
    SELECT s.transaction_id,
        s.customer_id,
        s.store_id,
        s.product_id,
        s.quantity,
        s.sale_price,
        -- Lồng chuỗi subquery để tính toán vùng thuế suất
        (
            SELECT (
                    SELECT (
                            SELECT (
                                    SELECT SUM(tax_rate)
                                    FROM tax_regions
                                    WHERE region_id = st.region_id
                                )
                            FROM stores st
                            WHERE st.store_id = s.store_id
                        )
                    FROM dual
                )
            FROM dual
        ) as calculated_tax
    FROM sales_transactions s
    WHERE s.sale_date >= (
            SELECT MIN(start_date)
            FROM (
                    SELECT start_date
                    FROM (
                            SELECT start_date
                            FROM fiscal_calendar
                            WHERE year_id = 2026
                        )
                )
        )
),
-- CTE 2: Phân khúc khách hàng dựa trên chỉ số RFM lồng nhau (5 Subqueries + Trường hợp SELECT * FROM thứ 1)
cte_customer_segments AS (
    SELECT c.customer_id,
        (
            SELECT AVG(quantity * sale_price)
            FROM cte_raw_sales
            WHERE customer_id = c.customer_id
        ) as avg_spend,
        CASE
            WHEN (
                SELECT COUNT(*)
                FROM (
                        SELECT transaction_id
                        FROM cte_raw_sales
                        WHERE customer_id = c.customer_id
                    )
            ) > (
                SELECT AVG(cnt)
                FROM (
                        SELECT COUNT(*) as cnt
                        FROM cte_raw_sales
                        GROUP BY customer_id
                    )
            ) THEN 'VIP_MEMBER'
            ELSE 'REGULAR_MEMBER'
        END as member_tier -- Sử dụng SELECT * FROM trường hợp 1
    FROM (
            SELECT *
            FROM online_customers
            WHERE is_active = 1
        ) c
),
-- CTE 3: Kiểm tra trạng thái tồn kho thực tế và biên an toàn kho (7 Subqueries)
cte_inventory_status AS (
    SELECT i.product_id,
        i.store_id,
        i.stock_on_hand,
        (
            SELECT (
                    SELECT (
                            SELECT (
                                    SELECT AVG(safety_stock)
                                    FROM inventory_policies
                                    WHERE policy_id = p.policy_id
                                )
                            FROM products p
                            WHERE p.product_id = i.product_id
                        )
                    FROM dual
                )
            FROM dual
        ) as min_required_stock
    FROM retail_inventory i
    WHERE i.last_audit_date > (
            SELECT MAX(audit_date)
            FROM (
                    SELECT audit_date
                    FROM (
                            SELECT audit_date
                            FROM inventory_logs
                            WHERE status = 'CLOSED'
                        )
                )
        )
),
-- CTE 4: Đánh giá hiệu suất của các chương trình Marketing thúc đẩy doanh số (8 Subqueries)
cte_promo_impact AS (
    SELECT p.promo_id,
        p.promo_name,
        (
            SELECT SUM(sale_price)
            FROM cte_raw_sales
            WHERE product_id IN (
                    SELECT product_id
                    FROM promo_items
                    WHERE promo_id = p.promo_id
                )
        ) as total_promo_rev,
        (
            SELECT MAX(discount_value)
            FROM (
                    SELECT discount_value
                    FROM (
                            SELECT discount_value
                            FROM promo_tiers
                            WHERE promo_id = p.promo_id
                        )
                )
        ) as max_tier_discount
    FROM marketing_promotions p
    WHERE p.end_date > (
            SELECT sysdate
            FROM (
                    SELECT sysdate
                    FROM (
                            SELECT sysdate
                            FROM dual
                        )
                )
        )
),
-- CTE 5: Doanh thu mục tiêu và hiệu năng vận hành của từng cửa hàng (7 Subqueries)
cte_store_performance AS (
    SELECT st.store_id,
        st.store_name,
        (
            SELECT SUM(sale_price * quantity)
            FROM cte_raw_sales
            WHERE store_id = st.store_id
        ) as total_sales_amount,
        (
            SELECT AVG(daily_target)
            FROM (
                    SELECT daily_target
                    FROM (
                            SELECT daily_target
                            FROM store_targets
                            WHERE store_id = st.store_id
                        )
                )
        ) as calculated_target_score
    FROM retail_stores st
    WHERE st.status = (
            SELECT status_code
            FROM (
                    SELECT status_code
                    FROM (
                            SELECT status_code
                            FROM store_statuses
                            WHERE code_name = 'ACTIVE'
                        )
                )
        )
),
-- CTE 6: Biên lợi nhuận ròng của danh mục sản phẩm (3 Subqueries + Trường hợp SELECT * FROM thứ 2)
cte_product_margins AS (
    SELECT pc.product_id,
        pc.product_name,
        (
            SELECT cost_price
            FROM (
                    SELECT cost_price
                    FROM (
                            SELECT cost_price
                            FROM supplier_costs
                            WHERE product_id = pc.product_id
                            ORDER BY effective_date DESC
                        )
                    WHERE ROWNUM = 1
                )
        ) as unit_cost -- Sử dụng SELECT * FROM trường hợp 2
    FROM (
            SELECT *
            FROM product_catalog
            WHERE category_id IS NOT NULL
        ) pc
),
-- CTE 7: Dự báo Giá trị vòng đời khách hàng CLV (5 Subqueries)
cte_customer_clv AS (
    SELECT cs.customer_id,
        cs.member_tier,
        (
            SELECT SUM(sale_price)
            FROM cte_raw_sales
            WHERE customer_id = cs.customer_id
        ) * (
            SELECT (
                    SELECT (
                            SELECT (
                                    SELECT retention_rate
                                    FROM loyalty_rules
                                    WHERE tier = cs.member_tier
                                )
                            FROM dual
                        )
                    FROM dual
                )
            FROM dual
        ) as predicted_clv_value
    FROM cte_customer_segments cs
),
-- CTE 8: Phân tích hành vi gian lận hoặc bất thường khi đổi trả hàng (7 Subqueries)
cte_returns_anomaly AS (
    SELECT r.customer_id,
        r.product_id,
        (
            SELECT COUNT(*)
            FROM product_returns
            WHERE customer_id = r.customer_id
        ) as total_returned_items,
        (
            SELECT AVG(return_rate)
            FROM (
                    SELECT return_rate
                    FROM (
                            SELECT return_rate
                            FROM regional_benchmarks
                            WHERE region_type = 'RETAIL_ZONE'
                        )
                )
        ) as zone_benchmark
    FROM product_returns r
    WHERE r.return_date > (
            SELECT MIN(cutoff_date)
            FROM (
                    SELECT cutoff_date
                    FROM (
                            SELECT cutoff_date
                            FROM system_parameters
                            WHERE param_name = 'ANOMALY_THRESHOLD_START'
                        )
                )
        )
),
-- CTE 9: Dự báo rủi ro đứt gãy chuỗi cung ứng - Cháy hàng (4 Subqueries)
cte_predictive_stockout AS (
    SELECT inv.product_id,
        inv.store_id,
        (
            SELECT AVG(quantity)
            FROM cte_raw_sales
            WHERE product_id = inv.product_id
                AND store_id = inv.store_id
        ) as sale_velocity,
        (
            SELECT (
                    SELECT (
                            SELECT (
                                    SELECT lead_time_days
                                    FROM supplier_schedules
                                    WHERE product_id = inv.product_id
                                )
                            FROM dual
                        )
                    FROM dual
                )
            FROM dual
        ) as delivery_lead_time
    FROM cte_inventory_status inv
),
-- CTE 10: Hợp nhất toàn bộ chỉ số kinh doanh bán lẻ cốt lõi (4 Subqueries)
cte_unified_retail_metrics AS (
    SELECT sp.store_id,
        sp.store_name,
        pm.product_id,
        pm.product_name,
        (
            SELECT SUM(quantity)
            FROM cte_raw_sales
            WHERE store_id = sp.store_id
                AND product_id = pm.product_id
        ) as aggregate_units_sold,
        (
            SELECT (
                    SELECT (
                            SELECT (
                                    SELECT risk_score
                                    FROM predictive_scores
                                    WHERE item_id = pm.product_id
                                )
                            FROM dual
                        )
                    FROM dual
                )
            FROM dual
        ) as supply_risk_index
    FROM cte_store_performance sp
        CROSS JOIN cte_product_margins pm
    WHERE pm.product_id IN (
            SELECT product_id
            FROM (
                    SELECT product_id
                    FROM (
                            SELECT product_id
                            FROM top_trending_products
                            WHERE evaluation_phase = 'FINAL'
                        )
                )
        )
) -- Mệnh đề SELECT chính kết hợp lợp bộ lọc sâu cuối cùng (3 Subqueries + Trường hợp SELECT * FROM thứ 3)
-- Sử dụng SELECT * FROM trường hợp 3 ở lớp bọc ngoài cùng kết quả phân tích công thức
SELECT *
FROM (
        SELECT main.store_name,
            main.product_name,
            main.aggregate_units_sold,
            main.supply_risk_index,
            (
                SELECT predicted_clv_value
                FROM (
                        SELECT predicted_clv_value
                        FROM cte_customer_clv
                        WHERE customer_id IN (
                                SELECT customer_id
                                FROM cte_raw_sales
                                WHERE store_id = main.store_id
                            )
                    )
                WHERE ROWNUM = 1
            ) as sample_customer_clv
        FROM cte_unified_retail_metrics main
        WHERE main.aggregate_units_sold > (
                SELECT AVG(aggregate_units_sold)
                FROM (
                        SELECT aggregate_units_sold
                        FROM (
                                SELECT aggregate_units_sold
                                FROM cte_unified_retail_metrics
                            )
                    )
            )
    ) final_analysis_payload;
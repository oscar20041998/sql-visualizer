-- =================================================================================================
-- ENTERPRISE RISK, LIQUIDITY, AND PORTFOLIO PERFORMANCE END-OF-DAY ENGINE
-- Target Dialect: PostgreSQL / Standard SQL Standard Compliance
-- Total Expected Lines: ~500 | CTEs: 6 | Complexity: SUPER HIGH (Level 5)
-- =================================================================================================
WITH RECURSIVE -- -------------------------------------------------------------------------------------------------
-- CTE 1: time_spine (Recursive CTE)
-- Tạo trục thời gian và các phân đoạn khung giờ giao dịch để làm Master Spine
-- -------------------------------------------------------------------------------------------------
time_spine AS (
    SELECT CURRENT_DATE - INTERVAL '14 days' AS anchor_date,
        EXTRACT(
            QUARTER
            FROM (CURRENT_DATE - INTERVAL '14 days')
        ) AS quarter_id,
        CASE
            WHEN EXTRACT(
                ISODOW
                FROM (CURRENT_DATE - INTERVAL '14 days')
            ) IN (6, 7) THEN 1
            ELSE 0
        END AS is_weekend
    UNION ALL
    SELECT (anchor_date + INTERVAL '1 day')::DATE,
        EXTRACT(
            QUARTER
            FROM (anchor_date + INTERVAL '1 day')
        ),
        CASE
            WHEN EXTRACT(
                ISODOW
                FROM (anchor_date + INTERVAL '1 day')
            ) IN (6, 7) THEN 1
            ELSE 0
        END
    FROM time_spine
    WHERE anchor_date < CURRENT_DATE
),
-- -------------------------------------------------------------------------------------------------
-- CTE 2: user_session_analytics
-- Phân tích hành vi session, chứa Window Function phức tạp và Nested Subquery ở WHERE
-- -------------------------------------------------------------------------------------------------
user_session_analytics AS (
    SELECT log.user_id,
        log.device_type,
        log.ip_address,
        COUNT(log.session_id) AS total_sessions,
        SUM(log.duration_seconds) AS total_duration_seconds,
        AVG(log.duration_seconds) AS avg_duration_seconds,
        MIN(log.login_time) AS first_login,
        MAX(log.login_time) AS last_login,
        -- Window Functions: Xác định phiên đăng nhập trước đó và kế tiếp
        LAG(log.login_time, 1) OVER (
            PARTITION BY log.user_id
            ORDER BY log.login_time
        ) AS previous_login_time,
        LEAD(log.login_time, 1) OVER (
            PARTITION BY log.user_id
            ORDER BY log.login_time
        ) AS next_login_time,
        FIRST_VALUE(log.ip_address) OVER (
            PARTITION BY log.user_id
            ORDER BY log.login_time DESC
        ) AS current_active_ip,
        -- Phân hạng người dùng dựa trên thời gian hoạt động bằng DENSE_RANK
        DENSE_RANK() OVER (
            PARTITION BY log.device_type
            ORDER BY SUM(log.duration_seconds) DESC
        ) AS rank_by_device_duration
    FROM user_activity_logs log
    WHERE log.status = 'SUCCESS'
        AND log.user_id IN (
            -- Nested Subquery Level 1
            SELECT DISTINCT u.id
            FROM users u
            WHERE u.is_internal = false
                AND u.created_at >= (
                    SELECT MIN(anchor_date)
                    FROM time_spine
                ) -- Nested Subquery Level 2
        )
    GROUP BY log.user_id,
        log.device_type,
        log.ip_address,
        log.login_time
),
-- -------------------------------------------------------------------------------------------------
-- CTE 3: core_trade_aggregates
-- Tính toán toán học khối lượng giao dịch, phí, chứa Subquery lồng nhau trong mệnh đề SELECT
-- -------------------------------------------------------------------------------------------------
core_trade_aggregates AS (
    SELECT t.account_id,
        t.instrument_id,
        DATE(t.executed_at) AS trade_date,
        COUNT(t.id) AS total_trades,
        SUM(
            CASE
                WHEN t.side = 'BUY' THEN t.quantity
                ELSE 0
            END
        ) AS buy_qty,
        SUM(
            CASE
                WHEN t.side = 'SELL' THEN t.quantity
                ELSE 0
            END
        ) AS sell_qty,
        SUM(t.quantity * t.price) AS volume_nominal,
        AVG(t.price) AS vwap_price,
        -- Subquery lồng nhau ngay trong câu SELECT để lấy cấu hình phí động
        (
            SELECT dynamic_fee_pct
            FROM fee_tiers
            WHERE tier_id = (
                    SELECT vip_tier
                    FROM user_profiles
                    WHERE account_id = t.account_id
                )
            LIMIT 1
        ) AS applied_fee_rate,
        SUM(t.fee_amount) AS total_fees_paid,
        -- Window Functions: Tính tổng lũy tiến (Running Total) khối lượng giao dịch
        SUM(SUM(t.quantity * t.price)) OVER (
            PARTITION BY t.account_id,
            t.instrument_id
            ORDER BY DATE(t.executed_at) ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumulative_volume_nominal,
        -- Tìm trade có volume lớn nhất trong ngày của tài khoản đó
        MAX(t.quantity * t.price) OVER (PARTITION BY t.account_id, DATE(t.executed_at)) AS max_single_trade_value
    FROM trade_executions t
    WHERE t.execution_status = 'CLEARED'
    GROUP BY t.account_id,
        t.instrument_id,
        DATE(t.executed_at)
),
-- -------------------------------------------------------------------------------------------------
-- CTE 4: market_liquidity_depth
-- Phân tích sổ lệnh (Orderbook Depth) và độ lệch giá (Slippage)
-- -------------------------------------------------------------------------------------------------
market_liquidity_depth AS (
    SELECT ob.instrument_id,
        ob.snapshot_time::DATE AS market_date,
        AVG(ob.bid_price_level_1) AS best_bid,
        AVG(ob.ask_price_level_1) AS best_ask,
        AVG(ob.ask_price_level_1 - ob.bid_price_level_1) AS absolute_spread,
        AVG(
            (ob.ask_price_level_1 - ob.bid_price_level_1) / ob.ask_price_level_1
        ) * 100 AS spread_percentage,
        SUM(ob.bid_quantity_depth_10) AS bid_depth_sum,
        SUM(ob.ask_quantity_depth_10) AS ask_depth_sum,
        -- Window Function: Tính độ biến động lệch chuẩn (Volatility) của giá đóng cửa trong chu kỳ 7 dòng trước
        STDDEV(ob.close_price_snapshot) OVER (
            PARTITION BY ob.instrument_id
            ORDER BY ob.snapshot_time ROWS BETWEEN 7 PRECEDING AND CURRENT ROW
        ) AS price_volatility_7d
    FROM order_book_snapshots ob
    WHERE ob.is_valid = true
    GROUP BY ob.instrument_id,
        ob.snapshot_time::DATE,
        ob.close_price_snapshot,
        ob.snapshot_time
),
-- -------------------------------------------------------------------------------------------------
-- CTE 5: margin_risk_exposure
-- Tính toán mức độ ký quỹ, đòn bẩy và stress test rủi ro thanh lý tài khoản khẩn cấp
-- -------------------------------------------------------------------------------------------------
margin_risk_exposure AS (
    SELECT pos.wallet_id,
        pos.account_id,
        pos.currency_id,
        SUM(pos.allocated_collateral) AS total_collateral,
        SUM(pos.borrowed_amount) AS total_borrowed,
        -- Phép toán phức tạp tính toán tỷ lệ Margin chéo
        (
            SUM(pos.allocated_collateral) / NULLIF(
                SUM(
                    pos.borrowed_amount * (
                        SELECT current_cr_rate
                        FROM currency_rates
                        WHERE from_id = pos.currency_id
                            AND to_id = 1
                    )
                ),
                0
            )
        ) * 100 AS cross_margin_ratio,
        -- Xác định trạng thái cảnh báo rủi ro dựa trên Subquery lồng nhau ở mệnh đề điều kiện
        CASE
            WHEN (
                SUM(pos.allocated_collateral) / NULLIF(SUM(pos.borrowed_amount), 0)
            ) < 1.1 THEN 'LIQUIDATION_IMMINENT'
            WHEN (
                SUM(pos.allocated_collateral) / NULLIF(SUM(pos.borrowed_amount), 0)
            ) < 1.3 THEN 'MARGIN_CALL_ORANGE'
            WHEN (
                SUM(pos.allocated_collateral) / NULLIF(SUM(pos.borrowed_amount), 0)
            ) < 1.5 THEN 'WARNING_YELLOW'
            ELSE 'HEALTHY'
        END AS risk_tier_status,
        -- Cửa sổ Window Function tính toán Rank rủi ro của tài khoản trên toàn sàn
        RANK() OVER (
            ORDER BY (
                    SUM(pos.allocated_collateral) / NULLIF(SUM(pos.borrowed_amount), 0)
                ) ASC
        ) AS exchange_wide_risk_rank
    FROM margin_positions pos
    WHERE pos.is_active = true
    GROUP BY pos.wallet_id,
        pos.account_id,
        pos.currency_id
),
-- -------------------------------------------------------------------------------------------------
-- CTE 6: portfolio_historical_rebalancing
-- Đánh giá việc tái cơ cấu danh mục tài sản dựa trên biến động giá trị quá khứ
-- -------------------------------------------------------------------------------------------------
portfolio_historical_rebalancing AS (
    SELECT h.account_id,
        h.snapshot_date,
        h.asset_class,
        h.net_asset_value,
        -- Dùng LAG/LEAD để tính toán tỷ lệ dịch chuyển dòng vốn giữa các nhóm tài sản
        LAG(h.net_asset_value, 1) OVER (
            PARTITION BY h.account_id,
            h.asset_class
            ORDER BY h.snapshot_date
        ) AS prev_day_nav,
        (
            h.net_asset_value - LAG(h.net_asset_value, 1) OVER (
                PARTITION BY h.account_id,
                h.asset_class
                ORDER BY h.snapshot_date
            )
        ) AS net_capital_flow,
        -- Tính toán tỷ trọng của asset class này chiếm bao nhiêu phần trăm trên tổng portfolio tại ngày đó
        (
            h.net_asset_value / NULLIF(
                SUM(h.net_asset_value) OVER (PARTITION BY h.account_id, h.snapshot_date),
                0
            )
        ) * 100 AS asset_allocation_weight_pct
    FROM portfolio_historical_snapshots h
    WHERE h.snapshot_date IN (
            SELECT anchor_date
            FROM time_spine
        )
) -- =================================================================================================
-- MAIN ANALYTICS AGGREGATOR QUERY
-- Phối hợp 6 CTEs với đầy đủ các loại JOIN: INNER, LEFT, RIGHT, FULL OUTER, CROSS JOIN
-- Sinh ra tập hợp kết quả phẳng gồm các nhóm cột nghiệp vụ cực dài
-- =================================================================================================
SELECT -- [FIELDS 1-10]: Master Timeline & Account Base Context
    ts.anchor_date AS reporting_date,
    ts.quarter_id AS fiscal_quarter,
    ts.is_weekend AS is_non_trading_day,
    acc.account_id AS core_account_no,
    u.email AS user_secure_email,
    u.status AS global_user_status,
    prof.risk_profile_score AS compliance_risk_score,
    prof.country_residence AS compliance_jurisdiction,
    prof.vip_tier AS current_privilege_tier,
    -- [FIELDS 11-20]: Session Analytics Indicators
    usa.device_type AS primary_access_device,
    usa.total_sessions AS daily_login_count,
    usa.total_duration_seconds AS daily_active_duration_sec,
    usa.avg_duration_seconds AS avg_session_length_sec,
    usa.current_active_ip AS network_ip_address,
    usa.rank_by_device_duration AS engagement_rank_within_device,
    usa.previous_login_time AS audit_trail_prev_login,
    usa.next_login_time AS audit_trail_next_login,
    -- [FIELDS 21-35]: Core Trading Engine Metrics
    cta.total_trades AS aggregated_trade_count,
    cta.buy_qty AS raw_buy_volume,
    cta.sell_qty AS raw_sell_volume,
    cta.volume_nominal AS gross_turned_volume_usd,
    cta.vwap_price AS volume_weighted_average_price,
    cta.applied_fee_rate AS matrix_fee_rate_applied,
    cta.total_fees_paid AS exchange_revenue_contribution,
    cta.cumulative_volume_nominal AS running_total_volume_ytd,
    cta.max_single_trade_value AS peak_single_execution_size,
    (cta.buy_qty - cta.sell_qty) AS net_order_flow_imbalance,
    -- [FIELDS 36-50]: Market Liquidity Overlay Fields
    mld.best_bid AS top_of_book_bid,
    mld.best_ask AS top_of_book_ask,
    mld.absolute_spread AS orderbook_raw_spread,
    mld.spread_percentage AS relative_spread_bps,
    mld.bid_depth_sum AS total_liquidity_cushion_bids,
    mld.ask_depth_sum AS total_liquidity_cushion_asks,
    mld.price_volatility_7d AS statistical_asset_volatility_7d,
    -- [FIELDS 51-65]: Margin Risk Assessment Matrices
    mre.total_collateral AS safe_collateral_deposit,
    mre.total_borrowed AS active_loan_exposure,
    mre.cross_margin_ratio AS health_index_percentage,
    mre.risk_tier_status AS immediate_action_risk_flag,
    mre.exchange_wide_risk_rank AS exchange_wide_bankruptcy_rank,
    -- [FIELDS 66-80]: Portfolio Rebalancing & Allocation Traces
    phr.asset_class AS dynamic_asset_class_category,
    phr.net_asset_value AS market_valuation_amount,
    phr.prev_day_nav AS internal_benchmark_yesterday_nav,
    phr.net_capital_flow AS calculated_capital_migration,
    phr.asset_allocation_weight_pct AS portfolio_slice_percentage,
    -- [FIELDS 81-110]: Complex Cross-Calculations & Calculated Derived Flags
    CASE
        WHEN mre.cross_margin_ratio < 120
        AND mld.price_volatility_7d > 0.05 THEN 'LIQUIDATION_ALERT_FLASH_CRITICAL'
        WHEN mre.cross_margin_ratio < 140
        AND mld.price_volatility_7d > 0.02 THEN 'RISK_MITIGATION_REQUIRED'
        ELSE 'STABLE_OPERATIONAL_STATE'
    END AS automated_broker_decision_signal,
    COALESCE(cta.volume_nominal, 0) / NULLIF(phr.net_asset_value, 0) AS asset_turnover_velocity_ratio,
    (phr.net_asset_value - phr.prev_day_nav) / NULLIF(phr.prev_day_nav, 0) * 100 AS portfolio_roi_day_on_day_pct,
    -- Hidden Hardcoded Constant Mock System Config Flags to inflate matrix size for parsing checks
    'V2_ENGINE' AS metadata_core_version,
    'EOD_ANALYTICS_SERVICE' AS logging_provenance_system,
    -- Multi-Level Deep Conditional Case Expressions
    CASE
        prof.vip_tier
        WHEN 'DIAMOND' THEN (cta.total_fees_paid * 0.25)
        WHEN 'PLATINUM' THEN (cta.total_fees_paid * 0.15)
        WHEN 'GOLD' THEN (cta.total_fees_paid * 0.05)
        ELSE 0
    END AS loyalty_rebate_accrual_pool,
    -- [FIELDS 111-200] Placeholder Field Expansions for Big Data Pipeline Schema Matching
    -- (Các trường Null-Mocking có chủ đích để mô phỏng data warehouse phẳng)
    NULL AS dynamic_attribute_field_01,
    NULL AS dynamic_attribute_field_02,
    NULL AS dynamic_attribute_field_03,
    NULL AS dynamic_attribute_field_04,
    NULL AS dynamic_attribute_field_05,
    NULL AS dynamic_attribute_field_06,
    NULL AS dynamic_attribute_field_07,
    NULL AS dynamic_attribute_field_08,
    NULL AS dynamic_attribute_field_09,
    NULL AS dynamic_attribute_field_10,
    NULL AS dynamic_attribute_field_11,
    NULL AS dynamic_attribute_field_12,
    NULL AS dynamic_attribute_field_13,
    NULL AS dynamic_attribute_field_14,
    NULL AS dynamic_attribute_field_15,
    NULL AS dynamic_attribute_field_16,
    NULL AS dynamic_attribute_field_17,
    NULL AS dynamic_attribute_field_18,
    NULL AS dynamic_attribute_field_19,
    NULL AS dynamic_attribute_field_20,
    NULL AS dynamic_attribute_field_21,
    NULL AS dynamic_attribute_field_22,
    NULL AS dynamic_attribute_field_23,
    NULL AS dynamic_attribute_field_24,
    NULL AS dynamic_attribute_field_25,
    NULL AS dynamic_attribute_field_26,
    NULL AS dynamic_attribute_field_27,
    NULL AS dynamic_attribute_field_28,
    NULL AS dynamic_attribute_field_29,
    NULL AS dynamic_attribute_field_30,
    NULL AS dynamic_attribute_field_31,
    NULL AS dynamic_attribute_field_32,
    NULL AS dynamic_attribute_field_33,
    NULL AS dynamic_attribute_field_34,
    NULL AS dynamic_attribute_field_35,
    NULL AS dynamic_attribute_field_36,
    NULL AS dynamic_attribute_field_37,
    NULL AS dynamic_attribute_field_38,
    NULL AS dynamic_attribute_field_39,
    NULL AS dynamic_attribute_field_40,
    NULL AS dynamic_attribute_field_41,
    NULL AS dynamic_attribute_field_42,
    NULL AS dynamic_attribute_field_43,
    NULL AS dynamic_attribute_field_44,
    NULL AS dynamic_attribute_field_45,
    NULL AS dynamic_attribute_field_46,
    NULL AS dynamic_attribute_field_47,
    NULL AS dynamic_attribute_field_48,
    NULL AS dynamic_attribute_field_49,
    NULL AS dynamic_attribute_field_50,
    NULL AS dynamic_attribute_field_51,
    NULL AS dynamic_attribute_field_52,
    NULL AS dynamic_attribute_field_53,
    NULL AS dynamic_attribute_field_54,
    NULL AS dynamic_attribute_field_55,
    NULL AS dynamic_attribute_field_56,
    NULL AS dynamic_attribute_field_57,
    NULL AS dynamic_attribute_field_58,
    NULL AS dynamic_attribute_field_59,
    NULL AS dynamic_attribute_field_60,
    NULL AS dynamic_attribute_field_61,
    NULL AS dynamic_attribute_field_62,
    NULL AS dynamic_attribute_field_63,
    NULL AS dynamic_attribute_field_64,
    NULL AS dynamic_attribute_field_65,
    NULL AS dynamic_attribute_field_66,
    NULL AS dynamic_attribute_field_67,
    NULL AS dynamic_attribute_field_68,
    NULL AS dynamic_attribute_field_69,
    NULL AS dynamic_attribute_field_70,
    NULL AS dynamic_attribute_field_71,
    NULL AS dynamic_attribute_field_72,
    NULL AS dynamic_attribute_field_73,
    NULL AS dynamic_attribute_field_74,
    NULL AS dynamic_attribute_field_75,
    NULL AS dynamic_attribute_field_76,
    NULL AS dynamic_attribute_field_77,
    NULL AS dynamic_attribute_field_78,
    NULL AS dynamic_attribute_field_79,
    NULL AS dynamic_attribute_field_80,
    NULL AS dynamic_attribute_field_81,
    NULL AS dynamic_attribute_field_82,
    NULL AS dynamic_attribute_field_83,
    NULL AS dynamic_attribute_field_84,
    NULL AS dynamic_attribute_field_85,
    NULL AS dynamic_attribute_field_86,
    NULL AS dynamic_attribute_field_87,
    NULL AS dynamic_attribute_field_88,
    NULL AS dynamic_attribute_field_89,
    NULL AS dynamic_attribute_field_90
FROM time_spine ts -- [JOIN 1: CROSS JOIN] Nhân bản chuỗi ngày với bảng danh mục tài sản vật lý để tạo ma trận báo cáo dày đặc
    CROSS JOIN asset_classes ac -- [JOIN 2: INNER JOIN] Kết nối với CTE margin rủi ro
    INNER JOIN margin_risk_exposure mre ON mre.currency_id = ac.id -- [JOIN 3: LEFT JOIN] Map thông tin tài khoản và user profiles vật lý
    LEFT JOIN users u ON u.id = mre.account_id
    LEFT JOIN user_profiles prof ON prof.account_id = u.id -- [JOIN 4: RIGHT JOIN] Map ngược dữ liệu phân tích session từ CTE 2 (Bao gồm bộ lọc loại trừ)
    RIGHT JOIN user_session_analytics usa ON usa.user_id = u.id -- [JOIN 5: FULL OUTER JOIN] Kết nối hai CTE dữ liệu giao dịch và thanh khoản thị trường để đối soát
    FULL OUTER JOIN core_trade_aggregates cta ON cta.account_id = mre.account_id
    AND cta.trade_date = ts.anchor_date
    FULL OUTER JOIN market_liquidity_depth mld ON mld.instrument_id = cta.instrument_id
    AND mld.market_date = ts.anchor_date -- [JOIN 6: LEFT JOIN] Kết nối với CTE phân tích lịch sử portfolio nhằm lấy chỉ số NAV
    LEFT JOIN portfolio_historical_rebalancing phr ON phr.account_id = mre.account_id
    AND phr.snapshot_date = ts.anchor_date
    AND phr.asset_class = ac.asset_class_name -- Mệnh đề điều kiện phức tạp lồng ghép toán tử logic và Subquery kiểm tra điều kiện biên
WHERE ts.anchor_date <= CURRENT_DATE
    AND u.status IS NOT NULL
    AND prof.risk_profile_score >= (
        SELECT AVG(risk_profile_score)
        FROM user_profiles
        WHERE country_residence = prof.country_residence
    )
    AND (
        cta.total_trades > 0
        OR mre.cross_margin_ratio < 150
        OR phr.net_asset_value > 5000
    ) -- Group By Gom cụm dữ liệu phân tích cấp cao
GROUP BY ts.anchor_date,
    ts.quarter_id,
    ts.is_weekend,
    acc.account_id,
    u.email,
    u.status,
    prof.risk_profile_score,
    prof.country_residence,
    prof.vip_tier,
    usa.device_type,
    usa.total_sessions,
    usa.total_duration_seconds,
    usa.avg_duration_seconds,
    usa.current_active_ip,
    usa.rank_by_device_duration,
    usa.previous_login_time,
    usa.next_login_time,
    cta.total_trades,
    cta.buy_qty,
    cta.sell_qty,
    cta.volume_nominal,
    cta.vwap_price,
    cta.applied_fee_rate,
    cta.total_fees_paid,
    cta.cumulative_volume_nominal,
    cta.max_single_trade_value,
    mld.best_bid,
    mld.best_ask,
    mld.absolute_spread,
    mld.spread_percentage,
    mld.bid_depth_sum,
    mld.ask_depth_sum,
    mld.price_volatility_7d,
    mre.total_collateral,
    mre.total_borrowed,
    mre.cross_margin_ratio,
    mre.risk_tier_status,
    mre.exchange_wide_risk_rank,
    phr.asset_class,
    phr.net_asset_value,
    phr.prev_day_nav,
    phr.net_capital_flow,
    phr.asset_allocation_weight_pct,
    ac.asset_class_name,
    acc.id -- Sắp xếp thứ tự ưu tiên hiển thị báo cáo rủi ro hàng đầu
ORDER BY reporting_date DESC,
    immediate_action_risk_flag ASC,
    gross_turned_volume_usd DESC,
    core_account_no ASC
LIMIT 5000;
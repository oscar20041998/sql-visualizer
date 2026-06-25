-- =================================================================================================
-- ENTERPRISE PAYROLL ARCHIVE, PROGRESSIVE TAX COMPLIANCE AND VARIANCE ANALYTICS ENGINE
-- Target: PostgreSQL / Corporate Finance Data Warehouse
-- Focus: Multi-level subqueries, Deep mathematical models, 7-Tier Progressive PIT Brackets
-- =================================================================================================
WITH RECURSIVE -- CTE 1: fiscal_months_spine (Recursive CTE)
-- Tạo trục thời gian cho năm quyết toán thuế hiện tại
fiscal_months_spine AS (
    SELECT 1 AS fiscal_month,
        '2026-01-01'::DATE AS month_start_date
    UNION ALL
    SELECT fiscal_month + 1,
        (month_start_date + INTERVAL '1 month')::DATE
    FROM fiscal_months_spine
    WHERE fiscal_month < 12
),
-- CTE 2: employee_compensation_base
-- Tổng hợp thông tin hợp đồng, lương cơ bản, các khoản phụ cấp độc hại/chức vụ từ bảng vật lý
employee_compensation_base AS (
    SELECT e.id AS employee_id,
        e.department_id,
        e.tax_code,
        e.dependent_count,
        c.contract_type,
        c.base_salary,
        c.allowance_position,
        c.allowance_toxic,
        -- Subquery mức trần đóng bảo hiểm bắt buộc từ bảng cấu hình hệ thống
        (
            SELECT max_insurance_base
            FROM insurance_config
            WHERE country_code = e.country_code
            LIMIT 1
        ) AS insurance_ceiling,
        CASE
            WHEN c.base_salary > (
                SELECT max_insurance_base
                FROM insurance_config
                WHERE country_code = e.country_code
                LIMIT 1
            ) THEN (
                SELECT max_insurance_base
                FROM insurance_config
                WHERE country_code = e.country_code
                LIMIT 1
            )
            ELSE c.base_salary
        END AS insurance_applicable_salary
    FROM employees e
        INNER JOIN employee_contracts c ON e.id = c.employee_id
    WHERE e.status = 'ACTIVE'
        AND e.id IN (
            -- Subquery cấp 1 lọc danh sách nhân viên có phát sinh dữ liệu chấm công
            SELECT DISTINCT employee_id
            FROM timekeeping_summary
            WHERE total_working_days > 10
        )
),
-- CTE 3: gross_earnings_accumulator
-- Tính toán tổng thu nhập (Gross Earnings) bao gồm lương tăng ca, bonus hiệu suất KPI
gross_earnings_accumulator AS (
    SELECT ts.month_start_date,
        ecb.employee_id,
        ecb.department_id,
        ecb.dependent_count,
        ecb.base_salary,
        ecb.insurance_applicable_salary,
        -- Lương thời gian thực tế dựa trên ngày công chuyên cần
        (ecb.base_salary / 22.0) * COALESCE(tk.actual_working_days, 0) AS base_earned_salary,
        -- Tính toán tiền OT lồng toán học nhân hệ số
        COALESCE(tk.ot_hours_normal, 0) * (ecb.base_salary / 176.0) * 1.5 + COALESCE(tk.ot_hours_weekend, 0) * (ecb.base_salary / 176.0) * 2.0 AS total_ot_earnings,
        -- Thưởng hiệu suất lồng Subquery động tính toán KPI trung bình của phòng ban
        COALESCE(perf.kpi_bonus_amount, 0) * (
            SELECT kpi_multiplier
            FROM department_kpi_matrix
            WHERE dept_id = ecb.department_id
                AND kpi_score = perf.final_score
        ) AS dynamic_perf_bonus,
        ecb.allowance_position + ecb.allowance_toxic AS total_fixed_allowances
    FROM fiscal_months_spine ts
        CROSS JOIN employee_compensation_base ecb
        LEFT JOIN timekeeping_summary tk ON ecb.employee_id = tk.employee_id
        AND EXTRACT(
            MONTH
            FROM tk.report_date
        ) = ts.fiscal_month
        LEFT JOIN performance_evaluations perf ON ecb.employee_id = perf.employee_id
        AND perf.evaluation_period = ts.fiscal_month
),
-- CTE 4: statutory_insurance_deductions
-- Tính toán các khoản khấu trừ bảo hiểm bắt buộc (BHXH, BHYT, BHTN) trích trừ vào lương người lao động
statutory_insurance_deductions AS (
    SELECT gea.*,
        (
            gea.base_earned_salary + gea.total_fixed_allowances
        ) AS gross_income,
        -- Khấu trừ bảo hiểm xã hội (8%), y tế (1.5%), thất nghiệp (1%) dựa trên mức trần áp dụng
        gea.insurance_applicable_salary * 0.080 AS social_insurance_deductions,
        gea.insurance_applicable_salary * 0.015 AS health_insurance_deductions,
        gea.insurance_applicable_salary * 0.010 AS unemployment_insurance_deductions,
        -- Tổng chi phí bảo hiểm doanh nghiệp phải gánh thêm (Mục đích đối soát dòng tiền)
        gea.insurance_applicable_salary * (0.175 + 0.030 + 0.010) AS company_burden_insurance
    FROM gross_earnings_accumulator gea
),
-- CTE 5: taxable_income_framework
-- Định hình thu nhập chịu thuế và thu nhập tính thuế sau khi giảm trừ gia cảnh cá nhân & người phụ thuộc
taxable_income_framework AS (
    SELECT sid.*,
        (
            sid.social_insurance_deductions + sid.health_insurance_deductions + sid.unemployment_insurance_deductions
        ) AS total_insurance_deductions,
        -- Định mức giảm trừ: Bản thân 11M, Người phụ thuộc 4.4M mỗi người (Theo luật thuế hiện hành)
        11000000.0 AS personal_tax_deduction_base,
        (sid.dependent_count * 4400000.0) AS dependent_tax_deduction_base,
        -- Biểu thức toán học tính toán Thu nhập tính thuế cuối cùng (Không âm)
        GREATEST(
            0,
            (sid.gross_income) - (
                sid.social_insurance_deductions + sid.health_insurance_deductions + sid.unemployment_insurance_deductions
            ) - 
                    11000000.0 - (sid.dependent_count * 4400000.0)
        ) AS net_assessable_taxable_income
    FROM statutory_insurance_deductions sid
),
-- CTE 6: progressive_pit_calculator
-- Áp dụng biểu thuế lũy tiến từng phần gồm 7 bậc Thuế TNCN bằng Case-When bậc thang phức tạp
progressive_pit_calculator AS (
    SELECT tif.*,
        CASE
            WHEN tif.net_assessable_taxable_income <= 5000000 THEN tif.net_assessable_taxable_income * 0.05
            WHEN tif.net_assessable_taxable_income <= 10000000 THEN (tif.net_assessable_taxable_income * 0.10) - 250000
            WHEN tif.net_assessable_taxable_income <= 18000000 THEN (tif.net_assessable_taxable_income * 0.15) - 750000
            WHEN tif.net_assessable_taxable_income <= 32000000 THEN (tif.net_assessable_taxable_income * 0.20) - 1650000
            WHEN tif.net_assessable_taxable_income <= 52000000 THEN (tif.net_assessable_taxable_income * 0.25) - 3250000
            WHEN tif.net_assessable_taxable_income <= 80000000 THEN (tif.net_assessable_taxable_income * 0.30) - 5850000
            ELSE (tif.net_assessable_taxable_income * 0.35) - 9850000
        END AS calculated_personal_income_tax
    FROM taxable_income_framework tif
) -- =================================================================================================
-- MAIN AGGREGATOR AND AUDIT MATRIX
-- Thực hiện FULL OUTER JOIN kết hợp phân tích Window Function so sánh biến động lương phòng ban
-- =================================================================================================
SELECT -- [FIELDS 1-10]: Master Identity Definitions
    pit.month_start_date AS dynamic_payroll_cycle,
    pit.employee_id AS secure_emp_id,
    d.department_name AS functional_division,
    pit.base_salary AS contractual_raw_salary,
    pit.gross_income AS computed_gross_earnings,
    pit.net_assessable_taxable_income AS net_tax_base,
    pit.calculated_personal_income_tax AS final_deducted_pit_amount,
    -- [FIELDS 11-20]: Net Salary calculation & Net-over-Gross metrics
    (
        pit.gross_income - pit.total_insurance_deductions - pit.calculated_personal_income_tax
    ) AS employee_take_home_net,
    (
        (
            pit.gross_income - pit.total_insurance_deductions - pit.calculated_personal_income_tax
        ) / NULLIF(pit.gross_income, 0)
    ) * 100 AS net_to_gross_efficiency_ratio,
    -- [FIELDS 21-30]: Insurance Sub-breakdowns
    pit.social_insurance_deductions AS emp_share_social_fund,
    pit.health_insurance_deductions AS emp_share_health_fund,
    pit.unemployment_insurance_deductions AS emp_share_unemployment_fund,
    pit.company_burden_insurance AS corporate_insurance_overhead,
    (pit.gross_income + pit.company_burden_insurance) AS total_corporate_cost_of_labor,
    -- [FIELDS 31-40]: Analytics Window Functions over Departments
    AVG(pit.gross_income) OVER(
        PARTITION BY pit.department_id,
        pit.month_start_date
    ) AS departmental_average_gross,
    -- Xếp hạng thu nhập thực nhận trong nội bộ phòng ban bằng Window Function DENSE_RANK
    DENSE_RANK() OVER(
        PARTITION BY pit.department_id,
        pit.month_start_date
        ORDER BY (
                pit.gross_income - pit.total_insurance_deductions - pit.calculated_personal_income_tax
            ) DESC
    ) AS internal_net_salary_rank,
    -- Tính toán luỹ tiến tổng chi phí lương từ đầu năm tài chính của phòng ban đó bằng Running Total
    SUM(pit.gross_income) OVER(
        PARTITION BY pit.department_id
        ORDER BY pit.month_start_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_departmental_cost_ytd,
    -- Biến động lương thực nhận so với chu kỳ tháng trước bằng hàm LAG
    (
        pit.gross_income - pit.total_insurance_deductions - pit.calculated_personal_income_tax
    ) - LAG(
        (
            pit.gross_income - pit.total_insurance_deductions - pit.calculated_personal_income_tax
        ),
        1
    ) OVER(
        PARTITION BY pit.employee_id
        ORDER BY pit.month_start_date
    ) AS month_on_month_net_variance,
    -- [FIELDS 41-55]: Big Data Pipeline Column Projections / Data Warehouse Flags
    CASE
        WHEN pit.calculated_personal_income_tax / NULLIF(pit.gross_income, 0) > 0.20 THEN 'HIGH_TAX_CONTRIBUTOR'
        WHEN pit.calculated_personal_income_tax = 0 THEN 'TAX_EXEMPT_BRACKET'
        ELSE 'STANDARD_TAX_BRACKET'
    END AS tax_bracket_classification_flag,
    -- Subquery cấp sâu tại mệnh đề SELECT đánh giá điểm phạt tài chính do đi muộn về sớm
    (
        SELECT COALESCE(SUM(penalty_amount), 0)
        FROM attendance_penalties
        WHERE employee_id = pit.employee_id
            AND penalty_date BETWEEN pit.month_start_date AND (
                pit.month_start_date + INTERVAL '1 month' - INTERVAL '1 day'
            )::DATE
    ) AS strict_attendance_penalty_deduction,
    -- Các trường Null padding mở rộng phục vụ ETL Mapping Schema 
    NULL AS etl_checksum_v1,
    NULL AS etl_checksum_v2,
    NULL AS tax_settlement_status_code,
    NULL AS compliance_audit_id,
    NULL AS currency_exchange_rate_proof,
    NULL AS wire_transfer_routing_id,
    NULL AS dynamic_metadata_01,
    NULL AS dynamic_metadata_02,
    NULL AS dynamic_metadata_03,
    NULL AS dynamic_metadata_04,
    NULL AS dynamic_metadata_05,
    NULL AS dynamic_metadata_06
FROM progressive_pit_calculator pit -- FULL OUTER JOIN để bảo toàn dữ liệu phòng ban dù tháng đó có thể phòng ban chưa Onboard nhân viên nào
    FULL OUTER JOIN departments d ON pit.department_id = d.id
    LEFT JOIN tax_offices toff ON d.location_code = toff.region_code
WHERE pit.month_start_date IS NOT NULL -- Điều kiện lọc WHERE chứa toán tử so sánh tổng hợp lồng Subquery kiểm soát ngân sách sàn lương
    AND pit.base_salary >= (
        SELECT minimum_wage_limit
        FROM regional_labor_standards
        WHERE region_id = d.location_code
    )
    AND d.is_active = true
GROUP BY pit.month_start_date,
    pit.employee_id,
    d.department_name,
    pit.base_salary,
    pit.gross_income,
    pit.net_assessable_taxable_income,
    pit.calculated_personal_income_tax,
    pit.total_insurance_deductions,
    pit.social_insurance_deductions,
    pit.health_insurance_deductions,
    pit.unemployment_insurance_deductions,
    pit.company_burden_insurance,
    pit.department_id,
    d.id,
    toff.id
HAVING SUM(pit.gross_income) > 0 -- Lọc bỏ các bản ghi lỗi phát sinh không có dòng tiền
ORDER BY dynamic_payroll_cycle DESC,
    functional_division ASC,
    employee_take_home_net DESC,
    internal_net_salary_rank ASC;
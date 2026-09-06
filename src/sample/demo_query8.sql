SELECT DISTINCT
    c.customer_id,
    c.full_name,
    NVL(c.credit_limit, 0) AS credit_limit,
    -- Anti-Pattern 1: Correlated Subquery trong SELECT (Chạy N lần cho từng dòng)
    (SELECT COUNT(1) 
     FROM transactions t1 
     WHERE t1.customer_id = c.customer_id 
       AND t1.status = 'COMPLETED') AS total_tx_count,
    
    -- Anti-Pattern 2: Dùng hàm trên cột indexed làm mất B-Tree Index
    SUM(t.amount) AS total_amount_2025,
    
    -- Anti-Pattern 3: Subquery trùng lặp tính toán
    (SELECT AVG(amount) FROM transactions WHERE status = 'COMPLETED') AS global_avg_amount
FROM 
    customers c
-- Anti-Pattern 4: Non-SARGable JOIN condition
LEFT JOIN transactions t 
       ON c.customer_id = t.customer_id 
      AND TO_CHAR(t.transaction_date, 'YYYY') = '2025'
LEFT JOIN credit_ratings r 
       ON c.customer_id = r.customer_id
WHERE 
    -- Anti-Pattern 5: Bọc hàm TO_CHAR/NVL ở WHERE làm vô hiệu hóa Index
    TO_CHAR(c.created_date, 'YYYY-MM-DD') >= '2023-01-01'
    
    -- Anti-Pattern 6: Implicit Type Conversion (So sánh Chuỗi vs Số)
    AND c.account_type = 102 
    
    -- Anti-Pattern 7: Wildcard ở đầu chuỗi với LIKE
    AND c.risk_category LIKE '%HIGH%'
    
    -- Anti-Pattern 8: Logic OR gây phá vỡ execution plan
    OR (
        NVL(r.risk_score, 0) < 50 
        AND t.status IN (SELECT status FROM lookup_status WHERE is_active = 'Y')
    )
GROUP BY 
    c.customer_id, 
    c.full_name, 
    c.credit_limit
-- Anti-Pattern 9: Lọc dữ liệu bằng HAVING thay vì WHERE
HAVING SUM(t.amount) > 10000 
ORDER BY 
    -- Anti-Pattern 10: Sort theo hàm tính toán đắt đỏ
    SUM(t.amount) DESC;
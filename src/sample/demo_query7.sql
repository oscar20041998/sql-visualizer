WITH RankedCustomerOrders AS (
    SELECT 
        c.customer_id,
        c.email,
        c.registration_date,
        o.order_id,
        o.order_date,
        o.total_amount,
        ROW_NUMBER() OVER (PARTITION BY c.customer_id ORDER BY o.order_date DESC) as rn
    FROM customers c
    INNER JOIN orders o ON c.customer_id = o.customer_id
    WHERE o.status = 'COMPLETED'
      AND o.order_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
),
HighValueFiltered AS (
    SELECT 
        r.customer_id,
        r.email,
        r.registration_date,
        r.order_id,
        r.order_date,
        r.total_amount,
        oi.product_id,
        oi.quantity,
        oi.unit_price,
        SUM(oi.quantity * oi.unit_price) OVER(PARTITION BY r.order_id) as calculated_order_total
    FROM RankedCustomerOrders r
    INNER JOIN order_items oi ON r.order_id = oi.order_id
    WHERE r.rn = 1 
      AND r.total_amount > 500.00
)
SELECT DISTINCT *
FROM HighValueFiltered
WHERE calculated_order_total >= 500.00
ORDER BY order_date DESC, customer_id ASC;
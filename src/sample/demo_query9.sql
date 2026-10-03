WITH CustomerOrderWindows AS (
    SELECT
        o.customer_id,
        o.order_id,
        o.order_date,
        o.total_amount,
        ROW_NUMBER() OVER (
            PARTITION BY o.customer_id
            ORDER BY o.order_date DESC, o.order_id DESC
        ) AS order_rank,
        SUM(o.total_amount) OVER (
            PARTITION BY o.customer_id
        ) AS customer_lifetime_spend,
        LAG(o.total_amount) OVER (
            PARTITION BY o.customer_id
            ORDER BY o.order_date, o.order_id
        ) AS previous_order_amount,
        AVG(o.total_amount) OVER (
            PARTITION BY o.customer_id
            ORDER BY o.order_date, o.order_id
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ) AS rolling_3_order_average
    FROM orders o
    WHERE o.status = 'COMPLETED'
),
RankedCustomerOrders AS (
    SELECT
        customer_id,
        order_id,
        order_date,
        total_amount,
        order_rank,
        customer_lifetime_spend,
        previous_order_amount,
        rolling_3_order_average,
        total_amount - previous_order_amount AS change_from_previous_order
    FROM CustomerOrderWindows
)
SELECT
    customer_id,
    order_id,
    order_date,
    total_amount,
    order_rank,
    customer_lifetime_spend,
    previous_order_amount,
    rolling_3_order_average,
    change_from_previous_order
FROM RankedCustomerOrders
WHERE order_rank <= 3
ORDER BY customer_id ASC, order_rank ASC;

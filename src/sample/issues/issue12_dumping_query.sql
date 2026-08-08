WITH OrderRevenue AS (
    SELECT
        o.order_id,
        o.customer_id,
        SUM(oi.quantity * oi.unit_price - oi.discount_amount) AS gross_revenue
    FROM Orders o
    INNER JOIN OrderItems oi
        ON o.order_id = oi.order_id
    WHERE
        o.order_date >= '2025-01-01'
        AND o.order_date < '2026-01-01'
        AND o.order_status <> 'CANCELLED'
    GROUP BY
        o.order_id,
        o.customer_id
),
RefundByOrder AS (
    SELECT
        p.order_id,
        SUM(r.refund_amount) AS refund_amount
    FROM Payments p
    INNER JOIN Refunds r
        ON p.payment_id = r.payment_id
    WHERE
        r.refund_date >= '2025-01-01'
        AND r.refund_date < '2026-01-01'
    GROUP BY
        p.order_id
),
ShipmentStats AS (
    SELECT
        s.order_id,
        s.carrier_id,
        CASE
            WHEN DATEDIFF(DAY, s.shipped_date, s.delivered_date) > 5 THEN 1
            ELSE 0
        END AS is_late
    FROM Shipments s
    WHERE
        s.shipment_status = 'DELIVERED'
),
CarrierUsage AS (
    SELECT
        ss.order_id,
        ss.carrier_id,
        c.carrier_name,
        COUNT(*) OVER (
            PARTITION BY ss.order_id, ss.carrier_id
        ) AS carrier_order_count
    FROM ShipmentStats ss
    INNER JOIN Carriers c
        ON ss.carrier_id = c.carrier_id
),
CustomerAgg AS (
    SELECT
        cu.customer_id,
        cu.customer_name,
        rg.region_name,
        co.country_name,
        COUNT(DISTINCT o.order_id) AS total_orders,
        SUM(orv.gross_revenue) AS gross_revenue,
        SUM(ISNULL(rbo.refund_amount, 0)) AS refund_amount,
        SUM(orv.gross_revenue - ISNULL(rbo.refund_amount, 0)) AS net_revenue,
        AVG(CAST(ISNULL(ss.is_late, 0) AS DECIMAL(10, 4))) AS late_delivery_rate
    FROM Customers cu
    INNER JOIN Cities ci
        ON cu.city_id = ci.city_id
    INNER JOIN Regions rg
        ON ci.region_id = rg.region_id
    INNER JOIN Countries co
        ON rg.country_id = co.country_id
    INNER JOIN Orders o
        ON cu.customer_id = o.customer_id
    INNER JOIN OrderRevenue orv
        ON o.order_id = orv.order_id
    LEFT JOIN RefundByOrder rbo
        ON o.order_id = rbo.order_id
    LEFT JOIN ShipmentStats ss
        ON o.order_id = ss.order_id
    GROUP BY
        cu.customer_id,
        cu.customer_name,
        rg.region_name,
        co.country_name
),
MostUsedCarrier AS (
    SELECT
        x.customer_id,
        x.carrier_name
    FROM (
        SELECT
            o.customer_id,
            c.carrier_name,
            COUNT(*) AS shipment_count,
            ROW_NUMBER() OVER (
                PARTITION BY o.customer_id
                ORDER BY COUNT(*) DESC, c.carrier_name
            ) AS rn
        FROM Orders o
        INNER JOIN Shipments s
            ON o.order_id = s.order_id
        INNER JOIN Carriers c
            ON s.carrier_id = c.carrier_id
        WHERE
            o.order_date >= '2025-01-01'
            AND o.order_date < '2026-01-01'
        GROUP BY
            o.customer_id,
            c.carrier_name
    ) x
    WHERE x.rn = 1
),
RankedCustomer AS (
    SELECT
        ca.*,
        muc.carrier_name AS most_used_carrier,
        RANK() OVER (
            PARTITION BY ca.region_name
            ORDER BY ca.net_revenue DESC
        ) AS revenue_rank_in_region,
        RANK() OVER (
            ORDER BY ca.net_revenue DESC
        ) AS global_revenue_rank
    FROM CustomerAgg ca
    LEFT JOIN MostUsedCarrier muc
        ON ca.customer_id = muc.customer_id
)
SELECT TOP 10
    customer_id,
    customer_name,
    country_name,
    region_name,
    total_orders,
    gross_revenue,
    refund_amount,
    net_revenue,
    late_delivery_rate,
    most_used_carrier,
    revenue_rank_in_region,
    global_revenue_rank
FROM RankedCustomer
ORDER BY
    net_revenue DESC;
/*
 ============================================================================
 GLOBAL LOGISTICS CONTROL TOWER: MASTER ANALYTICAL SCRIPT
 RDBMS: MySQL 8.0+
 EXECUTION: Nightly Batch / ELT Materialized View Generation
 
 MODULES INCLUDED:
 01. Temporal Dimensions (Recursive)
 02. Geo-Spatial Node Hierarchy (Ports, Hubs, Depots)
 03. Waybill & Shipment Lifecycle Tracking
 04. IoT Telematics & Fleet Ping Data (JSON Parsing)
 05. Driver Hours of Service (HoS) & Fatigue Compliance
 06. Route Deviation & ETA Predictive Modeling
 07. Fuel Consumption & ESG Carbon Emission Tracking
 08. Freight Billing, Demurrage, and Detention Charges
 09. Carrier SLA & On-Time In-Full (OTIF) Scoring
 10. The Grand Control Tower Aggregation
 ============================================================================
*/

WITH RECURSIVE

-- ============================================================================
-- MODULE 1: TEMPORAL DIMENSIONS
-- ============================================================================
date_dim AS (
    SELECT CURRENT_DATE - INTERVAL 365 DAY AS dt
    UNION ALL
    SELECT dt + INTERVAL 1 DAY FROM date_dim WHERE dt + INTERVAL 1 DAY <= CURRENT_DATE
),

-- ============================================================================
-- MODULE 2: GEO-SPATIAL NODE HIERARCHY & DISTANCE MATRIX
-- ============================================================================
location_nodes AS (
    SELECT 
        node_id, node_type, location_name, 
        latitude, longitude, region_code, country_code,
        geofence_radius_meters, timezone
    FROM dim_logistics_nodes
    WHERE is_active = 1
),
lane_matrix AS (
    SELECT 
        lane_id, origin_node_id, destination_node_id,
        transport_mode, planned_distance_km, 
        planned_transit_hours, baseline_cost
    FROM dim_transit_lanes
),

-- ============================================================================
-- MODULE 3: WAYBILL & SHIPMENT LIFECYCLE
-- ============================================================================
shipment_base AS (
    SELECT 
        w.waybill_id, w.tracking_number, w.customer_id,
        w.origin_node_id, w.destination_node_id, w.lane_id,
        w.weight_kg, w.volume_cbm, w.freight_class, w.hazardous_material_flag,
        w.booked_at, w.estimated_delivery_at,
        w.carrier_id, w.vehicle_id, w.driver_id,
        w.status AS current_status
    FROM fct_waybills w
    WHERE w.booked_at >= CURRENT_DATE - INTERVAL 365 DAY
),
tracking_milestones AS (
    SELECT 
        te.waybill_id,
        MAX(CASE WHEN te.event_code = 'PICKUP_DISPATCH' THEN te.event_timestamp END) AS actual_dispatch_time,
        MAX(CASE WHEN te.event_code = 'HUB_ARRIVAL' THEN te.event_timestamp END) AS first_hub_arrival,
        MAX(CASE WHEN te.event_code = 'CUSTOMS_CLEARED' THEN te.event_timestamp END) AS customs_cleared_time,
        MAX(CASE WHEN te.event_code = 'OUT_FOR_DELIVERY' THEN te.event_timestamp END) AS out_for_delivery_time,
        MAX(CASE WHEN te.event_code = 'PROOF_OF_DELIVERY' THEN te.event_timestamp END) AS actual_delivery_time,
        -- Calculate dwell time at origin
        TIMESTAMPDIFF(HOUR, 
            MAX(CASE WHEN te.event_code = 'PICKUP_DISPATCH' THEN te.event_timestamp END),
            MAX(CASE WHEN te.event_code = 'HUB_ARRIVAL' THEN te.event_timestamp END)
        ) AS origin_dwell_hours
    FROM fct_tracking_events te
    GROUP BY te.waybill_id
),

-- ============================================================================
-- MODULE 4: IoT TELEMATICS & FLEET GEOFENCING (Parsing JSON Payloads)
-- ============================================================================
raw_telematics AS (
    SELECT 
        ping_id, vehicle_id, waybill_id, timestamp,
        JSON_UNQUOTE(JSON_EXTRACT(sensor_data, '$.gps.lat')) AS lat,
        JSON_UNQUOTE(JSON_EXTRACT(sensor_data, '$.gps.lon')) AS lon,
        CAST(JSON_UNQUOTE(JSON_EXTRACT(sensor_data, '$.speed_kmh')) AS DECIMAL(10,2)) AS speed_kmh,
        CAST(JSON_UNQUOTE(JSON_EXTRACT(sensor_data, '$.engine.rpm')) AS INT) AS engine_rpm,
        CAST(JSON_UNQUOTE(JSON_EXTRACT(sensor_data, '$.fuel.level_pct')) AS DECIMAL(5,2)) AS fuel_pct,
        JSON_UNQUOTE(JSON_EXTRACT(sensor_data, '$.odometer_km')) AS odometer_reading,
        LAG(JSON_UNQUOTE(JSON_EXTRACT(sensor_data, '$.odometer_km'))) OVER(PARTITION BY vehicle_id, waybill_id ORDER BY timestamp) AS prev_odometer
    FROM iot_vehicle_pings
    WHERE timestamp >= CURRENT_DATE - INTERVAL 30 DAY
),
trip_distance AS (
    SELECT 
        vehicle_id, waybill_id,
        MAX(CAST(odometer_reading AS DECIMAL)) - MIN(CAST(odometer_reading AS DECIMAL)) AS actual_distance_driven_km,
        AVG(speed_kmh) AS avg_transit_speed_kmh,
        MAX(CASE WHEN speed_kmh > 110 THEN 1 ELSE 0 END) AS overspeed_flag
    FROM raw_telematics
    GROUP BY vehicle_id, waybill_id
),

-- ============================================================================
-- MODULE 5: DRIVER HOURS OF SERVICE (HoS) COMPLIANCE
-- ============================================================================
driver_logs AS (
    SELECT 
        driver_id, shift_start, shift_end,
        TIMESTAMPDIFF(MINUTE, shift_start, shift_end) / 60.0 AS shift_hours,
        TIMESTAMPDIFF(MINUTE, LAG(shift_end) OVER(PARTITION BY driver_id ORDER BY shift_start), shift_start) / 60.0 AS rest_hours_before_shift
    FROM fct_driver_shifts
),
hos_violations AS (
    SELECT 
        driver_id,
        COUNT(CASE WHEN shift_hours > 11.0 THEN 1 END) AS shifts_over_11_hours,
        COUNT(CASE WHEN rest_hours_before_shift < 10.0 THEN 1 END) AS insufficient_rest_violations
    FROM driver_logs
    GROUP BY driver_id
),

-- ============================================================================
-- MODULE 6: ROUTE DEVIATION & ETA PREDICTION
-- ============================================================================
route_analysis AS (
    SELECT 
        sb.waybill_id,
        lm.planned_distance_km,
        td.actual_distance_driven_km,
        td.avg_transit_speed_kmh,
        (td.actual_distance_driven_km - lm.planned_distance_km) AS route_deviation_km,
        CASE 
            WHEN lm.planned_distance_km = 0 THEN 0
            ELSE (td.actual_distance_driven_km - lm.planned_distance_km) / lm.planned_distance_km 
        END AS deviation_pct
    FROM shipment_base sb
    INNER JOIN lane_matrix lm ON sb.lane_id = lm.lane_id
    LEFT JOIN trip_distance td ON sb.waybill_id = td.waybill_id
),

-- ============================================================================
-- MODULE 7: FUEL CONSUMPTION & CARBON ESG EMISSIONS
-- ============================================================================
fuel_metrics AS (
    SELECT 
        sb.waybill_id,
        v.vehicle_class,
        v.fuel_type,
        td.actual_distance_driven_km,
        -- Calculate estimated fuel used based on vehicle class efficiency
        (td.actual_distance_driven_km / v.avg_km_per_liter) AS est_fuel_consumed_liters,
        -- Carbon calculation: Approx 2.68 kg CO2 per liter of diesel
        (td.actual_distance_driven_km / v.avg_km_per_liter) * 
            CASE WHEN v.fuel_type = 'DIESEL' THEN 2.68 
                 WHEN v.fuel_type = 'ELECTRIC' THEN 0.0 -- Assuming green grid for simplification
                 ELSE 2.31 END AS carbon_emissions_kg
    FROM shipment_base sb
    INNER JOIN dim_vehicles v ON sb.vehicle_id = v.vehicle_id
    INNER JOIN trip_distance td ON sb.waybill_id = td.waybill_id
),

-- ============================================================================
-- MODULE 8: FREIGHT BILLING, DEMURRAGE & DETENTION
-- ============================================================================
accessorial_charges AS (
    SELECT 
        waybill_id,
        SUM(CASE WHEN charge_code = 'FSC' THEN amount ELSE 0 END) AS fuel_surcharge_usd,
        SUM(CASE WHEN charge_code = 'TOLL' THEN amount ELSE 0 END) AS tolls_usd,
        SUM(CASE WHEN charge_code IN ('DEMURRAGE', 'DETENTION') THEN amount ELSE 0 END) AS delay_penalties_usd,
        SUM(amount) AS total_accessorials_usd
    FROM fct_freight_charges
    GROUP BY waybill_id
),

-- ============================================================================
-- MODULE 9: CARRIER SLA & ON-TIME IN-FULL (OTIF) SCORING
-- ============================================================================
carrier_performance AS (
    SELECT 
        sb.waybill_id,
        sb.carrier_id,
        c.carrier_name,
        sb.estimated_delivery_at,
        tm.actual_delivery_time,
        CASE 
            WHEN tm.actual_delivery_time IS NULL THEN 'IN_TRANSIT'
            WHEN tm.actual_delivery_time <= sb.estimated_delivery_at THEN 'ON_TIME'
            ELSE 'LATE'
        END AS delivery_status,
        TIMESTAMPDIFF(HOUR, sb.estimated_delivery_at, tm.actual_delivery_time) AS delay_hours,
        CASE WHEN sb.status = 'DAMAGED' OR sb.status = 'SHORTAGE' THEN 0 ELSE 1 END AS is_in_full
    FROM shipment_base sb
    INNER JOIN dim_carriers c ON sb.carrier_id = c.carrier_id
    LEFT JOIN tracking_milestones tm ON sb.waybill_id = tm.waybill_id
),

-- ============================================================================
-- MODULE 10: THE GRAND CONTROL TOWER AGGREGATION
-- ============================================================================
control_tower_cube AS (
    SELECT 
        -- Timeline
        DATE(sb.booked_at) AS booking_date,
        
        -- Entities
        sb.customer_id,
        cp.carrier_name,
        loc_o.location_name AS origin_hub,
        loc_d.location_name AS destination_hub,
        sb.freight_class,
        
        -- Volumes
        COUNT(DISTINCT sb.waybill_id) AS total_shipments,
        SUM(sb.weight_kg) AS total_freight_weight_kg,
        SUM(sb.volume_cbm) AS total_freight_volume_cbm,
        
        -- Performance & SLA (OTIF)
        SUM(CASE WHEN cp.delivery_status = 'ON_TIME' THEN 1 ELSE 0 END) AS on_time_shipments,
        SUM(cp.is_in_full) AS in_full_shipments,
        AVG(CASE WHEN cp.delivery_status = 'LATE' THEN cp.delay_hours ELSE 0 END) AS avg_delay_hours,
        
        -- Operations & Routing
        AVG(ra.deviation_pct) * 100 AS avg_route_deviation_pct,
        SUM(td.overspeed_flag) AS total_overspeed_incidents,
        
        -- ESG & Fuel
        SUM(fm.est_fuel_consumed_liters) AS total_fuel_liters,
        SUM(fm.carbon_emissions_kg) AS total_carbon_emissions_kg,
        
        -- Financials
        SUM(lm.baseline_cost) AS total_base_freight_cost,
        SUM(ac.fuel_surcharge_usd) AS total_fsc,
        SUM(ac.delay_penalties_usd) AS total_demurrage_detention,
        SUM(lm.baseline_cost + COALESCE(ac.total_accessorials_usd, 0)) AS total_landed_cost

    FROM shipment_base sb
    INNER JOIN location_nodes loc_o ON sb.origin_node_id = loc_o.node_id
    INNER JOIN location_nodes loc_d ON sb.destination_node_id = loc_d.node_id
    LEFT JOIN carrier_performance cp ON sb.waybill_id = cp.waybill_id
    LEFT JOIN route_analysis ra ON sb.waybill_id = ra.waybill_id
    LEFT JOIN fuel_metrics fm ON sb.waybill_id = fm.waybill_id
    LEFT JOIN trip_distance td ON sb.waybill_id = td.waybill_id
    LEFT JOIN accessorial_charges ac ON sb.waybill_id = ac.waybill_id
    LEFT JOIN lane_matrix lm ON sb.lane_id = lm.lane_id
    
    GROUP BY 
        DATE(sb.booked_at),
        sb.customer_id,
        cp.carrier_name,
        loc_o.location_name,
        loc_d.location_name,
        sb.freight_class
)

-- ============================================================================
-- FINAL SELECT FOR DASHBOARD MATERIALIZATION
-- ============================================================================
SELECT 
    booking_date,
    carrier_name,
    origin_hub,
    destination_hub,
    freight_class,
    total_shipments,
    total_freight_weight_kg,
    
    -- OTIF KPI Calculation
    ROUND((on_time_shipments / NULLIF(total_shipments, 0)) * 100, 2) AS on_time_delivery_pct,
    ROUND((in_full_shipments / NULLIF(total_shipments, 0)) * 100, 2) AS in_full_pct,
    ROUND(avg_delay_hours, 1) AS avg_delay_hours,
    
    -- Operational Efficiency
    ROUND(avg_route_deviation_pct, 2) AS route_deviation_pct,
    total_overspeed_incidents,
    
    -- Sustainability (ESG)
    ROUND(total_fuel_liters, 2) AS fuel_consumed_liters,
    ROUND(total_carbon_emissions_kg, 2) AS carbon_emissions_kg,
    
    -- Cost Economics
    ROUND(total_base_freight_cost, 2) AS base_freight_cost,
    ROUND(total_fsc, 2) AS total_fuel_surcharges,
    ROUND(total_demurrage_detention, 2) AS total_demurrage_detention,
    ROUND(total_landed_cost, 2) AS total_landed_cost,
    
    -- Cost per KG metric
    ROUND(total_landed_cost / NULLIF(total_freight_weight_kg, 0), 4) AS cost_per_kg

FROM control_tower_cube
WHERE total_shipments > 0
ORDER BY booking_date DESC, total_landed_cost DESC;
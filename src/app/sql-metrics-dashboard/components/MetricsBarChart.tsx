'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { SqlMetrics } from '@/lib/sqlAnalyzer';
import type { Translations } from '@/lib/i18n';

interface Props {
  metrics: SqlMetrics;
  t: Translations;
}

const COLORS = [
  'var(--accent)',
  'var(--info)',
  'var(--join-inner)',
  'var(--join-right)',
  'var(--warning)',
  'var(--join-left)',
  'var(--primary)',
  'var(--join-natural)',
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs font-mono">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="text-foreground font-semibold">{payload[0].value}</p>
    </div>
  );
}

export default function MetricsBarChart({ metrics, t }: Props) {
  const data = [
    { name: t.metricsBarWindowFn, value: metrics.windowFunctions },
    { name: t.metricsBarSubqueryCnt, value: metrics.subqueryCount },
    { name: t.metricsBarGroupBy, value: metrics.groupBy },
    { name: t.metricsBarOrderBy, value: metrics.orderBy },
    { name: t.metricsBarConditions, value: metrics.conditionCount },
    { name: t.metricsBarOpsFuncs, value: metrics.operationAndFunctionCount },
    { name: t.metricsBarJoins, value: metrics.joinCount },
    { name: t.metricsBarFinalSelect, value: metrics.finalSelectFieldCount },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

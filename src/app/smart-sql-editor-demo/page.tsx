'use client';

import React, { useEffect, useState } from 'react';
import SmartSQLEditor from '@/app/smart-sql-editor-demo/components/SmartSQLEditor';
import { getT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';

const SAMPLE_QUERIES = {
  simple: 'SELECT id, name, email FROM users LIMIT 10;',
  withJoin: `SELECT u.id, u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.active = 1
GROUP BY u.id, u.name
ORDER BY order_count DESC;`,
  withCTE: `WITH active_users AS (
  SELECT id, name, created_at FROM users WHERE active = 1
),
recent_orders AS (
  SELECT user_id, COUNT(*) as order_count FROM orders WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY user_id
)
SELECT au.id, au.name, COALESCE(ro.order_count, 0) as recent_orders
FROM active_users au
LEFT JOIN recent_orders ro ON au.id = ro.user_id
ORDER BY recent_orders DESC;`,
  complex: `SELECT 
  u.id,
  u.name,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(o.amount) as total_spent,
  AVG(o.amount) as avg_order_value,
  MAX(o.created_at) as last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.active = 1 AND u.created_at > DATE_SUB(NOW(), INTERVAL 1 YEAR)
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 0
ORDER BY total_spent DESC
LIMIT 50;`,
};

export default function SmartSQLEditorDemo() {
  const [selectedQuery, setSelectedQuery] = useState<keyof typeof SAMPLE_QUERIES>('simple');
  const [hydrated, setHydrated] = useState(false);
  const settings = useAppStore((s) => s.settings);
  const t = getT(settings.locale);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  return (
    <div className="flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-gray-900">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">{t.demoTitle}</h1>
          <p className="text-gray-400">{t.demoSubtitle}</p>
        </div>
      </div>

      {/* Sample Query Selector */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-gray-300 mb-3 font-semibold">{t.demoLoadSampleQueryLabel}</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(SAMPLE_QUERIES).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedQuery(key as keyof typeof SAMPLE_QUERIES)}
                className={`px-4 py-2 rounded font-medium transition ${
                  selectedQuery === key
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                {key === 'simple' && t.demoQuerySimple}
                {key === 'withJoin' && t.demoQueryWithJoin}
                {key === 'withCTE' && t.demoQueryWithCTE}
                {key === 'complex' && t.demoQueryComplex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto w-full h-full p-6 flex flex-col min-h-0 overflow-hidden">
          <div className="mb-4 p-4 bg-blue-900 border border-blue-700 rounded-lg text-blue-100 text-sm flex-shrink-0">
            <p className="font-semibold mb-2">{t.demoProTipsTitle}</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>{t.demoProTip1}</li>
              <li>{t.demoProTip2}</li>
              <li>{t.demoProTip3}</li>
              <li>{t.demoProTip4}</li>
              <li>{t.demoProTip5}</li>
            </ul>
          </div>

          {/* Editor */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <SmartSQLEditor initialSql={SAMPLE_QUERIES[selectedQuery]} />
          </div>
        </div>
      </div>

      {/* Footer with Instructions */}
      <div className="bg-gray-900 border-t border-gray-800 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Setup Instructions */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3">{t.demoSetupTitle}</h3>
              <ol className="text-sm text-gray-300 space-y-2">
                <li className="flex gap-2">
                  <span className="font-bold text-blue-400">1.</span>
                  <span>{t.demoInstallDepsLabel}</span>
                </li>
                <li className="ml-6 bg-gray-800 p-2 rounded font-mono text-xs text-gray-200">
                  {t.demoInstallDepsCmd}
                </li>
                <li className="flex gap-2 mt-3">
                  <span className="font-bold text-blue-400">2.</span>
                  <span>{t.demoStartOllamaLabel}</span>
                </li>
                <li className="ml-6 bg-gray-800 p-2 rounded font-mono text-xs text-gray-200">
                  {t.demoStartOllamaCmd}
                </li>
                <li className="flex gap-2 mt-3">
                  <span className="font-bold text-blue-400">3.</span>
                  <span>{t.demoTestInDemoLabel}</span>
                </li>
              </ol>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3">{t.demoFeaturesTitle}</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✅</span>
                  <span>{t.demoFeature1}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✅</span>
                  <span>{t.demoFeature2}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✅</span>
                  <span>{t.demoFeature3}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✅</span>
                  <span>{t.demoFeature4}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✅</span>
                  <span>{t.demoFeature5}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✅</span>
                  <span>{t.demoFeature6}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* More Info */}
          <div className="mt-6 p-4 bg-gray-800 rounded border border-gray-700">
            <p className="text-sm text-gray-400">
              {t.demoMoreInfoLabel}{' '}
              <code className="bg-gray-900 px-2 py-1 rounded text-gray-300">
                {t.demoMoreInfoFile}
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

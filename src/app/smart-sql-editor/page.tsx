'use client';

import React, { useEffect, useState } from 'react';
import SmartSQLEditor from '@/app/smart-sql-editor/components/SmartSQLEditor';
import AiSqlExplainer from '@/app/smart-sql-editor/components/AiSqlExplainer';
import { getT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import AppLayout from '@/components/AppLayout';

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

export default function SmartSQLEditorPage() {
  const [selectedQuery, setSelectedQuery] = useState<keyof typeof SAMPLE_QUERIES>('simple');
  const [currentSql, setCurrentSql] = useState<string>(SAMPLE_QUERIES.simple);
  const [optimizationResult, setOptimizationResult] = useState<null | import('@/lib/aiService').SqlOptimizationResult>(null);
  const [hydrated, setHydrated] = useState(false);
  const settings = useAppStore((s) => s.settings);
  const t = getT(settings.locale);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // The chrome renders immediately; only the body waits for hydration, since its text comes
  // from locale settings held in persisted (localStorage) state.
  if (!hydrated) return <AppLayout>{null}</AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-gray-900">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-800 p-6 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-2">{t.editorPageTitle}</h1>
            <p className="text-gray-400">{t.editorPageSubtitle}</p>
          </div>
        </div>

        {/* Sample Query Selector */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-sm text-gray-300 mb-3 font-semibold">
              {t.editorPageLoadSampleQueryLabel}
            </p>
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
                  {key === 'simple' && t.editorPageQuerySimple}
                  {key === 'withJoin' && t.editorPageQueryWithJoin}
                  {key === 'withCTE' && t.editorPageQueryWithCTE}
                  {key === 'complex' && t.editorPageQueryComplex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col w-full">
          <div className="max-w-7xl mx-auto w-full p-6 flex flex-col gap-4">
            <div className="p-4 bg-blue-900 border border-blue-700 rounded-lg text-blue-100 text-sm flex-shrink-0">
              <p className="font-semibold mb-2">{t.editorPageProTipsTitle}</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>{t.editorPageProTip1}</li>
                <li>{t.editorPageProTip2}</li>
                <li>{t.editorPageProTip3}</li>
                <li>{t.editorPageProTip4}</li>
                <li>{t.editorPageProTip5}</li>
                <li>{t.editorPageProTip6}</li>
              </ul>
            </div>

            {/* Editor */}
            <div className="min-h-[620px] flex flex-col">
              <SmartSQLEditor
                initialSql={SAMPLE_QUERIES[selectedQuery]}
                onSqlChange={setCurrentSql}
                onOptimizationResult={setOptimizationResult}
              />
            </div>

            {/* SQL → natural language */}
            <AiSqlExplainer sql={currentSql} optimizationResult={optimizationResult} />
          </div>
        </div>

        {/* Footer with Instructions */}
        <div className="bg-gray-900 border-t border-gray-800 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Setup Instructions */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3">{t.editorPageSetupTitle}</h3>
                <ol className="text-sm text-gray-300 space-y-2">
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-400">1.</span>
                    <span>{t.editorPageInstallDepsLabel}</span>
                  </li>
                  <li className="ml-6 bg-gray-800 p-2 rounded font-mono text-xs text-gray-200">
                    {t.editorPageInstallDepsCmd}
                  </li>
                  <li className="flex gap-2 mt-3">
                    <span className="font-bold text-blue-400">2.</span>
                    <span>{t.editorPageStartOllamaLabel}</span>
                  </li>
                  <li className="ml-6 bg-gray-800 p-2 rounded font-mono text-xs text-gray-200">
                    {t.editorPageStartOllamaCmd}
                  </li>
                  <li className="flex gap-2 mt-3">
                    <span className="font-bold text-blue-400">3.</span>
                    <span>{t.editorPageTestLabel}</span>
                  </li>
                </ol>
              </div>

              {/* Features */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3">{t.editorPageFeaturesTitle}</h3>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✅</span>
                    <span>{t.editorPageFeature1}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✅</span>
                    <span>{t.editorPageFeature2}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✅</span>
                    <span>{t.editorPageFeature3}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✅</span>
                    <span>{t.editorPageFeature4}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✅</span>
                    <span>{t.editorPageFeature5}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✅</span>
                    <span>{t.editorPageFeature6}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* More Info */}
            <div className="mt-6 p-4 bg-gray-800 rounded border border-gray-700">
              <p className="text-sm text-gray-400">
                {t.editorPageMoreInfoLabel}{' '}
                <code className="bg-gray-900 px-2 py-1 rounded text-gray-300">
                  {t.editorPageMoreInfoFile}
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

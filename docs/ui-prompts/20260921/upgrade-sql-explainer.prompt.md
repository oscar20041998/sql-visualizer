Refactor the SQL Explainer feature.

Goals:

- Increase clarity and comprehension (make it easy to understand the purpose and outcome of the query)
- Increase the length of the explanation to 500 to 1,000 characters.
- Increase characteristic understanding of the query
- Enhance the user's ability to quickly grasp the key insights from the query
- Improve readability for Business Analysts and Developers.
- Optimize for 30-second understanding.
- Do not duplicate Analyze feature.
- Keep explanations concise and business-focused.

Required sections:

1. Query Objective
2. What You Get Back (bullet list)
3. Report Grain (mandatory)
4. Filters & Constraints (structured categories)
5. Data Sources (source + business purpose)

Do NOT include:

- CTE explanations
- Join explanations
- Query execution logic
- Calculations
- Data lineage
- Performance analysis

Return structured JSON output suitable for UI rendering.
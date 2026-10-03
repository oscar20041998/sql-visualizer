# Query Input UI Contract

## Scope

This feature is an internal UI refinement for the existing Query Input page. It does not create a new network API or backend contract.

## State Contract

The current page relies on Zustand state values that remain in scope for this feature:
- dialect
- rawSql
- myBatisXml
- resolvedSql
- myBatisParams
- inputMode
- analysisResult
- isAnalyzing

## Functional Contract

The page must continue to support the following behaviors without modification:
- direct SQL input
- MyBatis XML upload and parsing
- parameter extraction and editing
- SQL resolution preview
- analyze action
- query history loading
- dialect selection
- warning / recommendation review
- in-app navigation to downstream analysis screens

## UI Contract

The refinement is limited to presentation, grouping, spacing, and interaction clarity. Any visual improvements must preserve the behavior and semantics currently delivered by the underlying state and analysis logic.

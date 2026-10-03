# Quickstart: Query Input UX Improvement

## Goal

Validate that the Query Input page remains functionally identical while improving clarity, hierarchy, and usability.

## Prerequisites

- Node.js and npm installed
- Repository dependencies installed via `npm install`

## Setup

```bash
npm install
```

## Run the app

```bash
npm run dev
```

Then open the app in a browser and navigate to the Query Input screen.

## Validation scenarios

### 1. Direct SQL input
- Select the direct SQL tab.
- Paste a valid SQL statement.
- Confirm the page remains readable and the action button hierarchy is clear.
- Trigger analysis and confirm the same downstream behavior remains intact.

### 2. MyBatis XML input
- Use the MyBatis import tab.
- Upload or paste a valid XML file.
- Confirm the upload area clearly communicates the current file state and removal action.
- Check that detected parameters remain editable and the resolved SQL preview updates correctly.

### 3. Parameter resolution
- Add several parameters for the same XML query.
- Search or scan the parameter section to locate a specific value.
- Update a parameter and confirm the final SQL preview and analysis workflow still work.

### 4. Analysis findings
- Run analysis on a query that triggers warnings or recommendations.
- Confirm the findings section is easier to scan, grouped by severity, and still supports navigation.

### 5. Cross-check desktop layouts
- Validate the page at 1024px, 1280px, 1440px, and 1920px.
- Confirm the SQL editor stays readable and the parameter panel does not dominate the workspace.

## Regression checks

```bash
npm run type-check
npm run lint
npm run test
```

These are the required evidence checks for the feature before implementation is considered complete.

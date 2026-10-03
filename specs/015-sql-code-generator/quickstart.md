# Quickstart: SQL → Code Generator Validation

**Plan**: [plan.md](plan.md)  
**UI contract**: [contracts/code-generator-ui.md](contracts/code-generator-ui.md)  
**Data model**: [data-model.md](data-model.md)

## Prerequisites

- Node.js version supported by the repository (the current workspace uses Node 24).
- Dependencies installed from the repository lockfile.
- Run commands from the repository root.

```powershell
npm ci
```

## Automated Validation

```powershell
npm test -- --run
npm run type-check
npm run build
```

Expected outcomes: Vitest passes parser/classifier/mapping/renderer and focused UI tests; TypeScript reports no new errors; Next.js creates a production build. The test suite must include each supported AST grammar and an explicit unsupported-Oracle case.

## Manual End-to-End Scenarios

1. Start the app with `npm run dev` and open `http://localhost:4028/query-input` after signing in or entering an allowed guest session.
2. Select **SQL → Code Generator**. Confirm the generator has its own SQL input and does not alter text in the SQL paste, MyBatis, or Smart Editor modes.
3. Enter this MySQL DDL and generate an Entity:

   ```sql
   CREATE TABLE users (
     id BIGINT NOT NULL PRIMARY KEY,
     display_name VARCHAR(80) NOT NULL,
     created_at TIMESTAMP NULL
   );
   ```

   Expected: Java/JPA source has a `User` type, an `@Id` mapping for `id`, a `String` property with length 80, and nullable metadata for `created_at`. No cascade or generation strategy is invented.
4. Replace the input with this PostgreSQL SELECT and generate a DTO:

   ```sql
   SELECT u.id AS user_id, COUNT(o.id) AS order_count
   FROM users u
   LEFT JOIN orders o ON o.user_id = u.id
   GROUP BY u.id;
   ```

   Expected: a DTO/projection with alias-derived properties, an integral count type, and a warning when any expression type cannot be proven. It is not annotated as an Entity.
5. Select an unsupported Oracle statement or enter an unknown SQL type. Expected: an actionable warning explains the unsupported grammar/type; guessed source is not displayed or downloaded.
6. Generate once, change the SQL or options, and regenerate. Expected: the new output replaces the old output without a history panel. Reset clears the result and restores the generator panel's initial SQL/options state.
7. Copy and download a successful result. Expected: clipboard text matches the preview and the downloaded file is named after the public class with a `.java` extension.
8. Navigate among all input-mode tabs using arrow keys, Home, and End. Expected: focus and selected-tab state remain synchronized and existing input modes still work.

## Acceptance Evidence

- Focused code-generation slice: `npx vitest run tests/unit/codegen tests/unit/query-input-code-generator.test.tsx` -> 59 passed across 11 files, including generation options, optional MyBatis mapper output, and copy/download notifications.
- Full suite: `npm test` -> 492 passed across 58 files in 49.68 seconds.
- TypeScript: `npm run type-check` -> passed.
- Production build: application compilation passed; prerender failed on `/404` with `<Html> should not be imported outside of pages/_document`. No `next/document` import was found under `src/`; this remains outside the code-generator change.
- Performance: the 100-FK parse/classify/render fixture completed in 50 ms, below the 2-second target.
- Browser walkthrough: opened `/query-input` at `http://localhost:4031` as a guest. MySQL `CREATE TABLE` generated a Java/JPA Entity with `@Entity`, `@Id`, and nullable column metadata. A joined/grouped SELECT generated a DTO with the `userId` alias and `Long orderCount`. Oracle input displayed the unsupported-dialect diagnostic and no source preview. Copy showed “Generated source copied.”; Download showed “Java file downloaded.”; Reset cleared the SQL and preview. Home and End moved selection between the first and last input tabs. The browser harness did not expose a download event, so exact `.java` filename/content is additionally verified by the passing automated export tests.

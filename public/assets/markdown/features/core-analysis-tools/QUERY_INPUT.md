# Query Input 📝

The starting point for all analysis. Supports both raw SQL and MyBatis XML imports.

## Capabilities

### Dual Input Modes

- **SQL** for queries and supported database object definitions in one editor
- **MyBatis XML file import** with parameter resolution

### Multi-Dialect Support

- MySQL
- PostgreSQL
- SQL Server
- Oracle

### Features

- **Syntax Preservation:** Maintains original SQL structure for analysis
- **Live Findings:** Review lint findings as you edit
- **Sample Queries:** Load pre-built example queries for testing
- **Character/Line Counter:** Track query size metrics
- **Dialect Mismatch Validation:** Warns before analysis when the SQL you pasted uses syntax specific to a different dialect than the one selected (e.g. `CROSS APPLY` selected under MySQL), so you catch the mismatch before reading a misleading analysis.
- **Table Details:** Analyze multiple CREATE TABLE statements and choose a table to inspect. Supported ALTER TABLE additions and CREATE INDEX statements are merged into the matching table. Ambiguous targets, unsupported changes, and invalid statements are listed with their source lines; the resulting schema may be incomplete. Quoted and unquoted names follow the selected dialect, and unqualified names are not assumed to belong to a schema.
- **Dialect Limits:** The supported ALTER TABLE and CREATE INDEX syntax differs by parser and dialect. Unsupported operations (including drops or complex index expressions) are reported rather than inferred; separate COMMENT statements are not yet merged.
- **Object AI:** Responses format supported Markdown safely; SQL source and object identifiers are not sent.

## Use Cases

- Paste your production SQL for instant analysis
- Test different SQL dialects with the same query
- Import MyBatis configurations and dynamically generate SQL
- Understand query complexity before execution

## Getting Started

1. Navigate to Query Input page
2. Select your SQL dialect from the dropdown
3. Paste a query or database object definition, or click "Load Sample"
4. Analyze the SQL: queries open the dashboard; supported objects show their results beside the editor
5. Expand the database object tools to import SQL files or add definitions to the session

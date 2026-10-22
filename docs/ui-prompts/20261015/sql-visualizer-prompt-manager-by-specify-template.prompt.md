# TASK: Refactor AI Prompt Management in SQL Visualizer Without Changing Existing Outputs

## 1. Role and Engineering Standards

Act as a Senior Software Architect and Senior TypeScript/Next.js Engineer with extensive experience in AI integrations, production refactoring, backward compatibility, prompt engineering, and test-driven development (TDD).

Work on the existing SQL Visualizer repository.

Follow these principles throughout the task:

- Backward compatibility first.
- Characterize existing behavior before refactoring.
- Minimal, incremental changes.
- Test-driven development.
- Preserve existing contracts and functionality.
- No unrequested feature enhancements.
- No speculative redesigns.
- No changes to existing AI output behavior unless explicitly authorized.

Your objective is to improve maintainability, not to redesign the product or improve the quality, wording, format, or structure of existing AI responses.

## 2. Primary Objective

Currently, AI-related services contain hard-coded prompts inside request handlers, service implementations, or other parts of the application.

Refactor these prompts into centralized, parameterized template files and introduce a reusable prompt management mechanism.

The system must support:

1. Externalized prompt templates.
2. Named and validated template parameters.
3. Centralized prompt registration and rendering.
4. Vietnamese and English language support synchronized with the application's existing system language.
5. Integration with existing AI services and providers.
6. Automated tests to prevent regressions.
7. Future maintainability without introducing unnecessary architectural complexity.

The refactoring must preserve existing application behavior and AI output contracts.

## 3. CRITICAL REQUIREMENT: DO NOT CHANGE EXISTING OUTPUTS

This requirement takes precedence over prompt cleanup, optimization, modernization, and stylistic improvements.

### 3.1 Preserve Existing Output Contracts

Before modifying any implementation, inspect and document the existing outputs of every AI-powered feature in scope.

Preserve all existing output characteristics, including where applicable:

- Response structure and nesting.
- JSON keys, field names, data types, and required fields.
- Markdown structure and heading names.
- Section ordering.
- Labels and terminology.
- Formatting conventions.
- SQL code blocks and executable SQL.
- XML or MyBatis conversion output.
- Analysis, explanation, optimization, comparison, and safety-assessment sections.
- Existing score, severity, confidence, and status conventions.
- Error and fallback behavior.
- UI components and the way responses are consumed by the frontend.
- Streaming behavior and partial-response handling.
- Provider-specific request and response contracts.

These are examples of contract dimensions to inspect. Preserve the actual contracts discovered in the codebase, including any additional constraints not listed here.

Do not assume that every AI feature uses JSON or Markdown. Determine its real output contract from the implementation and tests.

### 3.2 No Unauthorized Prompt Rewriting

When extracting an existing hard-coded prompt into a template:

- Preserve its original instruction text.
- Preserve the ordering of instructions.
- Preserve existing examples and output schemas.
- Preserve existing delimiters and formatting requirements.
- Preserve existing constraints and negative instructions.
- Preserve the existing composition and ordering of system, developer, and user messages where supported.
- Preserve existing parameter values and defaults.
- Preserve existing model configuration and generation settings.

Do not paraphrase, summarize, translate, optimize, simplify, expand, or otherwise rewrite existing prompts during extraction.

Do not remove instructions because they appear redundant.

Do not change an existing prompt's language merely to standardize the templates.

Do not improve existing AI response wording or redesign the output schema as part of this task.

The initial migration must be an extraction and integration refactor, not a prompt-engineering improvement project.

### 3.3 AI Output Equivalence

Prompt text extraction alone cannot guarantee that an LLM will generate identical responses because model output can be nondeterministic.

Therefore, distinguish between:

1. Application-level contract preservation.
2. Prompt and provider-request equivalence.
3. Semantic or exact generated-response equivalence.

For the same inputs and configuration, the refactored implementation should preserve the original prompt messages and provider request settings as closely as technically possible.

Do not claim exact LLM response equivalence unless it has been demonstrated under controlled conditions.

Use golden tests, mocked provider responses, request snapshots, and existing fixtures to verify compatibility.

If any output difference is unavoidable, stop and report the cause instead of silently accepting the difference.

## 4. Mandatory Repository Audit

Before editing implementation files:

1. Inspect the repository structure.
2. Read applicable AGENTS.md, .clinerules, SpecKit instructions, and existing architecture documentation.
3. Inspect package.json and identify existing scripts and testing tools.
4. Locate all AI-related services, request handlers, provider adapters, and prompt construction logic.
5. Identify all hard-coded system, developer, and user prompts.
6. Identify prompt fragments assembled dynamically across multiple files.
7. Identify existing output parsers, schemas, frontend consumers, and error-handling logic.
8. Identify the existing i18n implementation and the authoritative application language setting.
9. Identify existing Ollama and other AI provider integrations.
10. Establish baseline test, type-check, lint, and build results where feasible.

Create a prompt inventory containing:

- Feature name.
- Existing prompt location.
- Prompt message role.
- Existing prompt text or a verifiable reference to it.
- Input parameters.
- Parameter defaults.
- Provider and model configuration.
- Expected output format.
- Output consumers.
- Relevant tests.
- Migration status.

Do not begin a repository-wide refactor until the inventory and migration plan are clear.

If baseline tests already fail, document those failures separately. Do not attribute pre-existing failures to the refactor.

## 5. Target Architecture

Design a lightweight Prompt Management System compatible with the existing repository.

The proposed architecture may contain:

- Prompt template files.
- A centralized prompt registry.
- Typed parameter definitions.
- A template renderer.
- Shared language-context resolution.
- Existing AI service integration.
- Existing provider adapters.

Adapt the design to the actual repository. Do not create duplicate infrastructure if equivalent functionality already exists.

### 5.1 Template Files

Use readable Markdown templates or another format justified by existing project conventions.

Organize templates by actual AI feature, for example:

prompts/
- database-assistant/
- sql-explainer/
- sql-optimizer/
- sql-compare/
- mybatis-converter/

This is an illustrative structure, not a requirement to rename or recreate every directory.

Separate system, developer, and user templates only when the existing provider integration and message structure require it.

### 5.2 Parameterization

Replace only genuinely dynamic values with explicit named placeholders.

Possible parameters include:

- sql
- dialect
- language
- schemaContext
- originalSql
- modifiedSql
- conversationHistory
- additionalContext

Use the actual parameters discovered in each existing service.

Requirements:

- Preserve the original parameter values.
- Preserve defaults and conditional behavior.
- Preserve multiline SQL, XML, code snippets, and special characters.
- Do not accidentally trim, escape, normalize, or modify user-provided content.
- Reject missing required parameters.
- Detect unresolved placeholders.
- Avoid arbitrary template execution.
- Prevent path traversal.
- Avoid introducing new transformations to the generated prompt.

Do not invent new parameters or change the semantics of existing parameters merely to make templates look more consistent.

### 5.3 Prompt Registry and Renderer

Provide a centralized, typed mechanism to resolve approved prompt IDs and render templates.

The renderer must:

- Resolve prompt IDs through an explicit registry.
- Validate the appropriate parameter schema.
- Render templates deterministically.
- Preserve existing prompt text and whitespace where relevant.
- Report actionable errors for missing templates or parameters.
- Prevent unresolved placeholders from reaching the provider.
- Avoid logging sensitive SQL or prompt payloads unnecessarily.

Use the existing dependency set where possible. Do not introduce a template framework without a clear need.

If templates are filesystem-based, keep filesystem access server-side and compatible with the existing Next.js runtime and deployment configuration.

Do not expose private prompt files or server-only implementation code to the browser.

## 6. System-Language Synchronization

The application's existing language setting must be the authoritative source for new AI requests.

Before implementation, inspect how the application currently manages its language and reuse that mechanism.

Do not introduce a separate language preference or independently choose a new default.

Requirements:

1. Resolve the active application locale centrally.
2. Support the existing Vietnamese and English locales.
3. Handle supported regional locale variants consistently with the existing i18n configuration.
4. Pass the resolved language context to relevant AI services.
5. Ensure subsequent requests use the newly selected language when the user changes the application language.
6. Preserve existing conversation history and its storage format.
7. Do not modify SQL, XML, identifiers, or executable code merely to match the selected language.

### Strict Language Compatibility Rule

The initial migration must not rewrite existing prompt instructions or change their output language.

First, extract existing prompts without changing their contents.

Then inspect whether each feature already follows the application language setting.

If a feature already supports language switching, preserve that behavior and make the language context explicit without changing the output contract.

If a feature does not currently follow the application language, do not silently introduce a behavior change as part of the extraction refactor.

Instead:

- Document the discrepancy.
- Identify the exact affected feature and prompt.
- Propose the smallest backward-compatible change.
- Add tests for the proposed behavior.
- Clearly separate that change from pure prompt extraction.
- Do not activate a new language behavior that would conflict with the existing output contract without explicit approval.

Do not translate existing prompts or duplicate every template into Vietnamese and English unless the existing architecture genuinely requires separate templates.

Do not assume that passing a language parameter alone is sufficient. Verify how the parameter reaches the provider and how the resulting response is consumed.

## 7. AI Provider Compatibility

Preserve existing provider integrations and request construction.

Inspect and retain existing behavior for:

- Ollama, if present.
- Other currently supported providers.
- Model identifiers.
- System and user message roles.
- Generation parameters.
- Streaming and non-streaming requests.
- Timeout and retry handling.
- Cancellation.
- Error mapping.
- Response parsing.
- Structured output modes.

The Prompt Management System must not become a replacement for the existing provider abstraction.

Do not change providers, models, temperatures, token limits, sampling settings, or response-format options as part of this task.

Do not introduce real network calls into unit tests.

## 8. TDD and Regression Protection

Use the existing test framework and follow the repository's testing conventions.

### Phase A: Characterization Tests

Before refactoring, create or extend tests to capture existing behavior.

Where practical, capture:

- Existing rendered prompt messages.
- Message roles and ordering.
- Parameter interpolation.
- Provider request configuration.
- Representative response fixtures.
- Output schema and parsing behavior.
- UI assumptions about response fields.
- Error and fallback behavior.

Use representative fixtures for every migrated feature.

Do not use newly designed expected outputs as the baseline. The baseline must reflect the existing implementation.

### Phase B: Prompt Manager Tests

Test at least:

1. Correct template lookup.
2. Required parameter validation.
3. Optional parameters and existing defaults.
4. Missing template errors.
5. Unresolved placeholders.
6. Multiline SQL and XML preservation.
7. Quotes, braces, backticks, and special characters.
8. Prompt message ordering.
9. Path traversal prevention.
10. Locale propagation where currently supported.
11. Correct handling of empty values.
12. No unintended changes to provider configuration.

### Phase C: Integration and Regression Tests

For every migrated AI feature:

1. Verify that the same logical input produces equivalent prompt messages.
2. Verify that existing provider request settings remain unchanged.
3. Mock the provider response and verify that the service produces the same application-level result.
4. Verify existing parsing and frontend contracts.
5. Verify existing error and fallback behavior.

Where nondeterministic model output prevents exact response comparison, use deterministic mocked provider responses and validate the request and output contracts independently.

### Phase D: Full Validation

Run the relevant existing tests, type checking, linting, and production build.

Record actual commands and results.

Do not claim that tests passed if they were not executed successfully.

## 9. Incremental Migration Strategy

Implement the refactor in controlled stages.

### Stage 1: Audit

Inventory all existing AI prompts, services, provider integrations, and output contracts.

No functional modifications.

### Stage 2: Baseline

Add characterization tests and capture existing prompt/request behavior.

Resolve test infrastructure issues without changing product behavior.

### Stage 3: Prompt Management Core

Implement the registry, parameter validation, renderer, and tests.

Do not migrate all services at once.

### Stage 4: Pilot Migration

Migrate one representative AI feature.

Compare the old and new rendered messages and provider requests.

Verify output compatibility using fixtures and integration tests.

Do not continue if unexplained differences remain.

### Stage 5: Remaining Features

Migrate the remaining in-scope features incrementally.

Preserve feature-specific prompt instructions and output contracts.

### Stage 6: Cleanup

Remove obsolete hard-coded prompt definitions only after all references have been migrated and verified.

Do not remove unrelated code or refactor adjacent business logic.

### Stage 7: Final Validation

Run regression tests, type checking, linting, and production build.

Review the final diff for accidental changes to output schemas, UI behavior, provider configuration, and prompt wording.

## 10. Explicitly Out of Scope

Unless separately approved, do not:

- Redesign AI-generated output.
- Improve, rewrite, or optimize existing prompt wording.
- Change JSON schemas or response types.
- Rename response fields.
- Change Markdown sections or their ordering.
- Change SQL explanation or optimization logic.
- Change SQL or XML conversion semantics.
- Change database dialect support.
- Change AI models or providers.
- Change UI layouts or presentation.
- Introduce a prompt administration UI.
- Introduce database-backed prompt storage.
- Add unrelated features.
- Replace existing libraries.
- Perform unrelated refactoring.
- Modify deployment architecture beyond what is necessary to package and load the templates safely.

## 11. Acceptance Criteria

The task is complete only when:

- All in-scope hard-coded prompts have been inventoried.
- Existing output contracts have been documented and covered by tests where practical.
- Migrated prompt content preserves the original instructions.
- Prompt rendering preserves required whitespace, parameters, and payload content.
- Existing provider request settings remain unchanged.
- Existing service interfaces and frontend contracts remain compatible.
- Existing language behavior is preserved.
- Any required language-sync discrepancy is documented rather than silently changed.
- No unresolved placeholders reach the AI provider.
- Tests verify prompt rendering and feature-level regression behavior.
- Relevant tests, type checks, linting, and builds have actual recorded results.
- All remaining hard-coded prompts and unresolved compatibility risks are documented.
- The final diff contains no unrelated feature or output changes.

## 12. Execution Protocol

Start by inspecting the repository and reporting:

1. Current architecture.
2. Inventory of hard-coded prompts.
3. Existing output contracts.
4. Existing localization behavior.
5. Baseline test and build status.
6. Proposed migration plan.
7. Potential compatibility risks.

After the audit, proceed incrementally with characterization tests and implementation when the scope is clear.

If an architectural decision would require changing existing output behavior, stop and ask for approval before making that change.

Do not silently weaken tests, rewrite expected outputs to make failures disappear, or claim success based on code inspection alone.

At the end, provide a concise report of files changed, prompts migrated, tests executed, results, and any remaining risks.

Final priority: improve prompt maintainability while preserving existing SQL Visualizer behavior and output contracts.

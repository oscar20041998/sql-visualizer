# Code Generator UI Contract

**Feature**: [spec.md](../spec.md)  
**Design**: [plan.md](../plan.md) and [data-model.md](../data-model.md)

## Entry and Input

- The feature is an additional input-method tab on the existing `/query-input` page, labeled **SQL → Code Generator**.
- It is distinct from the current SQL paste, MyBatis/XML, and Smart Editor modes.
- It has its own editable SQL input so generation never changes the SQL held by existing input modes or the analysis result.
- The dialect selector uses the same dialect choices and labels as the existing Query Input page.
- The input panel shows classification and parse diagnostics before generation when enough structure is available.

## Generation Controls

- Language is Java and framework is JPA/Hibernate for MVP. Future languages/frameworks may be shown as unavailable, but cannot be selected to produce code.
- Output type is `Auto`, `Entity`, or `DTO/Projection`. `Auto` follows deterministic classification. An explicit output choice cannot override a parse error, unsupported construct, or insufficient metadata.
- Naming strategy, Lombok, relationship inclusion, and schema-backed validation annotations are exposed only where supported.
- Defaults: Java/JPA, Auto output, camelCase fields, Lombok off, relationships on only when explicit FK metadata exists, validation annotations off.
- For ambiguous SELECT projections, the user must resolve the output choice or alias issue before source is generated.

## Preview and Actions

- Generated Java is displayed in the existing Monaco editor with Java syntax highlighting.
- **Generate / Regenerate** uses the current SQL, dialect, and options. The new result replaces the previous generated result.
- **Reset** clears generated output and restores the generator panel's initial SQL/options state; it does not clear or rewrite SQL in another input mode.
- **Copy** copies the displayed source unchanged and reports clipboard failure accessibly.
- **Download** saves one `.java` file using the generated public class name.
- A blocked generation has no downloadable source; diagnostics remain visible and identify the next action.

## Classification and Diagnostics

- DDL with usable table and primary-key metadata can produce an Entity.
- SELECT queries default to DTO/Projection unless an entity-like result shape is proven; JOIN, grouping, aggregates, aliases, and computed expressions are represented as query facts.
- INSERT, UPDATE, and DELETE are classified but do not produce code in this MVP.
- Unsupported dialects/features, unknown types, ambiguous aliases, missing key metadata, and unsupported composite-key mappings produce actionable messages. The UI does not render guessed source.
- Relationship mappings require explicit foreign-key metadata. No cascade, fetch strategy, orphan removal, validation rule, or business behavior is invented.

## Accessibility and Localization

- The new tab participates in the existing WAI-ARIA tablist pattern, including arrow-key, Home, and End navigation, focus state, `aria-selected`, and panel association.
- All new user-visible labels, statuses, warnings, and action feedback have English and Vietnamese translations.
- Diagnostic state is conveyed with text and semantics, not color alone. Focus remains predictable after generation and reset.

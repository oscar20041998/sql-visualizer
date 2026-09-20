# Golden corpus: `tests/fixtures/mybatis/`

Each case is a triple of files sharing one case name:

| File | Purpose |
|------|---------|
| `<case>.xml` | The mapper input (may contain a DOCTYPE, CDATA, entities, comments, dynamic constructs, multiple statements). |
| `<case>.params.json` | `{ "params": { … }, "dialect": "…", "statement": "<id>", "expectedFindings": ["KIND", …] }` — the values the case is exercised with, the selected dialect, the statement key to resolve, and the finding kinds the result must carry. |
| `<case>.expected.sql` | The exact SQL the conversion must produce, compared after whitespace normalisation. |

## Conventions

- **Whitespace**: `.expected.sql` is compared after the shared normaliser collapses cosmetic whitespace, so indentation style is free; whitespace inside string literals is preserved by the converter and must be written exactly in the expectation.
- **Blocked cases**: when the statement cannot be produced, leave `.expected.sql` empty and list the error finding kind(s) in `expectedFindings`.
- **Statement selection**: omit `"statement"` to resolve the first statement in document order.

## Construct coverage checklist (FR-041)

Every construct named in the specification must have at least one case:

- [x] plain SELECT / INSERT / UPDATE / DELETE (`simple-select`, `insert-statement`, `update-statement`, `delete-statement`)
- [x] CDATA and escaped operators (`cdata-operators`)
- [x] XML comments (`xml-comments`)
- [x] XML entities (`escaped-entities`)
- [x] `<if>` guarded true and false (`dynamic-where` two-variant file)
- [x] `<choose>` / `<when>` / `<otherwise>` incl. no-branch-matched (`choose-when-otherwise`, `choose-no-branch`)
- [x] `<where>` zero / one / many conditions, leading AND/OR (`dynamic-where`, `nested-if`)
- [x] `<set>` zero and many assignments, trailing comma (`update-set`, `set-empty`)
- [x] `<trim>` prefix/prefixOverrides/suffix/suffixOverrides (`trim-wrapper`)
- [x] `<foreach>` list / empty / unavailable / nested / index / custom separators (`foreach-list`, `foreach-empty`, `foreach-unresolved`, `nested-foreach`)
- [x] `<bind>` resolvable and unresolvable (`bind-variable`, `bind-unresolved`)
- [x] `<sql>` / `<include>` simple, nested+properties, namespace-qualified, dynamic fragment, cycle, missing (`include-*`, `unresolved-include`)
- [x] `#{...}` prepared value, unsupplied (`unsupplied-parameter`)
- [x] `${...}` raw substitution, supplied and unsupplied (`substitution-identifier`)
- [x] nested property path (`user.id`) — covered inside `bind-variable` and `foreach-list`
- [x] `<selectKey>` kept out of the statement (`select-key`)
- [x] dialect pass-through for all four dialects (`mysql-dialect`, `postgres-dialect`, `sqlserver-dialect`, `oracle-dialect`)
- [x] multi-statement file and duplicate identifiers (`multi-statement`, `duplicate-identifiers`)
- [x] unresolved condition (`unresolved-condition`)
- [x] malformed XML / no statement / oversized input / hostile entities (`malformed-xml`, `no-statement`, `oversized-input`, `hostile-entities`)
- [x] mixed convertibility in one file (`mixed-convertibility`)
- [x] formatting insensitivity (`formatting-invariance`)

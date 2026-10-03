# FEATURE: High-Fidelity MyBatis XML → Pure SQL Normalization Engine

## ROLE

Act as a Senior Backend Engineer, SQL Parser Engineer and MyBatis internals expert

with 10+ years of experience.

You are modifying the MyBatis XML import and SQL extraction pipeline of

SQL Visualizer.

The goal is NOT to simply remove XML tags.

The goal is to build a robust:

    MyBatis XML

        ↓

    MyBatis Semantic Resolution

        ↓

    Pure SQL Normalization

        ↓

    SQL Visualizer Parser

        ↓

    AST / Relationships / CTE / JOIN / Lint / AI

The resulting SQL must contain SQL syntax only.

MyBatis XML syntax, mapper metadata and dynamic-SQL control syntax must not leak

into the final SQL whenever they can be resolved.

---

# PRIMARY OBJECTIVE

When a user uploads a MyBatis Mapper XML file, the system must aggressively

convert the relevant mapped SQL statements into clean SQL.

Example input:

\<select id="findOrders" resultType="Order">

    SELECT

        o.id,

        o.order_no,

        o.status

    FROM orders o

    \<where>

        \<if test="status != null">

            AND o.status = #{status}

        \</if>

        \<if test="startDate != null">

            AND o.created_at &gt;= #{startDate}

        \</if>

        \<if test="endDate != null">

            AND o.created_at &lt;= #{endDate}

        \</if>

    \</where>

\</select>

The final SQL should NOT contain:

\<select>

\<where>

\<if>

test=

resultType=

parameterType=

\#{...}

Instead, it should become something conceptually equivalent to:

SELECT

    o.id,

    o.order_no,

    o.status

FROM orders o

WHERE

    o.status = \<resolved parameter>

    AND o.created_at >= \<resolved parameter>

    AND o.created_at <= \<resolved parameter>;

The exact parameter representation must follow the existing SQL Visualizer

parameter-resolution architecture.

---

# CRITICAL PRINCIPLE

DO NOT IMPLEMENT THIS FEATURE AS:

    XML string

        ↓

    Regex

        ↓

    Remove \<tags>

        ↓

    SQL

This is explicitly forbidden.

MyBatis dynamic SQL has semantic behavior.

The implementation must parse the XML structurally and process MyBatis constructs

according to their semantics.

MyBatis itself parses dynamic SQL into SqlNode structures and supports handlers for:

- trim

- where

- set

- foreach

- if

- choose

- when

- otherwise

- bind

and resolves \<include> fragments before SQL statement parsing.

The implementation should model these semantics rather than treating them as

ordinary XML tags.

---

# OFFICIAL MYBATIS SEMANTICS TO PRESERVE

The implementation must be compatible with the documented MyBatis behavior.

MyBatis supports dynamic SQL elements including:

- \<if>

- \<choose>

- \<when>

- \<otherwise>

- \<trim>

- \<where>

- \<set>

- \<foreach>

- \<bind>

MyBatis also supports reusable SQL fragments:

- \<sql>

- \<include>

The implementation must preserve the SQL semantics represented by these

constructs.

Do not invent alternative semantics when MyBatis behavior is known.

---

# SUPPORTED MAPPER ROOT STATEMENTS

The parser must identify mapped SQL statements:

- \<select>

- \<insert>

- \<update>

- \<delete>

The statement metadata itself must NOT appear in the generated SQL.

For example:

\<select

    id="findUser"

    parameterType="User"

    resultType="User"

    useCache="true">

must produce only the SQL body.

Do NOT output:

\<select>

id=

parameterType=

resultType=

useCache=

resultMap=

flushCache=

timeout=

etc.

---

# ELEMENTS THAT MUST NOT LEAK INTO SQL

The final SQL must never contain MyBatis mapper metadata such as:

- select

- insert

- update

- delete

- resultMap

- resultType

- parameterType

- statementType

- useGeneratedKeys

- keyProperty

- keyColumn

- timeout

- flushCache

- useCache

- databaseId

- lang

These are mapper metadata, not SQL syntax.

---

# SQL FRAGMENTS: \<sql> + \<include>

This is a critical requirement.

MyBatis allows reusable SQL fragments:

\<sql id="userColumns">

    ${alias}.id,

    ${alias}.username,

    ${alias}.password

\</sql>

and:

\<include refid="userColumns">

    \<property name="alias" value="u"/>

\</include>

The implementation must resolve includes.

Conceptually:

\<include refid="userColumns"/>

must become the actual SQL fragment content.

Do NOT leave:

\<include ...>

in the final SQL.

---

# INCLUDE RESOLUTION

Implement recursive include resolution.

Support:

1. Local fragment references.

2. Namespace-qualified references.

3. Nested includes.

4. Include fragments containing dynamic SQL.

5. Include fragments containing other includes.

6. Include properties.

7. Property substitution inside included fragments.

8. Nested property substitution.

Example:

\<sql id="baseColumns">

    ${alias}.id,

    ${alias}.name

\</sql>

\<sql id="userQuery">

    SELECT

        \<include refid="baseColumns">

            \<property name="alias" value="u"/>

        \</include>

    FROM users u

\</sql>

must become:

SELECT

    u.id,

    u.name

FROM users u

Do not merely remove the include tag.

---

# INCLUDE CYCLE PROTECTION

Detect recursive/cyclic includes.

Example:

A → B

B → C

C → A

Do NOT enter infinite recursion.

Return a controlled parser error/warning.

The error should identify the include chain.

Example:

Include cycle detected:

A → B → C → A

The application must remain stable.

---

# \<IF>

Implement semantic handling of:

\<if test="...">

    SQL

\</if>

If the existing parameter-resolution system can evaluate the condition:

- evaluate it

- include the SQL only when the condition is true

Example:

\<if test="status != null">

    AND status = #{status}

\</if>

If status exists:

AND status = \<value>

If status is null:

nothing is emitted.

Do NOT output:

\<if test="status != null">

...

\</if>

Do NOT output the test expression as SQL.

---

# OGNL EXPRESSIONS

MyBatis uses OGNL-style expressions for dynamic conditions.

Support the expressions that can be safely evaluated by the current application

parameter model.

At minimum support common patterns such as:

status != null

status == null

status != ''

status == ''

user != null

user.id != null

startDate != null and endDate != null

status != null or type != null

collection != null and collection.size() > 0

Do NOT implement a fake evaluator that blindly evaluates arbitrary JavaScript.

Do NOT use eval().

Do NOT execute arbitrary code from uploaded XML.

The expression evaluator must be safe.

---

# UNSUPPORTED / UNRESOLVED OGNL

If an expression cannot be safely evaluated:

DO NOT guess.

DO NOT silently include or remove the SQL.

DO NOT corrupt the SQL.

Return structured resolution metadata such as:

{

    type: "UNRESOLVED_DYNAMIC_CONDITION",

    expression: "...",

    location: ...

}

The UI may then decide whether to:

- request a parameter value

- use an explicit fallback

- show a warning

- preserve the branch for analysis

The important requirement is:

NEVER silently produce incorrect SQL.

---

# \<CHOOSE> / \<WHEN> / \<OTHERWISE>

Implement:

\<choose>

    \<when test="...">

        SQL A

    \</when>

    \<when test="...">

        SQL B

    \</when>

    \<otherwise>

        SQL C

    \</otherwise>

\</choose>

Semantics:

- Evaluate \<when> conditions in order.

- Select the first matching branch.

- If no branch matches, use \<otherwise>.

- If no branch matches and no otherwise exists, emit nothing.

Never concatenate all branches.

Example:

\<choose>

    \<when test="status != null">

        AND status = #{status}

    \</when>

    \<when test="type != null">

        AND type = #{type}

    \</when>

    \<otherwise>

        AND active = 1

    \</otherwise>

\</choose>

must produce exactly ONE branch.

---

# \<WHERE>

Implement the semantic behavior of:

\<where>

    ...

\</where>

The resulting SQL should:

1. Add WHERE only when content exists.

2. Remove leading AND.

3. Remove leading OR.

4. Preserve valid SQL expressions.

Example:

\<where>

    \<if test="a != null">

        AND a = #{a}

    \</if>

    \<if test="b != null">

        AND b = #{b}

    \</if>

\</where>

becomes:

WHERE

    a = \<value>

    AND b = \<value>

If no dynamic condition produces SQL:

DO NOT output:

WHERE

The entire WHERE clause should disappear.

---

# \<SET>

Implement the semantic behavior of:

\<set>

    ...

\</set>

The resulting SQL should:

1. Add SET only when assignments exist.

2. Remove unnecessary trailing commas.

3. Preserve valid assignments.

Example:

\<set>

    \<if test="name != null">

        name = #{name},

    \</if>

    \<if test="email != null">

        email = #{email},

    \</if>

\</set>

becomes:

SET

    name = \<value>,

    email = \<value>

No trailing comma.

If no assignments exist, do not emit:

SET

---

# \<TRIM>

Support:

\<trim

    prefix="..."

    prefixOverrides="..."

    suffix="..."

    suffixOverrides="...">

    SQL

\</trim>

Apply the same semantics as MyBatis:

1. Build child SQL.

2. Trim configured prefix/suffix patterns.

3. Apply prefix.

4. Apply suffix.

Whitespace-sensitive behavior must be respected.

Do not simplify trim handling into naive string replacement.

---

# \<FOREACH>

This is another critical requirement.

Support:

\<foreach

    collection="ids"

    item="id"

    index="index"

    open="("

    separator=","

    close=")">

    #{id}

\</foreach>

If:

ids = [10, 20, 30]

the resulting SQL should conceptually become:

(

    <10>,

    <20>,

    <30>

)

or the equivalent parameterized representation used by the existing

SQL Visualizer.

Do not leave:

\<foreach>

in the final SQL.

---

# FOREACH WITH PARAMETER RESOLUTION

When a real collection value exists:

Expand the foreach according to:

- collection

- item

- index

- open

- separator

- close

Example:

collection = ["A", "B", "C"]

\<foreach item="item" collection="list"

         open="(" separator="," close=")">

    #{item}

\</foreach>

should produce:

(

    \<A>,

    \<B>,

    \<C>

)

Use the existing parameter resolution mechanism if available.

Do NOT duplicate parameter parsing logic unnecessarily.

---

# FOREACH WITHOUT COLLECTION VALUE

If collection data is unavailable:

DO NOT invent the collection size.

DO NOT assume one element.

DO NOT assume zero elements.

Do NOT silently delete the foreach body.

Instead return structured unresolved metadata.

Example:

{

    type: "UNRESOLVED_FOREACH",

    collection: "ids"

}

Then allow the existing UI/application to decide how to represent it.

If the SQL Visualizer has a safe placeholder representation for unresolved

collections, use that representation.

---

# \<BIND>

Support:

\<bind

    name="pattern"

    value="'%' + title + '%'"/>

The bind variable may subsequently be referenced by:

\#{pattern}

The implementation should resolve the bind expression when safely possible.

Do not output:

\<bind ...>

in SQL.

If the bind expression cannot be evaluated safely, report it as unresolved.

---

# PARAMETER PLACEHOLDERS

MyBatis has two important parameter syntaxes:

\#{property}

and:

${property}

They MUST NOT be treated as equivalent.

---

# #{PROPERTY}

\#{property} represents a prepared-statement parameter in MyBatis.

The final SQL must not contain raw MyBatis syntax:

\#{property}

If the existing SQL Visualizer parameter system has a resolved value:

replace it using the existing safe parameter-literal formatting logic.

Example:

\#{age}

with:

age = 30

may become:

30

or the application's existing SQL literal representation.

If the value is unavailable, use the application's canonical SQL parameter

placeholder representation.

Do NOT invent a new placeholder syntax if the application already has one.

---

# ${PROPERTY}

This is fundamentally different.

MyBatis performs direct string substitution for ${property}.

It can represent dynamic SQL metadata such as:

- table names

- column names

- ORDER BY columns

- SQL fragments

Do NOT treat ${property} as a normal value parameter.

Example:

ORDER BY ${columnName}

If:

columnName = created_at

then:

ORDER BY created_at

If the value is unavailable:

DO NOT silently convert it to:

ORDER BY ?

because that changes SQL semantics.

Instead:

- preserve a safe symbolic placeholder if supported by the parser

- or mark the SQL as unresolved dynamic SQL

The final SQL must never contain raw MyBatis \`${...}\` syntax if the goal is

pure SQL output.

---

# SECURITY: ${...}

Never evaluate arbitrary uploaded XML expressions.

Never execute JavaScript.

Never execute Java.

Never execute arbitrary OGNL.

Never allow an uploaded XML file to execute code.

Treat all XML content as untrusted input.

---

# XML / CDATA HANDLING

Support SQL inside:

\<![CDATA[

    SELECT \*

    FROM users

    WHERE name LIKE '\<value>'

]]>

CDATA is an XML representation mechanism.

It must NOT appear in the final SQL.

The content inside CDATA must be preserved as SQL text.

Example:

\<![CDATA[

    WHERE created_at >= #{startDate}

]]>

becomes:

WHERE created_at >= \<resolved parameter>

---

# XML ENTITY DECODING

Decode XML entities correctly.

Examples:

&gt; → >

&lt; → <

&amp; → &

&quot; → "

&apos; → '

Do this as part of XML parsing.

Do NOT use naive string replacements that could corrupt SQL literals.

For example:

'Tom &amp; Jerry'

must become:

'Tom & Jerry'

while preserving the SQL string literal.

---

# XML COMMENTS

Remove MyBatis/XML comments from the resulting SQL when they are not SQL.

Example:

\<!-- This query retrieves active users -->

must disappear.

However, preserve SQL comments when they are part of the SQL text.

Especially preserve SQL optimizer hints and database-specific SQL comments when

they can affect SQL behavior.

Examples that may need preservation:

/\*+ INDEX(...) \*/

/\*+ PARALLEL(...) \*/

Do not blindly remove all /\* ... \*/ comments.

Distinguish XML comments from SQL comments.

---

# NON-SQL MAPPER ELEMENTS

The following should not appear in final SQL:

- resultMap

- id

- result

- association

- collection

- constructor

- discriminator

- cache

- cache-ref

- parameterMap

- selectKey metadata

For example:

\<resultMap id="userMap" type="User">

    \<id property="id" column="id"/>

    \<result property="name" column="name"/>

\</resultMap>

must NOT contribute XML syntax to the SQL.

It is mapping metadata.

---

# SELECTKEY

Handle \<selectKey> separately.

Example:

\<insert id="insertUser">

    \<selectKey keyProperty="id" resultType="int" order="BEFORE">

        SELECT sequence.nextval FROM dual

    \</selectKey>

    INSERT INTO users (...)

    VALUES (...)

\</insert>

Do NOT blindly concatenate the selectKey SQL with the INSERT SQL.

The main statement and selectKey represent separate SQL operations.

The parser should either:

1. Represent them separately in the internal model, or

2. Ignore selectKey when generating the main SQL visualization

according to the existing SQL Visualizer architecture.

Do not produce an invalid combined SQL statement.

---

# DATABASE-SPECIFIC SQL

Do NOT normalize away valid dialect-specific syntax.

The application supports:

- MySQL

- PostgreSQL

- SQL Server

- Oracle

Examples:

Oracle:

CONNECT BY

START WITH

DUAL

/\*+ hints \*/

SQL Server:

TOP

OUTPUT

WITH (...) 

PostgreSQL:

RETURNING

ILIKE

\::type

MySQL:

LIMIT

STRAIGHT_JOIN

ON DUPLICATE KEY UPDATE

These are SQL syntax, not MyBatis syntax.

Preserve them.

---

\# DO NOT OVER-NORMALIZE SQL

"Remove MyBatis syntax" *does* *NOT* *mean:*

*-* *rewrite* *SQL*

*-* *optimize* *SQL*

*-* *reorder* *SQL*

*-* *change* *JOINs*

*-* *change* *conditions*

*-* *rename* *aliases*

*-* *change* *identifiers*

*-* *change* *capitalization*

*-* *rewrite* *dialect-specific* *syntax*

*-* *simplify* *expressions*

*The* *converter's* *responsibility* *is:*

*MyBatis* *SQL* *representation*

        *↓*

*Equivalent* *SQL* *representation*

*NOT:*

*MyBatis* *SQL*

        *↓*

*"Better* *SQL"*

*SQL* *optimization* *belongs* *to* *another* *feature.*

---

# WHITESPACE NORMALIZATION

After semantic resolution, normalize whitespace carefully.

Target:

- remove excessive blank lines

- collapse unnecessary whitespace

- preserve meaningful spaces

- preserve string literals

- preserve quoted identifiers

- preserve SQL comments/hints

- preserve formatting required by SQL syntax

Do NOT blindly run:

string.replace(/\s+/g, ' ')

because whitespace inside SQL string literals can be meaningful.

Example:

'hello     world'

must remain:

'hello     world'

---

\# SQL LITERAL SAFETY

Parameter literal generation must be dialect-aware.

For example*:*

String*:*

'hello'

Number*:*

123

Boolean*:*

dialect-specific representation

Date*:*

dialect-specific representation

NULL*:*

NULL

Never generate invalid SQL literals.

Do not use JSON.stringify blindly for SQL values.

Use the existing SQL literal formatter if one already exists.

---

# PARAMETER TYPES

The parameter resolver should understand, where possible:

- string

- number

- boolean

- null

- date

- datetime

- arrays

- objects

- nested properties

Nested:

user.id

user.profile.name

should be resolvable when the parameter model contains the corresponding

structure.

---

\# FINAL OUTPUT CONTRACT

The converter should return more than a string internally.

Use a structured result.

Conceptually*:*

{

    statementId*:* "...",

    statementType*:* "select",

    sql*:* "...",

    parameters*:* [...],

    warnings*:* [...],

    unresolvedDynamics*:* [...],

    sourceMap*:* [...]

}

At minimum*:*

- resolved SQL

- detected parameters

- unresolved dynamic constructs

- warnings

- source mapping if feasible

The UI may use this information later.

---

# SOURCE MAP

If practical, maintain a source mapping between generated SQL and MyBatis XML.

Example:

Generated:

WHERE status = ?

maps to:

\<if test="status != null">

    AND status = #{status}

\</if>

This is highly valuable for the SQL Visualizer.

It will allow future features such as:

"Go to MyBatis source"

from a SQL finding.

Do not sacrifice correctness to implement source maps in the first iteration,

but design the internal model so source mapping can be added.

---

\# MULTIPLE STATEMENTS

A single Mapper XML file may contain many mapped statements.

Do NOT concatenate unrelated statements.

Example*:*

\<select id="findUsers">

...

\</select>

\<select id="findOrders">

...

\</select>

must become two independent SQL statements.

The internal representation should resemble:

[

    {

        id: "findUsers",

        type: "select",

        sql: "..."

    },

    {

        id: "findOrders",

        type: "select",

        sql: "..."

    }

]

The existing UI may allow the user to select which statement should be analyzed.

---

# STATEMENT IDENTIFICATION

Preserve metadata internally:

- namespace

- statement id

- statement type

- source file

- source location

BUT do not put this metadata into the generated SQL.

Example:

Internal:

{

    namespace: "com.example.OrderMapper",

    id: "findOrders",

    type: "select"

}

SQL:

SELECT ...

FROM ...

---

\# MULTI-DIALECT SUPPORT

The converter must NOT assume that all MyBatis XML SQL is ANSI SQL.

The SQL dialect selected in SQL Visualizer should be preserved.

The MyBatis conversion layer should primarily remove MyBatis constructs.

The downstream SQL parser should remain responsible for dialect-specific SQL

analysis.

Pipeline*:*

MyBatis XML

    ↓

MyBatis semantic normalization

    ↓

Pure SQL

    ↓

Selected SQL dialect parser

    ↓

AST

    ↓

Visualization / lint / AI

---

# ARCHITECTURE

Do not put the entire conversion algorithm into the UI component.

Create a dedicated conversion layer.

Conceptually:

MyBatis XML Input

       ↓

XML Parser

       ↓

Mapper Model

       ↓

Include Resolver

       ↓

Dynamic SQL Evaluator

       ↓

Parameter Resolver

       ↓

SQL Normalizer

       ↓

Pure SQL Result

       ↓

Existing SQL Analyzer

Do not mix:

- XML parsing

- React state

- UI rendering

- SQL analysis

into one component.

---

\# IMPORTANT: REUSE EXISTING PARAMETER SYSTEM

Before implementing anything, inspect the existing MyBatis parameter extraction

and SQL resolution logic.

If the current application already has*:*

- parameter extraction

- parameter configuration

- value resolution

- resolved SQL generation

do NOT create a competing parameter system.

Refactor the existing logic into reusable services if necessary.

The final architecture should have one source of truth for parameter resolution.

---

# PRESERVE EXISTING USER EXPERIENCE

The current MyBatis workflow must remain available:

1. Upload MyBatis XML.

2. Detect parameters.

3. Configure parameters.

4. Resolve SQL.

5. Analyze SQL.

The improvement is the QUALITY of conversion.

Do not remove the existing workflow.

---

\# EXPECTED TRANSFORMATION

Input:

\<mapper namespace="com.example.OrderMapper"*>*

    *<*sql id="baseColumns"*>*

        *o*.id*,*

        *o*.order_no*,*

        *o*.status*,*

        *o*.created_a*t*

    *<*/sql*>*

    *<*select id="findOrders"*>*

        *S*ELEC*T*

            *<*include refid="baseColumns"/*>*

        *F*ROM orders *o*

        *<*where*>*

            *<*if test="status != null"*>*

                *A*ND o.status = #{status}

            *\</if>*

            *\<if* *test="startDate* *!=* *null">*

                *AND* *o.created_at* *&gt;=* #{startDate}

            *\</if>*

            *\<if* *test="endDate* *!=* *null">*

                *AND* *o.created_at* *&lt;=* #{endDate}

            *\</if>*

        *\</where>*

        *\<choose>*

            *\<when* *test="sortBy* *==* *'createdAt'">*

                *ORDER* *BY* *o.created_at* *DESC*

            *\</when>*

            *\<otherwise>*

                *ORDER* *BY* *o.id* *DESC*

            *\</otherwise>*

        *\</choose>*

    *\</select>*

\</mapper*>*

With:

status = 'ACTIVE*'*

startDate = '2026-01-01*'*

endDate = '2026-12-31*'*

sortBy = 'createdAt*'*

the generated SQL should conceptually be:

SELEC*T*

    *o*.id*,*

    *o*.order_no*,*

    *o*.status*,*

    *o*.created_a*t*

FROM orders *o*

WHER*E*

    *o*.status = 'ACTIVE*'*

    *A*ND o.created_at >= '2026-01-01*'*

    *A*ND o.created_at <= '2026-12-31*'*

ORDER BY o.created_at DES*C*

There must be:

NO:

\<mapper*>*

\<sql*>*

\<select*>*

\<where*>*

\<if*>*

\<choose*>*

\<when*>*

\<otherwise*>*

\#{...}

${...*}*

test*=*

resultType*=*

parameterType*=*

in the final SQL*.*

---

# IMPORTANT EDGE CASES

Create tests for all of the following.

## Basic

- plain SELECT

- INSERT

- UPDATE

- DELETE

## XML

- CDATA

- escaped operators

- XML comments

- whitespace

- nested XML elements

## Dynamic SQL

- if

- nested if

- choose

- when

- otherwise

- where

- set

- trim

- foreach

- bind

## Include

- simple include

- nested include

- namespace include

- include properties

- include with dynamic SQL

- include cycle

## Parameters

- #{id}

- #{user.id}

- #{name,jdbcType=VARCHAR}

- ${column}

- missing parameter

- null parameter

- empty string

- array

- list

- nested object

## Foreach

- empty list

- one element

- multiple elements

- nested foreach

- index

- item

- custom separator

- custom open/close

## Choose

- first condition matches

- second condition matches

- otherwise

- no branch matches

## Where

- zero conditions

- one condition

- multiple conditions

- leading AND

- leading OR

## Set

- zero assignments

- one assignment

- multiple assignments

- trailing comma

## Dialects

- MySQL

- PostgreSQL

- SQL Server

- Oracle

---

\# GOLDEN TEST STRATEGY

Do not rely only on unit tests for individual tags.

Create realistic Mapper XML fixtures.

For each fixture*:*

Input*:*

    fixture.xml

Parameters*:*

    fixture-params.json

Expected SQL*:*

    fixture.expected.sql

The test should compare the generated SQL against the expected normalized SQL.

Create at least*:*

1. simple-select.xml

2. dynamic-where.xml

3. choose.xml

4. foreach.xml

5. include.xml

6. nested-include.xml

7. bind.xml

8. update-set.xml

9. trim.xml

10. cdata.xml

11. sql-server.xml

12. postgres.xml

13. oracle.xml

14. mysql.xml

15. complex-real-world-mybatis.xml

---

# REGRESSION TEST

The current example shown in the SQL Visualizer UI must continue to produce valid

SQL after conversion.

The existing SQL analysis pipeline must receive PURE SQL rather than MyBatis XML.

Verify:

MyBatis XML

    ↓

Pure SQL

    ↓

SQL parser

    ↓

AST

    ↓

JOIN analysis

    ↓

CTE analysis

    ↓

complexity

    ↓

lint

    ↓

AI

No stage after the converter should need to understand MyBatis XML.

---

\# FAILURE POLICY

The most important rule:

\## NEVER silently generate incorrect SQL.

If conversion is ambiguous:

return:

- best-effort SQL only if semantics remain correct

- structured warning

- unresolved dynamic metadata

Do not silently:

- remove a condition

- add a condition

- choose a random \<when>

- assume a collection length

- replace ${table} with ?

- replace unresolved identifiers with fake names

Correctness is more important than producing SQL at all costs*.*

---

# PERFORMANCE

Do not parse the same XML repeatedly.

For a single uploaded file:

1. Parse XML once.

2. Build mapper model once.

3. Resolve includes once where possible.

4. Cache reusable SQL fragments.

5. Evaluate selected statement only when possible.

Do not introduce unnecessary O(n²) tree traversal.

Protect against:

- deeply nested includes

- huge XML files

- recursive includes

- enormous foreach collections

Set safe limits where appropriate.

---

\# SECURITY

The uploaded XML is untrusted input.

Protect against*:*

- XXE

- external entity resolution

- entity expansion attacks

- recursive includes

- pathological XML size

- arbitrary code execution

- OGNL code execution

- JavaScript eval

- prototype pollution

The XML parser must use safe parsing configuration.

Never execute code from*:*

- test=

- value=

- ${...}

- bind

- include properties

---

# IMPLEMENTATION PROCESS

DO NOT immediately modify code.

First inspect the current codebase.

Find:

1. MyBatis XML upload component.

2. XML parsing implementation.

3. Parameter extraction.

4. Parameter configuration.

5. SQL resolution.

6. Resolved SQL editor.

7. Existing SQL parser.

8. SQL dialect handling.

9. Zustand state.

10. Tests.

11. Existing utility functions.

12. Existing i18n.

Then produce:

## A. Current architecture

Explain the existing MyBatis pipeline.

## B. Current problems

Identify where XML/MyBatis syntax currently leaks into SQL.

## C. Proposed architecture

Show:

XML

→ Mapper AST

→ Include Resolver

→ Dynamic Evaluator

→ Parameter Resolver

→ SQL Normalizer

→ Pure SQL

→ Existing SQL Analyzer

## D. Files

List:

- files to modify

- files to create

## E. Migration strategy

Explain how to integrate the new converter without breaking the current workflow.

DO NOT implement until this analysis is complete.

---

\# TDD REQUIREMENT

Follow TDD strictly.

For each semantic feature*:*

1. Write a failing test.

2. Implement the minimum code required.

3. Make the test pass.

4. Refactor.

5. Add edge cases.

Recommended implementation order*:*

1. XML mapper extraction

2. statement extraction

3. plain SQL text extraction

4. CDATA

5. XML entity handling

6. parameter placeholders

7. include resolution

8. include properties

9. if

10. choose / when / otherwise

11. where

12. set

13. trim

14. foreach

15. bind

16. unresolved dynamic handling

17. SQL normalization

18. dialect regression tests

19. integration with existing SQL analyzer

---

# ACCEPTANCE CRITERIA

The feature is complete only when:

- [ ] MyBatis XML is parsed structurally.

- [ ] Regex-only XML stripping is NOT used as the primary conversion mechanism.

- [ ] SELECT/INSERT/UPDATE/DELETE statements are extracted.

- [ ] Mapper metadata is removed.

- [ ] SQL fragments are resolved.

- [ ] Includes are resolved recursively.

- [ ] Include properties are resolved.

- [ ] Include cycles are detected.

- [ ] if conditions are evaluated safely.

- [ ] choose/when/otherwise semantics work.

- [ ] where semantics work.

- [ ] set semantics work.

- [ ] trim semantics work.

- [ ] foreach semantics work when collection values are available.

- [ ] unresolved foreach is handled safely.

- [ ] bind is handled safely.

- [ ] #{...} does not leak into final SQL.

- [ ] ${...} does not leak into final SQL.

- [ ] XML comments do not leak.

- [ ] SQL comments/hints are preserved when semantically meaningful.

- [ ] CDATA is removed while SQL content is preserved.

- [ ] XML entities are decoded correctly.

- [ ] string literals are not corrupted.

- [ ] dialect-specific SQL is preserved.

- [ ] multiple mapped statements remain separate.

- [ ] selectKey is not incorrectly concatenated with main SQL.

- [ ] no arbitrary code execution is possible.

- [ ] XXE is prevented.

- [ ] existing parameter configuration workflow still works.

- [ ] existing SQL analysis still works.

- [ ] existing UI still works.

- [ ] existing features are not removed.

- [ ] regression tests pass.

---

\# FINAL PRINCIPLE

The output of the MyBatis conversion layer must satisfy:

        "If I give this output directly to the existing SQL parser,

         the parser should have NO knowledge that the original input

         came from MyBatis."

This is the core requirement*.*

MyBatis is an INPUT FORMAT*.*

SQL is the OUTPUT FORMAT*.*

The MyBatis implementation details must disappear before SQL analysis begins*.*

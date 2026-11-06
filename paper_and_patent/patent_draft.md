# FORM 2
THE PATENTS ACT, 1970 (39 of 1970)
&
THE PATENTS RULES, 2003

## COMPLETE SPECIFICATION
(See section 10 and rule 13)

---

### 1. TITLE OF THE INVENTION
**A SYSTEM AND COMPUTER-IMPLEMENTED METHOD FOR COLLATION-AWARE SEMANTIC QUERY REWRITE VERIFICATION AND FAIL-CLOSED AST EXECUTION SANDBOXING IN RELATIONAL DATABASES**

---

### 2. APPLICANT(S)
* **Name:** Shubham Patil
* **Nationality:** Indian
* **Address:** Academic Research Laboratory, Department of Computer Science and Engineering

---

### 3. PREAMBLE TO THE DESCRIPTION
The following specification particularly describes the invention and the manner in which it is to be performed:

---

### 4. FIELD OF THE INVENTION
The present invention relates generally to database management systems (DBMS), relational query optimization architectures, and application security sandboxing frameworks. More specifically, the present invention relates to a computer-implemented method and system for:
1. Validating semantic equivalence of search-argumentable (SARGable) relational query rewrites with character-set and column-collation awareness;
2. Enforcing fail-closed Abstract Syntax Tree (AST) policy sandboxing over recursive Common Table Expressions (CTEs), multi-statement chained commands, and timing side-channel operations;
3. Executing truthful server-side query cancellation by synchronizing asynchronous application watchdogs with underlying database kernel thread identifiers; and
4. Isolating automated benchmark namespaces via dynamic entropy-seeded schemas and fail-closed teardown boundary verifications.

---

### 5. BACKGROUND OF THE INVENTION AND PRIOR ART DEFICIENCIES
In modern relational database management systems and AI-assisted database developer platforms, query optimization is predominantly performed via heuristic rule engines or learned cost estimators. A core optimization objective involves converting non-search-argumentable (non-SARGable) queries into SARGable queries that leverage existing B-Tree index structures rather than triggering expensive sequential table scans.

For example, when a query filters an attribute through a casing function, such as:
$$\sigma_{\text{LOWER}(c) = \text{'active'}}(R)$$
conventional heuristic optimizers strip the scalar function and transform the query into:
$$\sigma_{c = \text{'active'}}(R)$$
thereby allowing the relational storage engine (such as MySQL InnoDB) to utilize a secondary index on attribute $c$.

#### Deficiencies in Prior Art:
1. **Collation Blindness and Silent Data Loss:** Prior art heuristic transformation layers exist as external middleware detached from physical catalog metadata. When executed against columns defined with binary or case-sensitive collations (e.g., `utf8mb4_bin` or `latin1_general_cs`), the syntactic equality check $c = \text{'active'}$ performs exact byte-level matching. Consequently, tuples possessing mixed-case tokens (e.g., `'Active'`, `'ACTIVE'`) that were returned by the original query are omitted from the result set of the transformed query. This results in silent, unnotified analytical divergence and data corruption.
2. **Superficial Lexical Sandboxing:** Interactive and educational database platforms frequently expose direct SQL execution sandboxes to end users. Conventionally, security is enforced via regular expression token matching or query prefix checks (e.g., verifying whether a query begins with the string `"SELECT"`). Malicious or unintended operations readily evade such filters through Common Table Expressions (CTEs) executing data mutations (e.g., `WITH cte AS (SELECT 1) UPDATE users SET ...`), chained multiple statements separated by semicolons, or filesystem exfiltration clauses (`INTO OUTFILE`).
3. **Untruthful Query Cancellation:** Asynchronous database client drivers (e.g., Node.js database pools) frequently implement client-side timeout races. When an execution timer expires, the application drops the socket listener and reports to the client that the query was aborted. In reality, the database server engine continues executing the query (such as a Cartesian product join) indefinitely, consuming database buffer pool and CPU resources, which can lead to server exhaustion and denial of service.
4. **Destructive Benchmark Cleanup Hazards:** Automated regression benchmarking systems frequently operate against fixed database schemas or execute unconstrained `DROP DATABASE IF EXISTS` commands upon teardown. In scenarios involving configuration errors or name collisions, automated scripts risk deleting active application or production databases.

Hence, there exists a critical need for an integrated system and method that enforces catalog-aware collation gating, AST-level fail-closed structural sandboxing, truthful server-side thread termination, and strictly verified benchmark isolation.

---

### 6. OBJECTS OF THE INVENTION
The principal object of the present invention is to provide a computer-implemented method and system that audits and enforces semantic equivalence in relational query rewrites by actively cross-referencing underlying column collation metadata.

Another object of the present invention is to provide an Abstract Syntax Tree (AST) policy engine that deterministically parses incoming SQL statements, authorizes read-only Common Table Expressions, and suppresses mutating CTEs, stacked commands, and out-of-band disk exfiltration attempts.

Yet another object of the present invention is to provide a dual-connection query execution watchdog that binds client-side timeout counters to database engine kernel thread identifiers (`threadId`), issuing atomic `KILL QUERY` statements upon timeout and truthfully reporting cancellation status.

A further object of the present invention is to provide a dynamic disposable namespace isolation mechanism that prevents benchmark execution from pre-existing schema collisions and guarantees fail-closed teardown.

---

### 7. SUMMARY OF THE INVENTION
The present invention provides a novel, fail-closed architecture for database management, query optimization, and execution sandboxing.

According to a primary embodiment of the present invention, there is provided a computer-implemented method for collation-aware semantic query rewrite verification and execution sandboxing, comprising:
1. Intercepting a candidate relational query $Q_{\text{orig}}$ and a proposed syntactic rewrite $Q_{\text{trans}}$;
2. Querying database catalog metadata (`information_schema.columns`) to determine the collation $\text{Coll}(A)$ of attributes referenced in the query predicate;
3. Evaluating whether $\text{Coll}(A)$ belongs to a predetermined set of case-sensitive or binary collations, and if true, suppressing the proposed rewrite and flagging a semantic divergence hazard;
4. If $\text{Coll}(A)$ is case-insensitive, executing both $Q_{\text{orig}}$ and $Q_{\text{trans}}$ against an isolated synthetic dataset, canonically sorting resulting tuples, and certifying semantic equivalence only when canonicalized JSON representations match identically;
5. Parsing all user queries via an Abstract Syntax Tree (AST) processor into a formal structural graph $\mathcal{T}$, verifying that $|\mathcal{T}| = 1$, confirming that all root and CTE clauses are strictly read-only expressions, and neutralizing dangerous diagnostic functions (`SLEEP`, `BENCHMARK`, `LOAD_FILE`);
6. Executing authorized queries through a dual-connection watchdog wherein the worker connection thread identifier $\tau = \text{threadId}$ is bound to a timer $\Delta t$, and upon expiration of $\Delta t$, leasing an independent administrative connection to issue $\text{KILL QUERY } \tau$, verifying receipt of an interruption code (`ER_QUERY_INTERRUPTED`) before reporting cancellation.

---

### 8. BRIEF DESCRIPTION OF THE ACCOMPANYING DRAWINGS
The accompanying drawings illustrate embodiments of the invention and together with the description serve to explain the principles of the invention:

* **FIGURE 1** illustrates the overall multi-tier system architecture (100) of DBMS-Studio, showing the interaction between the presentation layer (110), application server (120), AST policy sandbox (130), collation engine (140), watchdog controller (150), and relational database engine (160).
* **FIGURE 2** illustrates a block diagram and operational sequence flow (200) of the dual-connection truthful query cancellation watchdog according to an embodiment of the present invention.
* **FIGURE 3** illustrates a comparative chart (300) demonstrating collation-induced semantic divergence in SARGable rewrites across case-insensitive (`utf8mb4_general_ci`) and binary (`utf8mb4_bin`) collations.
* **FIGURE 4** illustrates a state transition diagram (400) of the disposable benchmark namespace lifecycle and fail-closed cleanup boundary assertions.

---

### 9. DETAILED DESCRIPTION OF THE PREFERRED EMBODIMENTS
Referring now to the drawings, detailed descriptions of specific embodiments are provided.

#### 1. System Architecture (FIGURE 1)
Referring to **FIGURE 1**, the system architecture (100) comprises:
* A client device (110) executing an interactive React 18 user interface;
* An application server (120) executing an Express.js orchestration layer;
* An Abstract Syntax Tree (AST) policy sandbox (130);
* A collation verification engine (140);
* A truthful watchdog monitor (150); and
* A relational database storage engine (160), specifically MySQL 8.0.46 maintaining an InnoDB buffer pool and an active kernel process list.

#### 2. Collation-Aware Semantic Rewrite Verification Engine (FIGURE 3)
In accordance with an embodiment, when an optimization advisor evaluates an expression such as $\text{LOWER}(c) = \text{'val'}$ on table $R$, the system queries the schema catalog:
```sql
SELECT COLLATION_NAME, DATA_TYPE 
FROM information_schema.columns 
WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?;
```
If `COLLATION_NAME` is a binary or case-sensitive collation (e.g., `utf8mb4_bin`, `utf8mb4_0900_bin`, `latin1_bin`), the optimizer halts syntactic transformation. 

To empirically prove semantic equivalence on non-binary columns, the verification module executes both $Q_{\text{orig}}$ and $Q_{\text{trans}}$ on a testbed. The resulting row sets $R_{\text{orig}}$ and $R_{\text{trans}}$ are sorted deterministically using a composite string comparator across all projected attributes. The sorted rows are serialized into canonical JSON arrays:
$$\mathcal{S}_{\text{orig}} = \text{Serialize}(\text{Sort}(R_{\text{orig}}))$$
$$\mathcal{S}_{\text{trans}} = \text{Serialize}(\text{Sort}(R_{\text{trans}}))$$
Semantic equivalence is certified if and only if $\mathcal{S}_{\text{orig}} \equiv \mathcal{S}_{\text{trans}}$ and $|R_{\text{orig}}| = |R_{\text{trans}}|$. If a discrepancy is detected (such as the 128 vs 42 tuple divergence observed in empirical tests on `utf8mb4_bin` illustrated in **FIGURE 3**), the rewrite is marked as non-equivalent, and the system retains the original unflattened query.

#### 3. Fail-Closed AST Policy and CTE Sandboxing
In accordance with another embodiment, the SQL sandboxing engine receives an arbitrary query string from an authenticated client. The string is fed into `node-sql-parser` to generate an Abstract Syntax Tree $\mathcal{T}$.

The AST enforcer executes a multi-phase structural inspection:
1. **Multi-Statement Elimination:** The AST root array is inspected. If $\text{length}(\mathcal{T}) \neq 1$, execution is halted with an error indicating chained statement rejection.
2. **Root Clause Whitelist:** The root node type $\tau_{\text{root}}$ is checked against an immutable whitelist: $\{\texttt{"select"}, \texttt{"show"}, \texttt{"describe"}, \texttt{"explain"}\}$. Any mutation keyword immediately returns an authorization exception.
3. **Common Table Expression (CTE) Inspection:** If the query includes a `WITH` clause:
   * The enforcer iterates through every defined CTE definition $\mathcal{C}_i \in \text{AST.with}$.
   * The sub-AST of each CTE body is traversed to verify that its statement type is strictly $\texttt{"select"}$.
   * The trailing statement consuming the CTEs is inspected to verify that it is strictly $\texttt{"select"}$.
   * If any CTE or outer statement contains an `UPDATE`, `DELETE`, or `INSERT` statement, the query is blocked with code `403 Forbidden`.
4. **Out-of-Band Exfiltration and Side-Channel Filtration:**
   * The parser scans for file export AST nodes: `into.type == "outfile"` or `into.type == "dumpfile"`.
   * The expression walker traverses all function call nodes. If any function name matches `SLEEP`, `BENCHMARK`, or `LOAD_FILE`, the query is rejected.

#### 4. Dual-Connection Server-Side Query Execution Watchdog (FIGURE 2)
In accordance with another embodiment, referring to **FIGURE 2**, the server-side execution manager handles long-running or malicious queries through a kernel-synchronized termination protocol:
1. A connection $C_1$ is leased from the MySQL connection pool.
2. Upon connection acquisition, the internal thread identifier $\tau_1 = C_1.\text{threadId}$ is captured from the socket protocol.
3. The query execution promise is created: $P_{\text{exec}} = C_1.\text{query}(\text{SQL})$.
4. A concurrent timer promise $P_{\text{timer}}$ is instantiated with timeout duration $\Delta t$ (e.g., 5,000 ms).
5. If $P_{\text{exec}}$ resolves prior to $\Delta t$, the timer is cleared, connection $C_1$ is released back to the pool, and results are returned.
6. If $P_{\text{timer}}$ fires before $P_{\text{exec}}$ resolves:
   * The manager leases an independent administrative connection $C_{\text{admin}}$.
   * $C_{\text{admin}}$ transmits an atomic SQL statement:
   $$\text{KILL QUERY } \tau_1;$$
   * Connection $C_1$ intercepts MySQL error `ER_QUERY_INTERRUPTED` (code 1317, SQLSTATE 70100).
   * The watchdog verifies that the error code matches 1317, confirming that the MySQL storage engine interrupted execution.
   * If the administrative connection throws an access-denied or network error during the kill attempt, the system throws a `QueryCancellationError` indicating `cancellationConfirmed: false`, ensuring truthful outcome reporting.

#### 5. Ephemeral Benchmark Isolation and Boundary Verification (FIGURE 4)
In accordance with yet another embodiment, referring to **FIGURE 4**, automated benchmarking executes within an entropy-isolated environment:
1. A unique database identifier is generated:
$$D_{\text{bench}} = \text{"dbms\_studio\_benchmark\_"} \,\|\, \text{Timestamp} \,\|\, \text{RandomToken}$$
2. The system queries $\text{SHOW DATABASES LIKE } D_{\text{bench}}$. If the database already exists, execution aborts immediately (State 450) to protect pre-existing schemas.
3. A state machine `BenchmarkCleanupSession` is initialized with properties:
$$\{\text{databaseName}: D_{\text{bench}}, \; \text{createdByThisRun}: \text{false}, \; \text{isCleanedUp}: \text{false}\}$$
4. Upon successful execution of $\text{CREATE DATABASE } D_{\text{bench}}$, `createdByThisRun` is set to `true` (State 430).
5. In the cleanup phase (State 440), the boundary validator enforces:
   * Target database name must exactly match $D_{\text{bench}}$.
   * Target database name must not match protected system databases (`mysql`, `sys`, `information_schema`, `performance_schema`).
   * `createdByThisRun` must be strictly boolean `true`.
   * `isCleanedUp` must be strictly `false`.
6. Upon successful execution of `DROP DATABASE`, `isCleanedUp` is toggled to `true`. Any subsequent invocation is blocked, preventing duplicate drop operations.

---

### 10. CLAIMS
I claim:

1. A computer-implemented method for verifying semantic equivalence and enforcing fail-closed execution sandboxing in a relational database management system, comprising:
   * receiving, by an application programming interface layer of an application server, a candidate relational query $Q_{\text{orig}}$ and a proposed search-argumentable syntactic query rewrite $Q_{\text{trans}}$;
   * retrieving, from a database schema catalog, column collation metadata $\text{Coll}(A)$ associated with an attribute $A$ referenced in a predicate expression of said candidate query $Q_{\text{orig}}$;
   * evaluating whether said column collation metadata $\text{Coll}(A)$ matches a binary or case-sensitive collation format, and upon determining a match, suppressing issuance of said proposed query rewrite $Q_{\text{trans}}$ and preserving said candidate query $Q_{\text{orig}}$;
   * parsing incoming user SQL statements using an Abstract Syntax Tree (AST) processor into a structural statement tree $\mathcal{T}$;
   * enforcing a cardinality constraint verifying that said statement tree $\mathcal{T}$ contains exactly one root statement, and confirming that said root statement conforms to a predetermined read-only statement whitelist;
   * traversing Common Table Expression (CTE) sub-nodes within statement tree $\mathcal{T}$ and rejecting execution if any CTE sub-node contains a data-modifying operation; and
   * transmitting authorized read-only queries to a relational database server engine under a monitored execution watchdog.

2. The computer-implemented method as claimed in claim 1, wherein when said column collation metadata $\text{Coll}(A)$ indicates a case-insensitive collation, the method further comprises:
   * executing $Q_{\text{orig}}$ and $Q_{\text{trans}}$ against an isolated synthetic relational dataset;
   * canonically sorting resulting row tuples $R_{\text{orig}}$ and $R_{\text{trans}}$ using a deterministic composite comparator across projected attributes;
   * serializing the sorted row tuples into canonical JSON strings; and
   * certifying semantic equivalence only if the canonical JSON strings of $R_{\text{orig}}$ and $R_{\text{trans}}$ match identically and the total row counts $|R_{\text{orig}}|$ and $|R_{\text{trans}}|$ are equal.

3. The computer-implemented method as claimed in claim 1, wherein said AST processor recursively inspects expression nodes to identify and prohibit invocation of timing-based side-channel functions comprising `SLEEP` and `BENCHMARK`, and filesystem exfiltration clauses comprising `INTO OUTFILE` and `INTO DUMPFILE`.

4. The computer-implemented method as claimed in claim 1, wherein said read-only statement whitelist consists of `select`, `show`, `describe`, and `explain` statement types, and wherein any mutation statement comprising `insert`, `update`, `delete`, `drop`, and `alter` triggers an immediate fail-closed rejection.

5. A system for server-side relational query execution and truthful cancellation, comprising:
   * an application server comprising a processor and a memory executing a query management module;
   * a database connection pool maintaining a plurality of persistent socket connections to a relational database engine;
   * an asynchronous execution watchdog module configured to:
     * lease a worker connection $C_1$ from said connection pool to execute a client query;
     * extract a kernel thread identifier $\tau_1 = C_1.\text{threadId}$ directly from a connection socket protocol;
     * initiate an execution timer having a predetermined threshold duration $\Delta t$;
     * upon expiration of duration $\Delta t$ prior to query resolution, lease an independent administrative connection $C_{\text{admin}}$; and
     * transmit via said administrative connection $C_{\text{admin}}$ a server-side termination instruction: $\text{KILL QUERY } \tau_1$.

6. The system as claimed in claim 5, wherein said worker connection $C_1$ intercepts a specific database engine query interruption error code `ER_QUERY_INTERRUPTED` from the database server, and said watchdog module reports a confirmed cancellation state to the client.

7. The system as claimed in claim 5, wherein upon failure of said administrative connection $C_{\text{admin}}$ to execute said termination instruction, said watchdog module flags the cancellation outcome as unconfirmed, preventing the application server from falsely reporting successful server-side query termination.

8. The system as claimed in claim 5, wherein said query management module integrates a schema-aware natural language to SQL (NL2SQL) engine configured to resolve natural language intents into relational schema structures by traversing a foreign key dependency graph, achieving complete join path resolution across multi-table relations.

9. A non-transitory computer-readable storage medium storing instructions that, when executed by one or more processors, cause the one or more processors to perform operations comprising:
   * extracting column collation metadata from a relational schema catalog for predicate attributes of a query;
   * suppressing SARGable predicate syntactic flattening when said column collation metadata corresponds to a binary or case-sensitive collation;
   * decomposing candidate SQL statements into an Abstract Syntax Tree (AST);
   * enforcing a fail-closed execution policy that accepts analytical Common Table Expressions (CTEs) while rejecting data-modifying CTEs, multiple stacked queries, and disk exfiltration commands; and
   * synchronizing asynchronous query timeouts with database engine kernel thread identifiers via dual-connection `KILL QUERY` execution.

10. The non-transitory computer-readable storage medium as claimed in claim 9, wherein the operations further comprise isolating automated regression benchmarks within an ephemeral database schema by:
   * generating a dynamic database name comprising a disposable benchmark prefix, a millisecond timestamp, and an entropy token;
   * executing a pre-existence query against the database engine and failing closed if a database matching said dynamic database name already exists;
   * instantiating a session state object tracking whether the database was created by the active run; and
   * validating cleanup boundaries prior to teardown, wherein a teardown drop command is blocked if session ownership verification is false or if cleanup has already been executed.

---

### 11. ABSTRACT
A system and computer-implemented method are disclosed for collation-aware semantic query rewrite verification and fail-closed AST execution sandboxing in relational databases. The system intercepts candidate queries and proposed SARGable syntactic rewrites, inspecting column collation metadata from the relational catalog. If a binary or case-sensitive collation is identified, syntactic predicate flattening is suppressed to prevent silent tuple loss. For case-insensitive collations, semantic equivalence is certified via deterministic row canonicalization and JSON comparison. An Abstract Syntax Tree (AST) policy engine enforces fail-closed sandboxing by validating single-statement cardinality, permitting read-only Common Table Expressions (CTEs) while blocking mutating CTEs, stacked commands, and out-of-band disk exfiltration. An asynchronous watchdog captures kernel thread identifiers ($\text{threadId}$) and issues administrative `KILL QUERY` commands upon timeout, truthfully reporting cancellation. Disposable benchmark namespaces are isolated via entropy tokens and fail-closed cleanup boundary state machines.

---

Dated this 6th day of November, 2026.

**Shubham Patil**  
(Applicant & Inventor)

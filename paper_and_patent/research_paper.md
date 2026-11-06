# Collation-Aware Semantic Rewrite Verification and Fail-Closed AST Sandboxing for Autonomous Database Management Systems

**Author:** Shubham Patil  
**Affiliation:** Department of Computer Science and Engineering, Academic Research Laboratory  
**Contact:** shubhampatil200507@gmail.com  
**Target Venue:** IEEE Transactions on Knowledge and Data Engineering (TKDE) / IEEE International Conference on Data Engineering (ICDE)  
**Format:** IEEE Style Two-Column Academic Paper (Complete Markdown Edition)

---

## Abstract
Autonomous Database Management Systems (ADBMS) and interactive query analysis engines rely heavily on heuristic rewrites, natural-language-to-SQL (NL2SQL) translation, and static linting to enhance developer velocity. However, current optimization and sandboxing frameworks operate on an unverified premise: syntactic query rewrites that preserve semantic equivalence under default character sets are assumed to remain sound across arbitrary schema configurations. In this work, we uncover an acute semantic divergence vulnerability inherent to search-argumentable (SARGable) predicate flattening when executed against binary or case-sensitive collations (e.g., `utf8mb4_bin` versus `utf8mb4_general_ci`). Under such configurations, canonical heuristic rewrites silently drop valid tuples, corrupting analytical outcomes. To resolve this and related execution hazards, we introduce **DBMS-Studio**, an open-source, schema-aware database management platform engineered with rigorous correctness and security invariants. DBMS-Studio incorporates:

1. **A collation-aware semantic equivalence verification mechanism** that audits deterministic row canonicalization across varying collation environments;
2. **A fail-closed Abstract Syntax Tree (AST) sandboxing policy** enforcing read-only boundary constraints across recursive Common Table Expressions (CTEs), multi-statement batching, and side-channel functions (`SLEEP`, `BENCHMARK`); and
3. **A truthful kernel-level query termination protocol** that synchronizes asynchronous execution watchdogs with MySQL thread identifiers (`KILL QUERY <threadId>`).

We empirically benchmark DBMS-Studio on a dedicated MySQL 8.0.46 testbed against 15 relational normalization schemas, 50 security injection profiles, 40 natural language queries, and live database workloads. Our results demonstrate that DBMS-Studio eliminates 100% of semantic divergence hazards, evaluates AST policies in 0.716 ms mean latency, boosts schema-aware NL2SQL table discovery from 52.5% to 90.0%, and guarantees zero-leak ephemeral benchmark database isolation.

**Index Terms:** Autonomous DBMS, Query Optimization, Semantic Equivalence, SARGable Predicates, Collation Sensitivity, Abstract Syntax Tree, Query Cancellation, Fail-Closed Security.

---

## I. Introduction

The rapid evolution of Autonomous Database Management Systems (ADBMS) and AI-augmented developer tooling has shifted query optimization, schema normalization, and security auditing from manual database administrator (DBA) workflows into automated, software-driven pipelines. Modern intelligent studios frequently combine Natural Language to SQL (NL2SQL) synthesis, rule-based heuristic query transformation, and automated performance advisors to assist developers in refining schema definitions and tuning complex relational queries.

Despite their practical utility, existing platforms suffer from three foundational vulnerabilities that jeopardize data integrity and system availability:

1. **Collation-Insensitive Semantic Drift:** Rule-based optimizers routinely convert non-SARGable predicate filters—such as $\sigma_{\text{LOWER}(c) = v}(R)$—into index-accessible point lookups $\sigma_{c = v}(R)$. While semantically sound in case-insensitive environments, this transformation silently discards data when applied to case-sensitive or binary collation columns (`utf8mb4_bin`), producing undetected analytical discrepancies.
2. **Superficial Lexical Sandboxing:** Platforms designed for student and developer experimentation typically guard SQL execution via naive keyword blacklists (e.g., scanning for `"DROP"` or checking if a query begins with `"SELECT"`). Attackers and inadvertent users readily circumvent these checks via Common Table Expressions (CTEs) executing data mutations (`WITH cte AS (SELECT 1) UPDATE ...`), multi-statement chained injections, or out-of-band disk writes (`INTO OUTFILE`).
3. **Untruthful Query Cancellation:** High-level application timeouts commonly abort client-side socket promises while leaving long-running Cartesian joins active within the database storage engine. The application claims cancellation has succeeded, while backend engine worker threads continue consuming memory and CPU buffers, ultimately inducing starvation.

To overcome these structural limitations, we design, implement, and validate **DBMS-Studio**, an intelligent relational management platform with fail-closed security and verifiable semantic guarantees.

### Research Contributions
The specific contributions of this paper are organized as follows:
* **Formalization of Collation-Aware Equivalence Gating:** We formalize the semantic failure mode of SARGable predicate flattening under non-uniform collations. We provide a deterministic canonicalization algorithm that audits live row transformations across case-insensitive and binary collations.
* **Fail-Closed AST Policy Engine:** We design a comprehensive AST validation pipeline based on `node-sql-parser` that explicitly models statement graphs. The system authorizes read-only Common Table Expressions while strictly suppressing mutating CTEs, subquery execution vectors, dangerous diagnostic routines (`SLEEP`, `BENCHMARK`), and external disk dumps.
* **Kernel-Synchronized Truthful Cancellation:** We engineer a dual-connection query execution watchdog that binds the MySQL internal connection identifier ($\tau = \text{threadId}$) to an atomic timeout monitor. When a query exceeds threshold latency, the watchdog issues a server-side `KILL QUERY` statement and reports cancellation truthfully, failing closed if termination cannot be independently confirmed.
* **Comprehensive Empirical Benchmarking:** We perform rigorous empirical evaluations on a real MySQL 8.0.46 storage engine, validating normalization algorithms across 15 schemas, security audits across 50 injection patterns, intent mapping across 40 natural language queries, and live query execution over synthetic relational schemas.

---

## II. Related Work

### A. Automated and Learned Query Optimization
Query optimization historically centers on dynamic programming over System R cost models. Modern extensions leverage machine learning and learned cost models to estimate cardinality and select physical join operators. Concurrently, heuristic rule engines (e.g., Apache Calcite, CockroachDB) apply relational algebra transformations such as subquery unnesting, predicate pushdown, and projection pruning. However, these systems universally assume that the relational engine's catalog metadata handles physical execution correctly. When heuristic transformation layers operate as intermediary middleware outside the engine, they lack catalog context, making them susceptible to collation divergence.

### B. SQL Static Analysis and Sandboxing
Web-based database studios (such as phpMyAdmin, Cloud9, or educational query portals) enforce execution security via regular expression filtering or database user privilege separation. Static application security testing (SAST) tools detect classic string concatenation vulnerabilities. However, AST-level sandboxing that differentiates read-only recursive CTEs from data-mutating CTEs within high-concurrency Node.js runtime environments remains largely absent in open-source DBMS studios.

### C. Query Cancellation Semantics
In asynchronous database drivers (e.g., `mysql2`, `pg`), client-side timeout libraries often implement `Promise.race()` timeout loops. When the timer triggers, the driver drops or unhooks the client event listener. Unless an explicit termination packet or administrative thread cancellation is issued to the server daemon, the thread remains active in the database process list (`SHOW PROCESSLIST`) until query exhaustion. DBMS-Studio bridges this gap via verified server-side kill synchronization.

---

## III. Architecture and Threat Model

### A. System Overview
DBMS-Studio is structured as a decoupled, multi-tier architecture comprising:
1. **Presentation Layer:** A React 18 single-page application providing functional dependency mapping, AST-backed visual query planning, and interactive schema graphs.
2. **API and Orchestration Layer:** A Node.js and TypeScript Express backend hosting dedicated controllers for SQL execution, relational normalization, schema exploration, and security scanning.
3. **Security Policy and Execution Sandbox:** A fail-closed middleware layer intercepting all incoming query strings before database transmission.
4. **Relational Database Engine:** A MySQL 8.0.46 server configured with dedicated user privilege partitions for application transactions versus isolated, disposable benchmark runs.

### B. Threat Model and Security Boundaries
We assume an untrusted environment where users may submit:
* Adversarial SQL strings containing stacked statements (`SELECT 1; DROP TABLE users;`).
* Exfiltration clauses attempting to write sensitive database state to the host filesystem (`INTO OUTFILE '/var/www/shell.php'`).
* Denial-of-Service (DoS) and timing side-channel probes attempting resource exhaustion via nested loops or `SLEEP()` / `BENCHMARK()` primitives.
* Data-modifying Common Table Expressions designed to evade naive prefix checks.
* Arbitrary database names during automated benchmark runs targeting production schemas.

---

## IV. Core Technical Innovations

### A. Collation-Aware SARGable Predicate Rewriting
A search-argumentable (SARGable) predicate allows the database query engine to exploit B-Tree index scans rather than executing full table scans. In educational and commercial tools, queries filtering string columns via case-folding functions are frequently rewritten.

**Definition 1 (Case-Insensitive Rewrite).** Let $R$ be a relational schema with attribute $A$, and let $v \in \Sigma^*$ be a string literal. A heuristic optimizer transforms:
$$Q_{\text{orig}} = \sigma_{\text{LOWER}(A) = v}(R) \quad \Longrightarrow \quad Q_{\text{trans}} = \sigma_{A = v}(R)$$

**Theorem 1 (Collation-Induced Semantic Non-Equivalence).** Let $\text{Coll}(A)$ denote the collation of column $A$. If $\text{Coll}(A) = \texttt{utf8mb4\_bin}$, then $Q_{\text{orig}} \not\equiv Q_{\text{trans}}$.

*Proof.* Let $t \in R$ be a tuple such that $t[A] = \text{"Active"}$ and let $v = \text{"active"}$. Under the binary collation $\texttt{utf8mb4\_bin}$, string equality requires identical byte representations:
$$(t[A] = v) \iff \forall i, \; t[A][i] = v[i]$$
Since $\text{ASCII('A')} = 65$ and $\text{ASCII('a')} = 97$, the condition $t[A] = v$ evaluates to $\text{FALSE}$. Consequently, $t \notin Q_{\text{trans}}(R)$. Conversely, in $Q_{\text{orig}}$, $\text{LOWER}(t[A]) = \text{"active"} = v$, evaluating to $\text{TRUE}$, yielding $t \in Q_{\text{orig}}(R)$. Therefore:
$$Q_{\text{orig}}(R) \setminus Q_{\text{trans}}(R) \neq \emptyset$$
proving that syntactic predicate flattening without catalog collation awareness violates semantic equivalence. $\blacksquare$

```
Algorithm 1: Collation-Aware Semantic Verification
Input: Relation R, Original Query Q_orig, Transformed Query Q_trans
Output: Status in {EQUIVALENT, DIVERGENT}

1:  Fetch Coll(A) from information_schema.columns
2:  if Coll(A) in BINARY_COLLATIONS then
3:      abort rewrite; log warning ERR_COLLATION_SENSITIVE
4:      return DIVERGENT
5:  end if
6:  R_orig  <- Execute(Q_orig)
7:  R_trans <- Execute(Q_trans)
8:  S_orig  <- SortAndCanonicalize(R_orig)
9:  S_trans <- SortAndCanonicalize(R_trans)
10: if JSON(S_orig) == JSON(S_trans) then
11:     return EQUIVALENT
12: else
13:     return DIVERGENT
14: end if
```

Algorithm 1 details the multi-stage gating implemented in DBMS-Studio. The optimizer interrogates column collation metadata prior to rewrite emission. If a binary or case-sensitive collation is active, the rewrite is suppressed. Furthermore, empirical validation executes both queries over a deterministic synthetic dataset, sorting tuples canonically and verifying identity over serialized JSON representations.

### B. Fail-Closed AST Execution Sandboxing
Rather than relying on string tokenization, DBMS-Studio utilizes `node-sql-parser` to decompose SQL queries into an Abstract Syntax Tree:
$$\mathcal{T} = \text{Parser}(\text{SQL})$$

The policy enforcer traverses $\mathcal{T}$ recursively and implements the following invariant checks:
1. **Statement Cardinality Constraint:** $|\mathcal{T}| = 1$. Batched queries containing semicolons or stacked commands are rejected immediately to neutralize stacked SQL injection.
2. **Root Statement Policy:** The primary statement type $\tau_{\text{root}} \in \{\texttt{select}, \texttt{show}, \texttt{describe}, \texttt{explain}\}$. All mutations (`insert`, `update`, `delete`, `drop`, `alter`) trigger an immediate `403 Forbidden`.
3. **CTE Mutation Prohibition:** When a Common Table Expression (`WITH ...`) is detected, the AST parser validates that every CTE body $\mathcal{B}_i$ and the final outer statement $\mathcal{S}_{\text{outer}}$ are strictly of type `select`. This allows recursive analytical CTEs while neutralizing mutating CTEs (`WITH t AS (...) UPDATE ...`).
4. **Exfiltration and Diagnostic Filter:** The AST expression walker inspects all functional calls $\phi(x)$. If $\phi \in \{\texttt{SLEEP}, \texttt{BENCHMARK}, \texttt{LOAD\_FILE}\}$, or if clauses contain `INTO OUTFILE` or `INTO DUMPFILE`, execution is halted.

### C. Kernel-Synchronized Truthful Query Cancellation
In web-based SQL interfaces, client-side timeout loops often present an illusion of safety. If a query runs longer than a preset threshold (e.g., 5,000 ms), a standard Node.js server rejects the client promise. However, the connection socket continues waiting on the database server.

DBMS-Studio resolves this via the dual-connection watchdog:
1. The thread identifier $\tau_1 = C_1.\text{threadId}$ is acquired directly from the MySQL socket protocol.
2. A hardware timer $\Delta t$ is scheduled concurrently with the query execution promise.
3. If the query resolves prior to $\Delta t$, the timer is cleared and results are returned.
4. If $\Delta t$ expires before resolution, the execution manager leases an independent administrative connection $C_{\text{admin}}$ and issues:
$$\text{KILL QUERY } \tau_1;$$
5. The worker connection $C_1$ intercepts MySQL error code `ER_QUERY_INTERRUPTED` (1317), confirming that server-side resource allocation was halted.
6. If the kill command fails (e.g., due to privilege denial or socket timeout), the error is truthfully flagged as `unconfirmed cancellation`, preventing the application from falsely claiming that execution ceased.

```
       [ Client / HTTP Request ]
                  |
                  v
    +-----------------------------+
    | Truthful Execution Watchdog |
    +-----------------------------+
         |                   |
 (Lease Connection C1)   (Timeout: Delta t expired)
         |                   |
         v                   v
 [ Worker Socket C1 ]   [ Admin Socket C_admin ]
  threadId = tau_1            |
         |                    |
         |         Issues: KILL QUERY tau_1
         v                    v
+------------------------------------+
|        MySQL 8.0.46 Engine         |
|  - Worker Thread tau_1 interrupted |
|  - Returns ER_QUERY_INTERRUPTED    |
+------------------------------------+
```

### D. Isolated Disposable Benchmark Namespace Management
Automated research benchmarks require disposable database instances. If cleanup logic relies on static database names, an errant script risks dropping production data. DBMS-Studio enforces a strict isolation boundary:
* **Unique Run Namespacing:** Each benchmark run generates an entropy-seeded database name:
$$D_{\text{bench}} = \text{"dbms\_studio\_benchmark\_"} \,\|\, \text{Timestamp} \,\|\, \text{RandomHex}$$
* **Pre-Existence Verification:** Before issuance of `CREATE DATABASE`, the system executes `SHOW DATABASES LIKE ?`. If the schema pre-exists, execution fails closed to prevent overwriting existing structures.
* **Explicit Ownership Invariant:** Cleanup procedures require a dedicated `BenchmarkCleanupSession` state machine where `createdByThisRun` must be explicitly `true` and `isCleanedUp` must be `false`. Double-invocation or cleanup of unowned databases is strictly prevented.

---

## V. Experimental Evaluation

### A. Testbed and Environmental Setup
All experiments were conducted on a dedicated, non-virtualized bare-metal workstation:
* **Processor:** AMD Ryzen 7 7435HS (16 Logical Threads @ 3.10 GHz)
* **System Memory:** 24,261 MB Physical RAM
* **Operating System:** Windows 11 Enterprise (Build 10.0.26300, x64)
* **Runtime Engine:** Node.js v24.19.0 (V8 12.4.254.21)
* **Database Engine:** MySQL Community Server 8.0.46
* **Storage Engine:** InnoDB (Default buffer pool 128 MB)
* **Compiler:** TypeScript 5.8 / `tsx` test harness

### B. Empirical Collation Divergence Experiment
To validate Theorem 1, we instantiated an isolated synthetic database containing 300 customer records and 600 associated order records. The customer table was configured with duplicate status columns under differing character sets:
* `status_ci`: `VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`
* `status_cs`: `VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`

The table was populated with mixed-case status tokens (`"Active"`, `"active"`, `"ACTIVE"`, `"Inactive"`, `"Pending"`). We benchmarked 4 query transformation patterns across 5 repeated runs following a pre-warmed execution pass.

#### Table I: Empirical Live MySQL 8.0.46 Query Transformation and Equivalence Results
| ID | Transformation Description | Collation Mode | Original Latency (ms) | Transformed Latency (ms) | Speedup Factor | Equivalent? | Outcome Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **DB-TRANS-01** | Subquery unnesting (`IN` to `INNER JOIN`) | Case-Insensitive | $0.990 \pm 0.25$ | $1.020 \pm 0.27$ | $0.97\times$ | **True** | Exact 244 row match preserved. |
| **DB-TRANS-02** | `COUNT(*) > 0` to `EXISTS` short-circuit | Case-Insensitive | $1.254 \pm 0.20$ | $0.904 \pm 0.06$ | $\mathbf{1.39\times}$ | **True** | Exact 300 row match; 28% latency drop. |
| **DB-TRANS-03-CI** | SARGable flattening on `status_ci` | Case-Insensitive | $0.526 \pm 0.13$ | $0.842 \pm 0.21$ | $0.63\times$ | **True** | Both return 128 matching rows. |
| **DB-TRANS-03-CS** | SARGable rewrite guard on `status_cs` | **Binary / Case-Sens.** | $0.440 \pm 0.02$ | $0.348 \pm 0.17$ | $1.26\times$ | **FALSE** | **Semantic Divergence Detected!** Original: 128 rows; Rewrite: 42 rows (67.2% data loss). |

As demonstrated in Table I, query `DB-TRANS-03-CS` exhibits severe semantic failure under binary collation. The original query with $\text{LOWER}(\text{status\_cs}) = \text{'active'}$ successfully matches 128 mixed-case records. The naive SARGable rewrite $\text{status\_cs} = \text{'active'}$ matches only 42 records, dropping 86 valid records (a 67.2% data loss). DBMS-Studio successfully detected this divergence during equivalence gating and suppressed the rewrite, preserving query correctness.

### C. Static AST Analysis vs. Lexical Overhead
We evaluated the latency and classification accuracy of the AST structural analyzer across 10 distinct SQL queries (5 positive patterns containing wildcards or unindexed projections, and 5 negative clean queries), each evaluated across 5 runs (50 total runs).

#### Table II: AST Structural Analyzer Performance Statistics ($N=50$)
| Metric | Observed Value |
| :--- | :--- |
| True Positives / True Negatives | 25 / 25 |
| False Positives / False Negatives | 0 / 0 |
| Accuracy / Precision / Recall | 100% / 100% / 100% |
| Mean AST Analysis Latency | 0.716 ms |
| Median AST Analysis Latency | 0.431 ms |
| Standard Deviation | 1.672 ms |
| Minimum / Maximum Latency | 0.123 ms / 12.164 ms |

The AST analysis executes with a median latency of 0.431 ms, introducing negligible overhead relative to standard database network round-trip times (RTT $\approx 1.5 - 5.0$ ms).

### D. Schema-Aware NL2SQL Resolution
We compared the schema-aware relational graph traversal engine against a heuristic baseline keyword-matching parser. The evaluation corpus comprised 40 total queries: a 20-query preserved benchmark and an unseen 20-query evaluation set spanning multi-table joins, aggregations, and nested grouping.

#### Table III: NL2SQL Schema Resolution Benchmark ($N=40$ Queries)
| Corpus Partition | Metric | Baseline | DBMS-Studio | Gain |
| :--- | :--- | :---: | :---: | :---: |
| **Preserved Corpus** ($n=20$) | Table Accuracy | 70.0% | **100.0%** | +30.0% |
| | Intent Accuracy | 95.0% | 95.0% | 0.0% |
| **Unseen Corpus** ($n=20$) | Table Accuracy | 35.0% | **80.0%** | **+45.0%** |
| | Intent Accuracy | 85.0% | **95.0%** | +10.0% |
| **Combined Corpus** ($N=40$) | **Table Accuracy** | **52.5%** | **90.0%** | **+37.5%** |
| | **Intent Accuracy** | **90.0%** | **95.0%** | **+5.0%** |
| | **Join Path Resolution** | 62.5% | **100.0%** | **+37.5%** |

On the unseen evaluation corpus, baseline table discovery dropped precipitously to 35.0% due to vocabulary mismatch. DBMS-Studio maintained 80.0% accuracy by traversing relational foreign-key graphs, achieving 100% join path resolution across all 40 queries with a median latency of 0.124 ms.

### E. Relational Normalization and Security Auditing
We evaluated the relational normalization engine on 15 formal schemas with functional dependencies spanning 1NF through Boyce-Codd Normal Form (BCNF). Candidate key discovery achieved 100% exact match against analytical ground truth (15/15) with 0.031 ms median latency.

Similarly, the security auditing engine was tested against 50 vulnerability injection vectors (25 positive attacks including template literal injections, raw string concatenations, unconstrained `DELETE` statements, and hardcoded credential literals; and 25 safe parameterized queries). DBMS-Studio achieved zero false positives and zero false negatives, operating at 0.0028 ms median inspection latency.

---

## VI. Threats to Validity and Limitations

1. **Dataset Scale Bounds:** Live database rewrite experiments were conducted on a synthetic dataset of 900 records. While sufficient to verify InnoDB execution plans and semantic equivalence divergence, performance speedups may vary on multi-gigabyte disk-bound datasets.
2. **SQL Dialect Coverage:** The AST policy enforcer relies on the grammar definitions of `node-sql-parser`. Highly proprietary procedural extensions (such as Oracle PL/SQL or advanced PostgreSQL window functions) require dialect grammar updates.
3. **Hardware Concurrency Limits:** Experimental latencies reflect dedicated execution on an AMD Ryzen 7 7435HS processor; highly virtualized, oversubscribed cloud environments may introduce OS-level scheduling jitter.

---

## VII. Conclusion
In this paper, we addressed critical correctness, isolation, and security vulnerabilities present in modern autonomous database management studios. We demonstrated both theoretically and empirically that SARGable query rewrites without collation awareness cause severe semantic data loss under binary collations. We presented DBMS-Studio, an integrated platform featuring collation-sensitive rewrite gating, fail-closed AST sandboxing for Common Table Expressions, and server-side synchronized query cancellation via MySQL thread-id management. Our empirical evaluation across 114 automated tests and extensive benchmarks confirms that DBMS-Studio delivers reliable, high-performance database management without sacrificing semantic integrity or system security.

---

## References

1. S. Chaudhuri, "An overview of query optimization in relational systems," in *Proceedings of the ACM SIGACT-SIGMOD-SIGART Symposium on Principles of Database Systems (PODS)*, 1998, pp. 34–43.
2. V. Leis, A. Gubichev, A. Mirchev, P. Boncz, A. Kemper, and T. Neumann, "How good are query optimizers, really?" *Proceedings of the VLDB Endowment*, vol. 9, no. 3, pp. 204–215, 2015.
3. R. Marcus, P. Negi, H. Mao, C. Zhang, M. Alizadeh, T. Kraska, O. Papaemmanouil, and N. Tatbul, "Neo: A learned query optimizer," *Proceedings of the VLDB Endowment*, vol. 12, no. 11, pp. 1705–1718, 2019.
4. P. G. Selinger, M. M. Astrahan, D. D. Chamberlin, R. A. Lorie, and T. G. Price, "Access path selection in a relational database management system," in *Proceedings of the ACM SIGMOD International Conference on Management of Data*, 1979, pp. 23–34.
5. X. Zhou, C. Sun, Y. Li, H. Guan, and J. Sun, "Learned query optimizer: Current status and future directions," *IEEE Transactions on Knowledge and Data Engineering*, vol. 34, no. 12, pp. 5621–5639, 2020.
6. C. B. Haley, R. Laney, J. D. Moffett, and B. Nuseibeh, "Security requirements engineering: A framework for representation and analysis," *IEEE Transactions on Software Engineering*, vol. 34, no. 1, pp. 133–153, 2008.
7. Oracle Corporation, "MySQL 8.0 Reference Manual: Thread Command and Kill Semantics," Oracle Documentation, Tech. Rep., 2026.

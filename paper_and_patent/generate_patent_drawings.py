import matplotlib.pyplot as plt
import matplotlib.patches as patches

# Formal Patent Drawing Style: High contrast, clean boxes, numbered reference numerals
plt.rcParams['font.sans-serif'] = 'Arial'
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.size'] = 8.5

def generate_fig1_architecture():
    fig, ax = plt.subplots(figsize=(7, 4.8), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 7.5)
    ax.axis('off')

    # Title label
    ax.text(5, 7.1, "FIGURE 1: MULTI-TIER SYSTEM ARCHITECTURE (100)", ha='center', va='center', weight='bold', fontsize=10)

    # 110: Client / User Device
    ax.add_patch(patches.FancyBboxPatch((0.5, 5.0), 2.2, 1.4, boxstyle="round,pad=0.1", fc='#FFFFFF', ec='#000000', lw=1.5))
    ax.text(1.6, 6.0, "Client Device (110)", ha='center', va='center', weight='bold')
    ax.text(1.6, 5.4, "React 18 Frontend\n- Schema Explorer\n- Query Editor", ha='center', va='center', fontsize=7.5)

    # 120: API Orchestration Gateway
    ax.add_patch(patches.FancyBboxPatch((3.5, 4.8), 2.8, 1.8, boxstyle="round,pad=0.1", fc='#FFFFFF', ec='#000000', lw=1.5))
    ax.text(4.9, 6.2, "Application Server (120)", ha='center', va='center', weight='bold')
    ax.text(4.9, 5.4, "Express.js REST API\n- SQL Controller\n- Normalization Engine\n- NL2SQL Resolver", ha='center', va='center', fontsize=7.5)

    # 130: Fail-Closed AST Sandbox
    ax.add_patch(patches.FancyBboxPatch((7.0, 4.8), 2.6, 1.8, boxstyle="round,pad=0.1", fc='#FFFFFF', ec='#000000', lw=1.5))
    ax.text(8.3, 6.2, "AST Policy Sandbox (130)", ha='center', va='center', weight='bold')
    ax.text(8.3, 5.4, "node-sql-parser\n- Cardinality Check (|T|=1)\n- Read-Only Statement Gate\n- CTE Recursive Walker", ha='center', va='center', fontsize=7.5)

    # 140: Collation Verification Engine
    ax.add_patch(patches.FancyBboxPatch((0.5, 1.8), 2.6, 2.0, boxstyle="round,pad=0.1", fc='#FFFFFF', ec='#000000', lw=1.5))
    ax.text(1.8, 3.4, "Collation Engine (140)", ha='center', va='center', weight='bold')
    ax.text(1.8, 2.5, "SARGable Rewrite Gate\n- Catalog Metadata Audit\n- Binary Collation Guard\n- Canonical Tuple Sorter", ha='center', va='center', fontsize=7.5)

    # 150: Truthful Watchdog Controller
    ax.add_patch(patches.FancyBboxPatch((3.7, 1.8), 2.6, 2.0, boxstyle="round,pad=0.1", fc='#FFFFFF', ec='#000000', lw=1.5))
    ax.text(5.0, 3.4, "Watchdog Monitor (150)", ha='center', va='center', weight='bold')
    ax.text(5.0, 2.5, "Dual Connection Manager\n- Worker Lease (C1)\n- Thread ID Tracker (tau)\n- Admin Killer (C_admin)", ha='center', va='center', fontsize=7.5)

    # 160: Relational Database Storage Engine
    ax.add_patch(patches.FancyBboxPatch((7.0, 1.8), 2.6, 2.0, boxstyle="round,pad=0.1", fc='#FFFFFF', ec='#000000', lw=1.5))
    ax.text(8.3, 3.4, "RDBMS Engine (160)", ha='center', va='center', weight='bold')
    ax.text(8.3, 2.5, "MySQL 8.0.46 Server\n- InnoDB Buffer Pool\n- Kernel Process List\n- Information Schema", ha='center', va='center', fontsize=7.5)

    # Connecting Arrows
    arr = dict(arrowstyle="->", lw=1.2, color='#000000')
    ax.annotate("", xy=(3.5, 5.7), xytext=(2.7, 5.7), arrowprops=arr)
    ax.annotate("", xy=(7.0, 5.7), xytext=(6.3, 5.7), arrowprops=arr)
    ax.annotate("", xy=(1.8, 3.8), xytext=(4.2, 4.8), arrowprops=arr)
    ax.annotate("", xy=(5.0, 3.8), xytext=(5.0, 4.8), arrowprops=arr)
    ax.annotate("", xy=(8.3, 3.8), xytext=(8.3, 4.8), arrowprops=arr)
    ax.annotate("", xy=(7.0, 2.8), xytext=(6.3, 2.8), arrowprops=arr)

    plt.tight_layout()
    plt.savefig('paper_and_patent/figures/fig1_system_architecture.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("fig1_system_architecture.png generated.")

def generate_fig4_benchmark_lifecycle():
    fig, ax = plt.subplots(figsize=(7, 3.6), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 5)
    ax.axis('off')

    ax.text(5, 4.6, "FIGURE 4: BENCHMARK NAMESPACE STATE MACHINE (400)", ha='center', va='center', weight='bold', fontsize=10)

    # S1: Name Generation
    ax.add_patch(patches.FancyBboxPatch((0.4, 2.0), 1.9, 1.6, boxstyle="round,pad=0.1", fc='#FFFFFF', ec='#000000', lw=1.2))
    ax.text(1.35, 3.1, "State 410", ha='center', va='center', weight='bold', fontsize=8)
    ax.text(1.35, 2.5, "Entropy Name Gen.\nprefix + ts + hex\n(D_bench)", ha='center', va='center', fontsize=7.5)

    # S2: Pre-existence Assertion
    ax.add_patch(patches.FancyBboxPatch((2.8, 2.0), 2.0, 1.6, boxstyle="round,pad=0.1", fc='#FFFFFF', ec='#000000', lw=1.2))
    ax.text(3.8, 3.1, "State 420", ha='center', va='center', weight='bold', fontsize=8)
    ax.text(3.8, 2.5, "Pre-Existence Audit\nSHOW DATABASES\nLIKE D_bench", ha='center', va='center', fontsize=7.5)

    # S3: Session Activation
    ax.add_patch(patches.FancyBboxPatch((5.3, 2.0), 2.0, 1.6, boxstyle="round,pad=0.1", fc='#FFFFFF', ec='#000000', lw=1.2))
    ax.text(6.3, 3.1, "State 430", ha='center', va='center', weight='bold', fontsize=8)
    ax.text(6.3, 2.5, "Creation & Bind\nCREATE DATABASE\ncreatedBy = true", ha='center', va='center', fontsize=7.5)

    # S4: Boundary Cleanup
    ax.add_patch(patches.FancyBboxPatch((7.8, 2.0), 1.8, 1.6, boxstyle="round,pad=0.1", fc='#FFFFFF', ec='#000000', lw=1.2))
    ax.text(8.7, 3.1, "State 440", ha='center', va='center', weight='bold', fontsize=8)
    ax.text(8.7, 2.5, "Atomic Teardown\nDROP DATABASE\nisCleanedUp=true", ha='center', va='center', fontsize=7.5)

    # Fail closed terminal
    ax.add_patch(patches.FancyBboxPatch((3.6, 0.3), 2.8, 0.9, boxstyle="round,pad=0.08", fc='#FEE2E2', ec='#DC2626', lw=1.2))
    ax.text(5.0, 0.75, "TERMINAL: Fail-Closed Abort (450)\nProtection Invariant Preserved", ha='center', va='center', fontsize=7.5, weight='bold', color='#B91C1C')

    # Transitions
    arr = dict(arrowstyle="->", lw=1.2, color='#000000')
    ax.annotate("", xy=(2.8, 2.8), xytext=(2.3, 2.8), arrowprops=arr)
    ax.annotate("Non-collision", xy=(5.3, 2.8), xytext=(4.8, 2.8), arrowprops=arr)
    ax.annotate("Run Done", xy=(7.8, 2.8), xytext=(7.3, 2.8), arrowprops=arr)
    ax.annotate("Collision Detected", xy=(3.8, 1.2), xytext=(3.8, 2.0),
                arrowprops=dict(arrowstyle="->", lw=1.2, color='#DC2626'), fontsize=7, color='#DC2626')
    ax.annotate("Ownership Mismatch / Re-entry", xy=(6.3, 1.2), xytext=(8.7, 2.0),
                arrowprops=dict(arrowstyle="->", lw=1.2, color='#DC2626'), fontsize=7, color='#DC2626')

    plt.tight_layout()
    plt.savefig('paper_and_patent/figures/fig4_benchmark_lifecycle.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("fig4_benchmark_lifecycle.png generated.")

if __name__ == '__main__':
    generate_fig1_architecture()
    generate_fig4_benchmark_lifecycle()

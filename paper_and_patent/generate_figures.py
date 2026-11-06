import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

# Set style for academic publication
plt.rcParams['font.sans-serif'] = 'Arial'
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.size'] = 9

def generate_cancellation_architecture():
    fig, ax = plt.subplots(figsize=(6.5, 3.8), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6)
    ax.axis('off')

    # Colors
    bg_box = '#F8FAFC'
    border_box = '#334155'
    blue_fill = '#E0F2FE'
    blue_stroke = '#0284C7'
    red_fill = '#FEE2E2'
    red_stroke = '#DC2626'
    green_fill = '#DCFCE7'
    green_stroke = '#16A34A'
    gray_fill = '#F1F5F9'

    # Client Request Block
    ax.add_patch(patches.FancyBboxPatch((0.4, 3.8), 2.0, 1.4, boxstyle="round,pad=0.1", fc=blue_fill, ec=blue_stroke, lw=1.5))
    ax.text(1.4, 4.7, "API Client / HTTP", ha='center', va='center', weight='bold', fontsize=9, color='#0369A1')
    ax.text(1.4, 4.2, "POST /api/sql/execute\n(Timeout = 5,000ms)", ha='center', va='center', fontsize=7.5, color='#334155')

    # Watchdog Controller Container
    ax.add_patch(patches.FancyBboxPatch((2.9, 0.5), 3.8, 5.0, boxstyle="round,pad=0.15", fc=bg_box, ec=border_box, lw=1.2, ls='--'))
    ax.text(4.8, 5.2, "Truthful Execution Watchdog", ha='center', va='center', weight='bold', fontsize=9.5, color='#0F172A')

    # Worker Lease Box
    ax.add_patch(patches.FancyBboxPatch((3.2, 3.6), 3.2, 1.2, boxstyle="round,pad=0.08", fc='#FFFFFF', ec=blue_stroke, lw=1.2))
    ax.text(4.8, 4.4, "Worker Connection $C_1$", ha='center', va='center', weight='bold', fontsize=8.5, color='#0284C7')
    ax.text(4.8, 3.9, "Acquires MySQL threadId: $\\tau_1$", ha='center', va='center', fontsize=7.5, color='#475569')

    # Timer & Race Controller Box
    ax.add_patch(patches.FancyBboxPatch((3.2, 2.1), 3.2, 1.1, boxstyle="round,pad=0.08", fc='#FEF3C7', ec='#D97706', lw=1.2))
    ax.text(4.8, 2.8, "Hardware Timer $\\Delta t$", ha='center', va='center', weight='bold', fontsize=8.5, color='#B45309')
    ax.text(4.8, 2.4, "Race: Query Resolves vs. $\\Delta t$", ha='center', va='center', fontsize=7.5, color='#78350F')

    # Admin Killer Box
    ax.add_patch(patches.FancyBboxPatch((3.2, 0.8), 3.2, 1.0, boxstyle="round,pad=0.08", fc=red_fill, ec=red_stroke, lw=1.2))
    ax.text(4.8, 1.45, "Admin Connection $C_{\\mathrm{admin}}$", ha='center', va='center', weight='bold', fontsize=8.5, color='#B91C1C')
    ax.text(4.8, 1.05, "Issues: KILL QUERY $\\tau_1$", ha='center', va='center', fontsize=7.5, color='#991B1B')

    # MySQL Server Container
    ax.add_patch(patches.FancyBboxPatch((7.2, 0.8), 2.5, 4.4, boxstyle="round,pad=0.1", fc='#EFF6FF', ec='#1D4ED8', lw=1.5))
    ax.text(8.45, 4.9, "MySQL 8.0.46 Engine", ha='center', va='center', weight='bold', fontsize=9, color='#1E40AF')

    # MySQL internal threads
    ax.add_patch(patches.FancyBboxPatch((7.4, 3.4), 2.1, 1.0, boxstyle="round,pad=0.05", fc=green_fill, ec=green_stroke, lw=1.0))
    ax.text(8.45, 4.0, "Worker Thread $\\tau_1$", ha='center', va='center', weight='bold', fontsize=8, color='#15803D')
    ax.text(8.45, 3.6, "Executing Query AST", ha='center', va='center', fontsize=7, color='#166534')

    ax.add_patch(patches.FancyBboxPatch((7.4, 1.3), 2.1, 1.4, boxstyle="round,pad=0.05", fc='#FFFFFF', ec='#64748B', lw=1.0))
    ax.text(8.45, 2.3, "Kernel Process List", ha='center', va='center', weight='bold', fontsize=8, color='#334155')
    ax.text(8.45, 1.7, "Signals Interruption\n(ER_QUERY_INTERRUPTED)", ha='center', va='center', fontsize=7, color='#475569')

    # Connecting Arrows
    arrow = dict(arrowstyle="->", lw=1.3, color='#334155')
    ax.annotate("", xy=(3.2, 4.2), xytext=(2.4, 4.2), arrowprops=arrow)
    ax.annotate("", xy=(7.4, 4.0), xytext=(6.4, 4.0), arrowprops=dict(arrowstyle="->", lw=1.3, color='#0284C7'))
    ax.annotate("", xy=(4.8, 3.2), xytext=(4.8, 3.6), arrowprops=dict(arrowstyle="->", lw=1.0, ls=':', color='#D97706'))
    ax.annotate("Timeout Triggered", xy=(4.8, 1.8), xytext=(4.8, 2.1), ha='center', fontsize=6.5, color='#DC2626',
                arrowprops=dict(arrowstyle="->", lw=1.3, color='#DC2626'))
    ax.annotate("", xy=(7.4, 1.7), xytext=(6.4, 1.3), arrowprops=dict(arrowstyle="->", lw=1.3, color='#DC2626'))
    ax.annotate("Kill Confirmed", xy=(6.4, 3.7), xytext=(7.4, 2.5),
                arrowprops=dict(arrowstyle="->", lw=1.2, ls='--', color='#16A34A'), fontsize=7, color='#16A34A')

    plt.tight_layout()
    plt.savefig('paper_and_patent/figures/cancellation_architecture.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("cancellation_architecture.png generated.")

def generate_collation_divergence():
    fig, ax = plt.subplots(figsize=(5.5, 3.2), dpi=300)
    
    modes = ['Case-Insensitive\n(utf8mb4_general_ci)', 'Binary / Case-Sensitive\n(utf8mb4_bin)']
    orig_rows = [128, 128]
    trans_rows = [128, 42]
    
    x = np.arange(len(modes))
    width = 0.32
    
    rects1 = ax.bar(x - width/2, orig_rows, width, label='Original Query (LOWER(c) = val)', color='#0284C7', edgecolor='#0369A1')
    rects2 = ax.bar(x + width/2, trans_rows, width, label='Syntactic Rewrite (c = val)', color='#DC2626', edgecolor='#B91C1C')
    
    ax.set_ylabel('Result Tuple Count ($|R|$)', fontsize=9, weight='bold')
    ax.set_title('Collation-Induced Semantic Divergence in SARGable Rewrites', fontsize=9.5, weight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(modes, fontsize=8.5)
    ax.set_ylim(0, 160)
    ax.grid(axis='y', linestyle='--', alpha=0.5)
    ax.legend(frameon=True, fontsize=8, loc='upper right')
    
    # Value annotations
    for r in rects1:
        h = r.get_height()
        ax.annotate(f'{h}', xy=(r.get_x() + r.get_width()/2, h), xytext=(0, 2),
                    textcoords="offset points", ha='center', va='bottom', fontsize=8, weight='bold')
    for r in rects2:
        h = r.get_height()
        ax.annotate(f'{h}', xy=(r.get_x() + r.get_width()/2, h), xytext=(0, 2),
                    textcoords="offset points", ha='center', va='bottom', fontsize=8, weight='bold')

    # Anomaly indicator
    ax.annotate('Semantic Divergence!\n(86 tuples dropped: 67.2% loss)', 
                xy=(1 + width/2, 42), xytext=(1.0, 95),
                arrowprops=dict(facecolor='#DC2626', edgecolor='#DC2626', arrowstyle='->', lw=1.5),
                ha='center', fontsize=7.5, color='#B91C1C', weight='bold',
                bbox=dict(boxstyle="round,pad=0.2", fc='#FEE2E2', ec='#DC2626', lw=1))
    
    plt.tight_layout()
    plt.savefig('paper_and_patent/figures/collation_divergence.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("collation_divergence.png generated.")

if __name__ == '__main__':
    generate_cancellation_architecture()
    generate_collation_divergence()

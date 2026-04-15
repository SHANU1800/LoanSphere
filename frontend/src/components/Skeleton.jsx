// Reusable skeleton loader components for premium loading states

export function SkeletonLine({ width = '100%', height = 14, style = {} }) {
    return (
        <div className="skeleton" style={{ width, height, borderRadius: 6, ...style }} />
    );
}

export function SkeletonCard({ rows = 3, style = {} }) {
    return (
        <div className="card" style={{ ...style }}>
            <div style={{ marginBottom: 18 }}>
                <SkeletonLine width="40%" height={16} />
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                    <SkeletonLine width={`${70 + Math.sin(i) * 20}%`} height={12} />
                </div>
            ))}
        </div>
    );
}

export function SkeletonStatCard() {
    return (
        <div className="stat-card">
            <SkeletonLine width={38} height={38} style={{ borderRadius: 9, marginBottom: 14 }} />
            <SkeletonLine width="60%" height={28} style={{ marginBottom: 8 }} />
            <SkeletonLine width="45%" height={11} />
        </div>
    );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
    return (
        <div className="table-container">
            <table style={{ width: '100%' }}>
                <thead>
                    <tr>
                        {Array.from({ length: cols }).map((_, i) => (
                            <th key={i}><SkeletonLine width="80%" height={10} /></th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, r) => (
                        <tr key={r}>
                            {Array.from({ length: cols }).map((_, c) => (
                                <td key={c}><SkeletonLine width={`${55 + Math.cos(r * c) * 30}%`} height={12} /></td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

type Segment = { label: string; value: number; color: string };

const formatPercent = (value: number, total: number) => total > 0 ? `${(value / total * 100).toFixed(1)}%` : '0%';

export function PieChart({ segments, title }: { segments: Segment[]; title: string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let cumulative = 0;
  const radius = 70;
  const center = 90;
  const diameter = radius * 2;

  const arcs = segments.filter(s => s.value > 0).map(segment => {
    const startAngle = (cumulative / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
    cumulative += segment.value;
    const endAngle = (cumulative / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    const midAngle = (startAngle + endAngle) / 2;
    const labelRadius = radius * 0.62;
    const labelX = center + labelRadius * Math.cos(midAngle);
    const labelY = center + labelRadius * Math.sin(midAngle);
    const showLabel = segment.value / Math.max(total, 1) > 0.06;
    return { path, color: segment.color, label: segment.label, value: segment.value, labelX, labelY, showLabel };
  });

  return (
    <div className="card overflow-hidden">
      <div className="teal-strip"><span>{title}</span></div>
      <div className="p-5 flex flex-col sm:flex-row items-center gap-6">
        {total > 0 ? (
          <svg width={diameter} height={diameter} viewBox={`0 0 ${diameter + 20} ${diameter + 20}`} className="flex-shrink-0">
            <g transform="translate(10, 10)">
              {arcs.map((arc, i) => (
                <g key={i}>
                  <path d={arc.path} fill={arc.color} stroke="white" strokeWidth={1.5} />
                  {arc.showLabel && (
                    <text x={arc.labelX} y={arc.labelY} textAnchor="middle" dominantBaseline="middle"
                      className="text-[9px] font-bold" fill="white" style={{ pointerEvents: 'none' }}>
                      {formatPercent(arc.value, total)}
                    </text>
                  )}
                </g>
              ))}
            </g>
          </svg>
        ) : (
          <div className="flex items-center justify-center text-slate-400 text-sm" style={{ width: diameter, height: diameter }}>Veri yok</div>
        )}
        <div className="flex-1 grid grid-cols-1 gap-2 w-full">
          {segments.map(segment => (
            <div key={segment.label} className="flex items-center gap-2 text-xs">
              <span className="size-3 rounded-full border border-slate-300 flex-shrink-0" style={{ backgroundColor: segment.color }} />
              <span className="flex-1 text-slate-600 truncate">{segment.label}</span>
              <span className="font-semibold text-slate-800">{segment.value}</span>
              <span className="text-slate-400 w-12 text-right">{formatPercent(segment.value, total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

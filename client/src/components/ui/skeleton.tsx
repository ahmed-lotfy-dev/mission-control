// Skeleton loading placeholder
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

// Skeleton for stat cards
export function StatCardSkeleton() {
  return (
    <div className="py-[10px] px-3 rounded-md bg-bg-deep border border-border">
      <div className="skeleton w-16 h-3 mb-2" />
      <div className="skeleton w-10 h-5" />
    </div>
  );
}

// Skeleton for table rows
export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}><div className="skeleton w-full h-4" /></td>
      ))}
    </tr>
  );
}

// Skeleton for issue table
export function IssueTableSkeleton() {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Severity</th><th>Category</th><th>Issue</th><th>URL</th><th>Recommendation</th></tr></thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)}
        </tbody>
      </table>
    </div>
  );
}

// Skeleton for overview page
export function OverviewSkeleton() {
  return (
    <div>
      <div className="grid-2 mb-24">
        <div className="card flex items-center justify-between py-5 px-6">
          <div><div className="skeleton w-24 h-4 mb-2" /><div className="skeleton w-32 h-3" /></div>
          <div className="skeleton w-[100px] h-[100px] rounded-full" />
        </div>
        <div className="card"><div className="skeleton w-20 h-4 mb-3" /><div className="flex gap-3">
          {[1,2,3,4].map(i => <div key={i} className="flex-1"><div className="skeleton w-full h-10 rounded-lg" /></div>)}
        </div></div>
      </div>
      <div className="grid-3 mb-24">{[1,2,3].map(i => <StatCardSkeleton key={i} />)}</div>
      <div className="card"><div className="skeleton w-24 h-4 mb-3" /><IssueTableSkeleton /></div>
    </div>
  );
}

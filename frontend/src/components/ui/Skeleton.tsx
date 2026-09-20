interface SkeletonProps {
  className?: string;
  rows?: number;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[#DCD7CE] bg-[#FBF9F4] p-5 shadow-[0_12px_30px_rgba(70,61,69,.04)] space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-2.5 w-16" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="rounded-2xl border border-[#DCD7CE] bg-[#FBF9F4] p-5 shadow-[0_12px_30px_rgba(70,61,69,.04)]">
      <Skeleton className="mb-6 h-3 w-32" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#DCD7CE] bg-[#FBF9F4] shadow-[0_12px_30px_rgba(70,61,69,.04)]">
      <div className="border-b border-[#DCD7CE] px-5 py-4">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="divide-y divide-[#ECE8E1]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="ml-auto h-2.5 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

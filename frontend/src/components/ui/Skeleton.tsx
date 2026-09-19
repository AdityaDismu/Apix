interface SkeletonProps {
  className?: string;
  rows?: number;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton rounded ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[#E4E7EC] p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-2.5 w-16" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-white rounded-xl border border-[#E4E7EC] p-5">
      <Skeleton className="h-3 w-32 mb-6" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-[#E4E7EC] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E4E7EC]">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="divide-y divide-[#F2F4F7]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-2.5 w-12 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

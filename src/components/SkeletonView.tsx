import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonView() {
  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-background">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right space-y-1">
            <Skeleton className="h-3 w-10 ml-auto" />
            <Skeleton className="h-4 w-14" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-4 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>

      {/* Bottom nav skeleton */}
      <div className="flex items-center justify-around px-2 py-3 border-t border-border/50">
        <Skeleton className="h-10 w-16 rounded-lg" />
        <Skeleton className="h-10 w-16 rounded-lg" />
        <Skeleton className="h-10 w-16 rounded-lg" />
      </div>
    </div>
  );
}

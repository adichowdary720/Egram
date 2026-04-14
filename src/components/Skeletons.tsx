export function PostSkeleton() {
    return (
        <div className="ig-post glass border-[var(--card-border)] animate-fade-in relative overflow-hidden">
            <div className="post-header flex items-center p-4 gap-3">
                <div className="w-8 h-8 rounded-full animate-shimmer"></div>
                <div className="flex flex-col gap-2">
                    <div className="w-24 h-3 rounded bg-zinc-800 animate-shimmer"></div>
                    <div className="w-12 h-2 rounded bg-zinc-800 animate-shimmer"></div>
                </div>
            </div>
            <div className="w-full h-[400px] animate-shimmer"></div>
            <div className="p-4 flex flex-col gap-3">
                <div className="w-32 h-4 rounded animate-shimmer"></div>
                <div className="w-full h-3 rounded animate-shimmer"></div>
                <div className="w-2/3 h-3 rounded animate-shimmer"></div>
            </div>
        </div>
    );
}

export function RoomSkeleton() {
    return (
        <div className="meet-item glass border-[var(--card-border)] flex justify-between p-3 animate-fade-in">
            <div className="flex flex-col gap-2 w-full">
                <div className="w-3/4 h-4 rounded animate-shimmer"></div>
                <div className="w-1/2 h-3 rounded animate-shimmer mt-2"></div>
            </div>
            <div className="w-16 h-8 rounded animate-shimmer ml-4"></div>
        </div>
    );
}

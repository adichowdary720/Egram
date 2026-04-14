import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "firebase/auth";
import { PostSkeleton } from "./Skeletons";
import { PostCard, Post } from "./PostCard";

export function PostFeed({ user, feedType = "global" }: { user: User, feedType?: "global" | "following" }) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [followingIds, setFollowingIds] = useState<string[]>([]);

    const getInitials = (name: string | null) => {
        if (!name) return "U";
        return name.substring(0, 2).toUpperCase();
    };

    // 1. Fetch Following IDs (only if needed)
    useEffect(() => {
        if (feedType === "following") {
            const q = query(collection(db, "follows"), where("followerId", "==", user.uid));
            onSnapshot(q, (snapshot) => {
                const ids = snapshot.docs.map(doc => doc.data().followingId);
                setFollowingIds(ids);
            });
        }
    }, [feedType, user.uid]);

    // 2. Fetch Posts based on feedType
    useEffect(() => {
        const fetchPosts = async (silent = false) => {
            if (!silent) setLoading(true);
            try {
                const url = feedType === "following"
                    ? `/api/posts?type=following&userId=${user.uid}`
                    : `/api/posts`;

                const res = await fetch(url);
                if (res.ok) {
                    const result = await res.json();
                    const formattedPosts = result.data.map((p: any) => ({
                        id: p._id,
                        authorId: p.author?.firebaseUid || p.author,
                        authorName: p.author?.name || "Anonymous",
                        authorInitials: getInitials(p.author?.name),
                        content: p.content,
                        mediaUrl: p.images?.[0], // Map images array to mediaUrl for compatibility
                        timestamp: { toDate: () => new Date(p.createdAt) }, // Mock Firestore timestamp for compatibility
                        likes: p.likes || [],
                        commentsCount: p.comments?.length || 0,
                    }));
                    setPosts(formattedPosts);
                }
            } catch (error) {
                console.error("Feed fetch error:", error);
            } finally {
                if (!silent) setLoading(false);
            }
        };

        fetchPosts();

        const handleNewPost = () => fetchPosts(true);
        window.addEventListener("postCreated", handleNewPost);
        return () => window.removeEventListener("postCreated", handleNewPost);
    }, [feedType, user.uid]);

    if (loading) {
        return (
            <div className="space-y-6">
                <PostSkeleton />
                <PostSkeleton />
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="text-center py-10 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 bg-zinc-900/10">
                {feedType === "following" ? (
                    <>
                        <p className="font-semibold text-zinc-400 mb-2">Your following feed is empty</p>
                        <p className="text-xs">Follow other users to see their posts here!</p>
                    </>
                ) : (
                    <p>No posts yet. Be the first to share your learning journey!</p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="section-title">Day-to-Day Records</h2>
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    user={user}
                    getInitials={getInitials}
                />
            ))}
        </div>
    );
}

import { useState, useEffect } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "firebase/auth";
import { MoreHorizontal, Heart, MessageCircle, Send, Bookmark, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "./ToastProvider";

export interface Post {
    id: string;
    authorId: string;
    authorName: string;
    authorInitials: string;
    content: string;
    mediaUrl?: string;
    timestamp: any;
    likes: string[];
    commentsCount?: number;
}

interface Comment {
    id: string;
    authorId: string;
    authorName: string;
    authorInitials: string;
    text: string;
    timestamp: any;
}

interface PostCardProps {
    post: Post;
    user: User;
    getInitials: (name: string | null) => string;
}

export function PostCard({ post, user, getInitials }: PostCardProps) {
    const [isLiked, setIsLiked] = useState(post.likes.includes(user.uid));
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showBigHeart, setShowBigHeart] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        setIsLiked(post.likes.includes(user.uid));
    }, [post.likes, user.uid]);

    useEffect(() => {
        if (!showComments) return;

        // Fetch comments from MongoDB since we moved types
        const fetchComments = async () => {
            try {
                const res = await fetch(`/api/posts`); // We'll assume the feed might have them or add a sub-route
                // For now, we've already gotten some comments in the feed, but if we want fresh ones:
                // We'll trust the initial load or use the POST result.
            } catch (err) {
                console.error(err);
            }
        };
        fetchComments();
    }, [showComments, post.id]);

    const handleLike = async () => {
        const wasLiked = isLiked;
        setIsLiked(!wasLiked);

        try {
            const res = await fetch(`/api/posts/${post.id}/like`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.uid })
            });
            if (!res.ok) throw new Error("Failed to like");
        } catch (error) {
            console.error("Error toggling like:", error);
            setIsLiked(wasLiked);
        }
    };

    const handleDoubleTap = () => {
        if (!isLiked) {
            handleLike();
        }
        setShowBigHeart(true);
        setTimeout(() => setShowBigHeart(false), 800);
    };

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
            addToast("Post link copied to clipboard!", "success");
        } catch (err) {
            console.error('Failed to copy', err);
            addToast("Failed to copy link", "error");
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/posts/${post.id}/comment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.uid, text: newComment.trim() })
            });

            if (res.ok) {
                const data = await res.json();
                // Manually map the comments if we want real-time update in this component
                setComments(data.comments.map((c: any) => ({
                    id: c._id,
                    authorId: c.user,
                    authorName: "You", // Simple mapping for immediate feedback
                    authorInitials: getInitials(user.displayName),
                    text: c.text,
                    timestamp: { toDate: () => new Date(c.createdAt) }
                })));
                setNewComment("");
            }
        } catch (error) {
            console.error("Error adding comment: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <article className="ig-post glass">
            <div className="post-header">
                <div className="avatar-small">{post.authorInitials}</div>
                <div className="post-meta flex flex-col items-start gap-0">
                    <span className="author-name">{post.authorName}</span>
                    <span className="timestamp text-xs">
                        {post.timestamp?.toDate() ? new Date(post.timestamp.toDate()).toLocaleDateString() : "Just now"}
                    </span>
                </div>
                <MoreHorizontal className="ml-auto cursor-pointer" />
            </div>

            {post.mediaUrl && (
                <div className="post-media-container bg-zinc-950 relative overflow-hidden flex items-center justify-center cursor-pointer select-none" onDoubleClick={handleDoubleTap}>
                    <img src={post.mediaUrl} alt="Post content" className="post-image pointer-events-none" loading="lazy" />
                    
                    {/* Big Heart Animation Overlay */}
                    <AnimatePresence>
                        {showBigHeart && (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1.5, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                transition={{ type: "spring", damping: 15, stiffness: 200 }}
                                className="absolute pointer-events-none z-10"
                            >
                                <Heart className="w-24 h-24 text-white drop-shadow-2xl fill-white" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            <div className="post-actions">
                <div className="action-group">
                    <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={handleLike}
                        className={`action-btn ${isLiked ? 'text-red-500' : ''}`}
                    >
                        <Heart fill={isLiked ? "currentColor" : "none"} />
                    </motion.button>
                    <button onClick={() => setShowComments(!showComments)} className="action-btn">
                        <MessageCircle />
                    </button>
                    <button className="action-btn"><Send /></button>
                </div>
                <button onClick={handleShare} className="action-btn"><Share className="w-5 h-5 transition-transform hover:-translate-y-1" /></button>
            </div>

            <div className="post-content">
                <p className="likes-count">{post.likes.length} {post.likes.length === 1 ? 'like' : 'likes'}</p>
                <p className="caption">
                    <span className="author-bold">{post.authorName}</span> {post.content}
                </p>
                {post.commentsCount && post.commentsCount > 0 && !showComments && (
                    <button
                        onClick={() => setShowComments(true)}
                        className="text-zinc-500 text-sm mt-1 mb-2 hover:text-zinc-400"
                    >
                        View all {post.commentsCount} comments
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showComments && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-zinc-800/50 mt-2 overflow-hidden"
                    >
                        <div className="max-h-60 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                            {comments.length === 0 ? (
                                <p className="text-sm text-zinc-500 text-center py-2">No comments yet. Start the conversation!</p>
                            ) : (
                                comments.map(comment => (
                                    <div key={comment.id} className="flex gap-2 text-sm">
                                        <span className="font-semibold">{comment.authorName}</span>
                                        <span className="text-zinc-300 break-words flex-1">{comment.text}</span>
                                    </div>
                                ))
                            )}
                        </div>
                        <form onSubmit={handleAddComment} className="flex items-center px-4 py-3 border-t border-zinc-800/50">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-zinc-500"
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim() || isSubmitting}
                                className="text-primary font-semibold text-sm disabled:opacity-50 ml-2"
                            >
                                Post
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </article>
    );
}

import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { PostFeed } from "./PostFeed";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

interface CenterFeedProps {
    user: User;
}

interface OnlineUser {
    uid: string;
    displayName: string;
    photoURL: string;
    currentStreak: number;
    isOnline: boolean;
    lastActive: any;
}

export function CenterFeed({ user }: CenterFeedProps) {
    const [feedType, setFeedType] = useState<"global" | "following">("global");
    const [onlineFriends, setOnlineFriends] = useState<OnlineUser[]>([]);
    const [loadingStories, setLoadingStories] = useState(true);

    useEffect(() => {
        if (!user) return;

        // 1. Fetch followed users from MongoDB first
        const fetchFollowingAndListen = async () => {
            try {
                const res = await fetch(`/api/users/${user.uid}`);
                const userData = await res.json();
                const followingIds = userData.following || [];
                
                // We want to show "following" + "self"
                const relevantUids = [user.uid, ...followingIds];

                // 2. Setup Firestore listener for these users
                if (relevantUids.length === 0) {
                    setLoadingStories(false);
                    return;
                }

                const usersQuery = query(
                    collection(db, "users"),
                    where("__name__", "in", relevantUids.slice(0, 30))
                );

                const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
                    const users: OnlineUser[] = snapshot.docs.map(doc => ({
                        uid: doc.id,
                        ...doc.data()
                    } as OnlineUser));

                    // Filter for active users
                    const now = Date.now();
                    const activeUsers = users.filter(u => {
                        if (u.uid === user.uid) return true; // Always show self
                        
                        // Check online status or activity within last 5 mins
                        if (u.isOnline) return true;
                        if (u.lastActive?.toMillis) {
                            return (now - u.lastActive.toMillis()) < 300000;
                        }
                        return false;
                    });

                    // Sort: Self ALWAYS first, then by streak
                    activeUsers.sort((a, b) => {
                        if (a.uid === user.uid) return -1;
                        if (b.uid === user.uid) return 1;
                        return (b.currentStreak || 0) - (a.currentStreak || 0);
                    });

                    setOnlineFriends(activeUsers);
                    setLoadingStories(false);
                });

                return unsubscribe;
            } catch (error) {
                console.error("Error fetching following status:", error);
                setLoadingStories(false);
            }
        };

        let unsubscribeFn: (() => void) | undefined;
        fetchFollowingAndListen().then(unsub => {
            unsubscribeFn = unsub;
        });

        return () => {
            if (unsubscribeFn) unsubscribeFn();
        };
    }, [user]);

    const getInitials = (name: string | null) => {
        if (!name) return "U";
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="feed-column">
            {/* Stories Bar */}
            <div className="stories-bar glass overflow-x-auto no-scrollbar py-6 px-4 mb-6">
                <div className="flex items-center gap-6 min-w-max">
                    {loadingStories ? (
                        [1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="w-16 h-16 rounded-full bg-[var(--accent-bg)] animate-pulse border-2 border-[var(--card-border)]" />
                        ))
                    ) : onlineFriends.length > 0 ? (
                        onlineFriends.map(friend => (
                            <Link key={friend.uid} href={`/profile/${friend.uid}`} className="relative group flex flex-col items-center gap-2">
                                {/* Ring and Avatar Wrapper */}
                                <div className="relative">
                                    <div className={`w-16 h-16 rounded-full p-[2px] transition-all duration-300 group-hover:scale-105 shadow-lg ${friend.currentStreak > 0 ? 'bg-gradient-to-tr from-orange-500 via-red-500 to-amber-500 animate-gradient-xy' : 'bg-gradient-to-tr from-cyan-400 to-blue-500'}`}>
                                        <div className="w-full h-full rounded-full bg-[var(--background)] p-[2px]">
                                            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-[var(--accent-bg)]">
                                                {friend.photoURL ? (
                                                    <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                ) : (
                                                    <span className="text-xl font-black text-[var(--primary)]">{getInitials(friend.displayName)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Online indicator (Actual Green Dot) */}
                                    {friend.isOnline && (
                                        <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-green-500 border-[3px] border-[var(--background)] rounded-full z-10 shadow-sm" />
                                    )}

                                    {/* Streak Badge (Custom Graphic Feel) */}
                                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[var(--background)] border border-[var(--card-border)] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-md z-20">
                                        <span className="text-[10px] font-black leading-none text-[var(--text-dark)]">{friend.currentStreak || 0}</span>
                                        <span className="text-[10px] leading-none">{friend.currentStreak > 10 ? '🔥' : '❄️'}</span>
                                    </div>
                                </div>
                                
                                <span className="text-[10px] font-bold text-[var(--text-light)] max-w-[64px] truncate transition-colors group-hover:text-[var(--text-dark)]">
                                    {friend.uid === user.uid ? 'You' : (friend.displayName || 'User')}
                                </span>
                            </Link>
                        ))
                    ) : (
                        <div className="flex items-center gap-3 px-4 py-2 opacity-50 bg-[var(--accent-bg)] rounded-2xl border border-dashed border-[var(--card-border)]">
                            <div className="w-10 h-10 rounded-full border-2 border-[var(--card-border)] flex items-center justify-center bg-[var(--background)]">
                                <span className="text-xs">👤</span>
                            </div>
                            <span className="text-xs font-bold text-[var(--text-light)]">No one is online</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-4 mb-6 px-1">
                <button
                    onClick={() => setFeedType("global")}
                    className={`pb-2 px-4 transition-all ${feedType === "global" ? "border-b-2 border-[var(--primary)] text-white font-bold" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                    Explore
                </button>
                <button
                    onClick={() => setFeedType("following")}
                    className={`pb-2 px-4 transition-all ${feedType === "following" ? "border-b-2 border-[var(--primary)] text-white font-bold" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                    Following
                </button>
            </div>

            <PostFeed user={user} feedType={feedType} />
        </div>
    );
}

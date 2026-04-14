"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Sidebar } from "@/components/Sidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { UserCard } from "@/components/UserCard";
import { CreateMeetModal } from "@/components/CreateMeetModal";
import { CreatePostModal } from "@/components/CreatePostModal";
import { Search as SearchIcon, Users, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { motion, AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/SplashScreen";

export default function SearchPage() {
    const [user, setUser] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                try {
                    const res = await fetch(`/api/users/${currentUser.uid}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.following) {
                            setFollowingIds(new Set(data.following));
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch user following data:", error);
                }

                setLoading(false);
            } else {
                window.location.href = "/login";
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&uid=${user?.uid}`);
            if (res.ok) {
                const users = await res.json();
                // Map the results so components expecting `displayName`, `photoURL` still work. 
                // Alternatively, just pass the Mongo User format to components.
                const mappedUsers = users.map((u: any) => ({
                    uid: u.firebaseUid,
                    ...u,
                    displayName: u.name,
                    photoURL: u.avatarUrl,
                    followersCount: u.followersCount || 0,
                    followingCount: u.followingCount || 0
                }));
                setSearchResults(mappedUsers);
            }
        } catch (error: any) {
            console.error("Search error:", error);
            addToast("Failed to search users", "error");
        } finally {
            setIsSearching(false);
        }
    };

    const toggleFollow = async (targetUserId: string) => {
        if (!user) return;

        try {
            const res = await fetch(`/api/users/${targetUserId}/follow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ followerId: user.uid }),
            });

            if (res.ok) {
                const data = await res.json();
                const newFollowingIds = new Set(followingIds);
                if (data.isFollowing) {
                    newFollowingIds.add(targetUserId);
                    addToast("Following", "success");
                } else {
                    newFollowingIds.delete(targetUserId);
                    addToast("Unfollowed", "success");
                }
                setFollowingIds(newFollowingIds);
            } else {
                addToast("Failed to update follow status", "error");
            }
        } catch (error: any) {
            console.error("Follow error:", error);
            addToast("Failed to update follow status", "error");
        }
    };

    const getInitials = (name: string | null) => {
        if (!name) return "U";
        return name.substring(0, 2).toUpperCase();
    };

    const hasQuery = searchQuery.trim().length > 0;

    return (
        <>
            <AnimatePresence>
                {loading && <SplashScreen key="splash" />}
            </AnimatePresence>

            {!loading && user && (
                <div className="min-h-screen" style={{ background: "var(--background)" }}>
                    <Sidebar
                        user={user}
                        setIsModalOpen={setIsModalOpen}
                        setIsPostModalOpen={setIsPostModalOpen}
                        getInitials={getInitials}
                    />

                    <main className="main-content">
                        <div className="feed-column w-full max-w-[620px] py-10 px-6 mx-auto flex flex-col" style={{ color: "var(--text-dark)" }}>

                            {/* === Header === */}
                            <motion.div
                                initial={{ opacity: 0, y: -12 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-10"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-2xl" style={{ background: "var(--primary-bg)" }}>
                                        <Sparkles className="w-5 h-5" style={{ color: "var(--primary)" }} />
                                    </div>
                                    <h1 className="text-4xl font-black tracking-tight" style={{ color: "var(--text-dark)" }}>
                                        Discover
                                    </h1>
                                </div>
                                <p className="text-sm font-medium pl-1" style={{ color: "var(--text-light)" }}>
                                    Find learners, follow their journeys, and grow together.
                                </p>
                            </motion.div>

                            {/* === Search Bar === */}
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.08 }}
                                className="mb-10"
                            >
                                <form
                                    onSubmit={handleSearch}
                                    className="relative rounded-2xl transition-all duration-200"
                                    style={{
                                        background: "var(--card-bg)",
                                        border: `2px solid ${isFocused ? "var(--primary)" : "var(--card-border)"}`,
                                        boxShadow: isFocused ? "0 0 0 4px var(--primary-bg)" : "none",
                                    }}
                                >
                                    <SearchIcon
                                        className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none transition-colors"
                                        style={{ color: isFocused ? "var(--primary)" : "var(--text-light)" }}
                                    />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => setIsFocused(true)}
                                        onBlur={() => setIsFocused(false)}
                                        onKeyUp={(e) => {
                                            if (e.key === "Enter") handleSearch();
                                            else if (searchQuery.length > 2) handleSearch();
                                        }}
                                        placeholder="Search for learners by name..."
                                        style={{
                                            color: "var(--text-dark)",
                                            background: "transparent",
                                        }}
                                        className="w-full rounded-2xl py-4 pl-14 pr-24 text-base font-medium focus:outline-none transition-all"
                                    />
                                    {isSearching ? (
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                            <Loader2 className="animate-spin w-5 h-5" style={{ color: "var(--primary)" }} />
                                        </div>
                                    ) : hasQuery ? (
                                        <button
                                            type="submit"
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black px-3 py-1.5 rounded-xl transition-all"
                                            style={{ background: "var(--primary)", color: "#fff" }}
                                        >
                                            Search
                                        </button>
                                    ) : null}
                                </form>

                                {/* Keyboard hint */}
                                <p className="text-center text-[10px] sm:text-xs mt-6 font-bold tracking-wider uppercase select-none opacity-40" style={{ color: "var(--text-main)" }}>
                                    Press <kbd className="px-1.5 py-0.5 rounded border-b-2 font-black mx-1 shadow-sm" style={{ background: "var(--accent-bg)", borderColor: "var(--card-border)", color: "var(--text-dark)" }}>Enter</kbd> to search
                                </p>
                            </motion.div>

                            {/* === Results Section === */}
                            <div className="space-y-3">
                                {/* Section label */}
                                <div className="flex items-center justify-between px-1 mb-5">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" style={{ color: "var(--text-light)" }} />
                                        <span className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-light)" }}>
                                            {searchResults.length > 0 ? "Results" : "Discover People"}
                                        </span>
                                    </div>
                                    {searchResults.length > 0 && (
                                        <span
                                            className="text-[11px] font-bold px-3 py-1 rounded-full"
                                            style={{ background: "var(--primary-bg)", color: "var(--primary)" }}
                                        >
                                            {searchResults.length} found
                                        </span>
                                    )}
                                </div>

                                <AnimatePresence mode="wait">
                                    {searchResults.length > 0 ? (
                                        <motion.div
                                            key="results"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="space-y-3"
                                        >
                                            {searchResults.map((profile, index) => (
                                                <motion.div
                                                    key={profile.uid}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.04 }}
                                                >
                                                    <UserCard
                                                        profile={profile}
                                                        isFollowing={followingIds.has(profile.uid)}
                                                        onFollow={toggleFollow}
                                                    />
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    ) : hasQuery && !isSearching ? (
                                        <motion.div
                                            key="no-results"
                                            initial={{ opacity: 0, scale: 0.97 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="text-center py-16 rounded-3xl border-2 border-dashed"
                                            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
                                        >
                                            <div
                                                className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-5"
                                                style={{ background: "var(--accent-bg)" }}
                                            >
                                                <Users className="w-8 h-8" style={{ color: "var(--text-light)" }} />
                                            </div>
                                            <p className="text-base font-bold mb-1" style={{ color: "var(--text-dark)" }}>
                                                No learners found
                                            </p>
                                            <p className="text-sm px-10 leading-relaxed" style={{ color: "var(--text-light)" }}>
                                                No result for &ldquo;{searchQuery}&rdquo;. Try a different name!
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="empty"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="text-center py-20 rounded-[32px] relative overflow-hidden group border-2"
                                            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
                                        >
                                            {/* Glow on hover */}
                                            <div
                                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                                                style={{ background: "linear-gradient(to bottom, var(--primary-bg), transparent)" }}
                                            />
                                            <div
                                                className="w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500"
                                                style={{ background: "var(--accent-bg)" }}
                                            >
                                                <Users className="w-10 h-10" style={{ color: "var(--text-light)", opacity: 0.3 }} />
                                            </div>
                                            <p className="text-lg font-black mb-2" style={{ color: "var(--text-dark)" }}>
                                                Expand your circle
                                            </p>
                                            <p className="text-sm max-w-[280px] mx-auto leading-relaxed font-medium" style={{ color: "var(--text-light)" }}>
                                                Find fellow students, follow their progress, and keep those
                                                streaks alive together! 🔥
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                        </div>
                        
                        <RightSidebar
                            user={user}
                            handleSignOut={() => auth.signOut()}
                            getInitials={getInitials}
                        />
                    </main>

                    <CreateMeetModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        user={user}
                        getInitials={getInitials}
                    />

                    <CreatePostModal
                        isOpen={isPostModalOpen}
                        onClose={() => setIsPostModalOpen(false)}
                        user={user}
                    />
                </div>
            )}
        </>
    );
}

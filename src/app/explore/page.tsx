"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Sidebar } from "@/components/Sidebar";
import { CreatePostModal } from "@/components/CreatePostModal";
import { CreateMeetModal } from "@/components/CreateMeetModal";
import { useRooms } from "@/hooks/useRooms";
import { Compass, Video, Calendar, User, Search, Loader2 } from "lucide-react";

export default function ExplorePage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const { rooms, loading } = useRooms();
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                window.location.href = "/login";
            }
        });
        return () => unsubscribe();
    }, []);

    const getInitials = (name: string | null) => {
        return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
    };

    const filteredRooms = rooms.filter(room =>
        room.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.hostName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!user) return null;

    return (
        <div className="app-container">
            <Sidebar 
                user={user} 
                setIsModalOpen={setIsModalOpen} 
                setIsPostModalOpen={setIsPostModalOpen}
                getInitials={getInitials} 
            />

            <main className="main-content">
                <div className="max-w-6xl mx-auto p-6 space-y-8">
                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 overflow-hidden">
                        <div>
                            <h1 className="text-3xl font-black text-[var(--text-dark)] flex items-center gap-3 tracking-tight">
                                <Compass className="w-8 h-8 text-[var(--primary)]" />
                                Explore Study Rooms
                            </h1>
                            <p className="text-[var(--text-light)] mt-2 font-medium">Join live study sessions and collaborate with others in real-time.</p>
                        </div>

                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-light)] group-focus-within:text-[var(--primary)] transition-colors opacity-50" />
                            <input
                                type="text"
                                placeholder="Search by topic or host..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl pl-10 pr-4 py-2.5 w-full md:w-80 text-[var(--text-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all font-medium"
                            />
                        </div>
                    </div>

                    {/* Rooms Grid */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <Loader2 className="w-12 h-12 text-[var(--primary)] animate-spin" />
                            <p className="text-zinc-500">Finding active rooms...</p>
                        </div>
                    ) : filteredRooms.length === 0 ? (
                        <div className="bg-[var(--accent-bg)] border border-[var(--card-border)] rounded-[32px] p-12 text-center space-y-4">
                            <div className="w-16 h-16 bg-[var(--card-bg)] rounded-3xl flex items-center justify-center mx-auto mb-2 border border-[var(--card-border)]">
                                <Compass className="w-8 h-8 text-[var(--primary)] opacity-30" />
                            </div>
                            <h2 className="text-xl font-black text-[var(--text-dark)] tracking-tight">No rooms found</h2>
                            <p className="text-[var(--text-light)] max-w-sm mx-auto font-medium">
                                We couldn't find any active study rooms matching your search. Create one and invite others to join!
                            </p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="bg-[var(--primary)] text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-[var(--primary)]/20 hover:scale-[1.02] transition-all"
                            >
                                Create a New Room
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredRooms.map(room => (
                                <div key={room.id} className="group bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 hover:border-[var(--primary)]/30 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-xl hover:shadow-[var(--primary)]/10">
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 flex items-center justify-center text-xl font-bold shadow-inner">
                                                {room.hostInitials || getInitials(room.hostName)}
                                            </div>
                                            <div className="bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-green-500/20">
                                                Live Now
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xl font-bold text-[var(--text-dark)] group-hover:text-[var(--primary)] transition-colors line-clamp-1">{room.topic}</h3>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-light)]">
                                                <User className="w-3.5 h-3.5" />
                                                <span className="font-medium">Host: {room.hostId === user.uid ? 'You' : room.hostName}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 py-3 border-y border-[var(--card-border)]">
                                            <div className="flex items-center gap-2 text-xs text-[var(--text-light)] font-medium">
                                                <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
                                                {room.scheduleTime}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <a
                                            href={room.meetLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--accent-bg)] text-[var(--text-dark)] rounded-2xl group-hover:bg-[var(--primary)] group-hover:text-white transition-all font-bold shadow-sm"
                                        >
                                            <Video className="w-5 h-5" />
                                            Join Room
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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
    );
}

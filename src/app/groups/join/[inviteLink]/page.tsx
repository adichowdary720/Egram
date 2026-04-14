"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Users, LogIn, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function JoinGroupPage() {
    const params = useParams();
    const router = useRouter();
    const inviteLink = params.inviteLink as string;

    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [group, setGroup] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);
    const [joined, setJoined] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchGroup();
            } else {
                // Store intended destination and redirect to login
                localStorage.setItem('redirectAfterLogin', window.location.pathname);
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [inviteLink]);

    const fetchGroup = async () => {
        try {
            const res = await fetch(`/api/groups?inviteLink=${inviteLink}`);
            if (res.ok) {
                const data = await res.json();
                setGroup(data.group);
            } else {
                setError("Invalid or expired invite link.");
            }
        } catch (err) {
            setError("Failed to load group details.");
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!user || !group) return;
        setJoining(true);
        try {
            const res = await fetch(`/api/groups/${group._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_member',
                    userId: user.uid,
                    requesterId: user.uid
                })
            });

            if (res.ok) {
                setJoined(true);
                setTimeout(() => {
                    router.push('/messages');
                }, 2000);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to join group.");
            }
        } catch (err) {
            setError("An error occurred while joining.");
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl max-w-sm w-full text-center space-y-4">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                    <h2 className="text-xl font-bold text-white">Oops!</h2>
                    <p className="text-zinc-400">{error}</p>
                    <button
                        onClick={() => router.push('/messages')}
                        className="w-full py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                    >
                        Go to Messages
                    </button>
                </div>
            </div>
        );
    }

    if (joined) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
                <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/20 p-8 rounded-2xl max-w-sm w-full text-center space-y-4">
                    <CheckCircle className="w-12 h-12 text-[var(--primary)] mx-auto" />
                    <h2 className="text-xl font-bold text-white">Joined!</h2>
                    <p className="text-zinc-400">You are now a member of {group.name}. Redirecting...</p>
                </div>
            </div>
        );
    }

    const isAlreadyMember = group.memberIds.includes(user?.uid);

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-sm w-full text-center space-y-6 shadow-2xl">
                <div className="w-20 h-20 rounded-2xl bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30 flex items-center justify-center mx-auto shadow-inner">
                    {group.avatarUrl ? (
                        <img src={group.avatarUrl} alt={group.name} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                        <Users className="w-10 h-10" />
                    )}
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">{group.name}</h2>
                    <p className="text-zinc-500 text-sm">You've been invited to join this group chat</p>
                </div>

                <div className="flex items-center justify-center gap-4 text-sm text-zinc-400">
                    <div className="flex flex-col">
                        <span className="text-white font-bold">{group.memberIds.length}</span>
                        <span>Members</span>
                    </div>
                    <div className="w-px h-8 bg-zinc-800" />
                    <div className="flex flex-col">
                        <span className="text-white font-bold">{group.adminIds.length}</span>
                        <span>Admins</span>
                    </div>
                </div>

                {isAlreadyMember ? (
                    <button
                        onClick={() => router.push('/messages')}
                        className="w-full py-3 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-all font-semibold flex items-center justify-center gap-2"
                    >
                        Already a member (Go to Chat)
                    </button>
                ) : (
                    <button
                        onClick={handleJoin}
                        disabled={joining}
                        className="w-full py-3 bg-[var(--primary)] text-white rounded-xl hover:brightness-110 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                        Join Group
                    </button>
                )}

                <button
                    onClick={() => router.push('/messages')}
                    className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
                >
                    Maybe later
                </button>
            </div>
        </div>
    );
}

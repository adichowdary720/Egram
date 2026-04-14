import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { X, Bell, UserPlus, Heart, MessageCircle, FileText, CheckCircle, Users } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

interface NotificationsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

interface Notification {
    _id: string;
    type: 'follow' | 'like' | 'comment' | 'mention' | 'message' | 'group_message';
    sourceUserId: { name: string; avatarUrl: string };
    message: string;
    isRead: boolean;
    createdAt: string;
}

export function NotificationsPanel({ isOpen, onClose, user }: NotificationsPanelProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !user) return;

        const fetchNotifications = async () => {
            try {
                const res = await fetch(`/api/notifications/${user.uid}`);
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data.notifications || []);
                }
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
            } finally {
                setLoading(false);
            }
        };

        // Initial fetch
        setLoading(true);
        fetchNotifications();

        // Set up polling interval (10 seconds)
        const intervalId = setInterval(fetchNotifications, 10000);

        return () => clearInterval(intervalId);
    }, [isOpen, user]);

    const markAsRead = async (id: string) => {
        try {
            await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'follow': return <UserPlus className="w-5 h-5 text-purple-500" />;
            case 'like': return <Heart className="w-5 h-5 text-pink-500" />;
            case 'message': return <MessageCircle className="w-5 h-5 text-blue-500" />;
            case 'group_message': return <Users className="w-5 h-5 text-indigo-500" />;
            default: return <Bell className="w-5 h-5 text-zinc-400" />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm lg:hidden"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                        className="fixed top-0 left-0 h-full w-[350px] max-w-[85vw] glass border-r border-zinc-800 z-50 flex flex-col shadow-2xl"
                    >
                        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Bell className="w-5 h-5" /> Notifications
                            </h2>
                            <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800/50 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex gap-3 p-3 animate-pulse bg-zinc-900/50 rounded-xl">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800" />
                                            <div className="flex-1 space-y-2 py-1">
                                                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                                                <div className="h-3 bg-zinc-800 rounded w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="text-center py-10 text-zinc-500">
                                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <div
                                        key={notif._id}
                                        onClick={() => markAsRead(notif._id)}
                                        className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-all ${notif.isRead ? 'bg-transparent hover:bg-zinc-900/50' : 'bg-[var(--primary)]/10 border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20'}`}
                                    >
                                        <div className="relative">
                                            {notif.sourceUserId?.avatarUrl ? (
                                                <img src={notif.sourceUserId.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold">
                                                    {notif.sourceUserId?.name ? notif.sourceUserId.name.substring(0, 2).toUpperCase() : 'U'}
                                                </div>
                                            )}
                                            <div className="absolute -bottom-1 -right-1 bg-zinc-950 rounded-full p-1 border-2 border-zinc-950">
                                                {getIcon(notif.type)}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-zinc-300">
                                                <span className="font-bold text-white mr-1">{notif.sourceUserId?.name || "Someone"}</span>
                                                {notif.type === 'follow' ? " started following you." :
                                                    notif.type === 'message' ? " sent you a message." :
                                                        notif.type === 'group_message' ? " sent a message to your group." :
                                                            " " + notif.message}
                                            </p>
                                            <p className="text-xs text-[var(--primary)] mt-1 font-medium">
                                                {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        {!notif.isRead && (
                                            <div className="w-2 h-2 rounded-full bg-[var(--primary)] self-center flex-shrink-0" />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

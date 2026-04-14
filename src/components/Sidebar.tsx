"use client";
import { Home, Search, Compass, MessageSquare, PlusSquare, Moon, Sun, User as UserIcon, Bell, Video } from "lucide-react";
import { User } from "firebase/auth";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { NotificationsPanel } from "./NotificationsPanel";
import { useStreak } from "@/hooks/useStreak";

interface SidebarProps {
    user: User;
    setIsModalOpen: (val: boolean) => void;
    setIsPostModalOpen?: (val: boolean) => void;
    getInitials: (name: string | null) => string;
}

export function Sidebar({ user, setIsModalOpen, setIsPostModalOpen, getInitials }: SidebarProps) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Call streak hook to register login and maintain daily streak
    useStreak(user);

    useEffect(() => {
        setMounted(true);
        if (user) {
            // Fetch unread count initially
            fetch(`/api/notifications/${user.uid}`)
                .then(res => res.json())
                .then(data => {
                    if (data.notifications) {
                        const unread = data.notifications.filter((n: any) => !n.isRead).length;
                        setUnreadCount(unread);
                    }
                })
                .catch(err => console.error(err));
        }
    }, [user]);

    return (
        <aside className="sidebar glass">
            <div className="nav-brand text-[var(--text-dark)]">Egram.</div>

            <ul className="nav-links">
                <Link href="/">
                    <li className="active"><Home /> <span>Home</span></li>
                </Link>
                <Link href="/search">
                    <li><Search /> <span>Search</span></li>
                </Link>
                <Link href="/explore">
                    <li><Compass /> <span>Explore Rooms</span></li>
                </Link>

                <li onClick={() => { setIsNotificationsOpen(true); setUnreadCount(0); }} className="cursor-pointer relative">
                    <Bell /> <span>Notifications</span>
                    {unreadCount > 0 && (
                        <div className="absolute top-2 left-6 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-[var(--card-bg)]">
                            {unreadCount}
                        </div>
                    )}
                </li>

                <Link href="/messages">
                    <li><MessageSquare /> <span>Messages</span></li>
                </Link>

                <li onClick={() => setIsPostModalOpen?.(true)} className="cursor-pointer">
                    <PlusSquare /> <span>Create Post</span>
                </li>
                <li onClick={() => setIsModalOpen(true)} className="cursor-pointer">
                    <Video /> <span>Create Meet</span>
                </li>

                <Link href={`/profile/${user.uid}`}>
                    <li>
                        <div className="avatar-small">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                getInitials(user.displayName || user.email)
                            )}
                        </div>
                        <span>Profile</span>
                    </li>
                </Link>
            </ul>

            <button
                className="icon-btn mt-auto flex items-center gap-4 p-4 text-left w-full hover:bg-[var(--card-border)] rounded-lg transition-colors"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
                {mounted && theme === "dark" ? <Sun /> : <Moon />} <span>Theme</span>
            </button>

            <NotificationsPanel
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                user={user}
            />
        </aside>
    );
}

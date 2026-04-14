"use client";

import { useState, useEffect, useRef } from "react";

import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, storage } from "@/lib/firebase";
import { Sidebar } from "@/components/Sidebar";
import { CreateMeetModal } from "@/components/CreateMeetModal";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { CreatePostModal } from "@/components/CreatePostModal";
import { GroupInfoModal } from "@/components/GroupInfoModal";
import { Send, User as UserIcon, MessageSquare, ImageIcon, Clock, Users, Plus, Info, Camera } from "lucide-react";
import Link from "next/link";
import { useScreenshotDetection } from "@/hooks/useScreenshotDetection";

export default function MessagesPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [conversations, setConversations] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct');
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [isGroupInfoModalOpen, setIsGroupInfoModalOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [chatWallpapers, setChatWallpapers] = useState<Record<string, string>>({});
    const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
    const [allowScreenshotNotifications, setAllowScreenshotNotifications] = useState(true);
    const [isUploadingWallpaper, setIsUploadingWallpaper] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchContacts(currentUser.uid);
                fetchGroups(currentUser.uid);
            } else {
                window.location.href = "/login";
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchContacts = async (uid: string) => {
        try {
            const res = await fetch(`/api/users/${uid}`);
            if (res.ok) {
                const userData = await res.json();

                // Load existing wallpapers and blocked users
                if (userData.chatWallpapers) {
                    setChatWallpapers(userData.chatWallpapers);
                }
                if (userData.blockedUsers) {
                    setBlockedUsers(userData.blockedUsers);
                }
                if (userData.allowScreenshotNotifications !== undefined) {
                    setAllowScreenshotNotifications(userData.allowScreenshotNotifications);
                }

                const contactIds = Array.from(new Set([...(userData.following || []), ...(userData.followers || [])]));

                // Fetch profiles for these contact IDs
                const contactsData = [];
                for (const contactId of contactIds) {
                    const contactRes = await fetch(`/api/users/${contactId}`);
                    if (contactRes.ok) {
                        contactsData.push(await contactRes.json());
                    }
                }
                setConversations(contactsData);
            }
        } catch (error) {
            console.error("Error fetching contacts:", error);
        } finally {
            setLoadingContacts(false);
        }
    };

    const fetchGroups = async (uid: string) => {
        try {
            const res = await fetch(`/api/groups?userId=${uid}`);
            if (res.ok) {
                const data = await res.json();
                setGroups(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching groups:", error);
        }
    };

    const fetchMessages = async (contactId: string, isGroup: boolean = false) => {
        if (!user) return;
        try {
            const url = isGroup
                ? `/api/messages?groupId=${contactId}`
                : `/api/messages?user1=${user.uid}&user2=${contactId}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.data || []);
                scrollToBottom();
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    useEffect(() => {
        if (selectedUser) {
            fetchMessages(selectedUser.firebaseUid, false);
            const interval = setInterval(() => {
                fetchMessages(selectedUser.firebaseUid, false);
            }, 5000);
            return () => clearInterval(interval);
        } else if (selectedGroup) {
            fetchMessages(selectedGroup._id, true);
            const interval = setInterval(() => {
                fetchMessages(selectedGroup._id, true);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [selectedUser, selectedGroup]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || (!selectedUser && !selectedGroup)) return;

        const content = newMessage.trim();
        setNewMessage("");

        const receiverId = selectedGroup ? undefined : selectedUser.firebaseUid;
        const groupId = selectedGroup ? selectedGroup._id : undefined;

        // Optimistic UI update
        const tempMessage = {
            id: Date.now().toString(),
            senderId: user.uid,
            receiverId,
            groupId,
            content,
            createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMessage]);
        scrollToBottom();

        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderId: user.uid,
                    receiverId,
                    groupId,
                    content
                })
            });
            if (!res.ok) {
                const errorData = await res.json();
                if (res.status === 403) {
                    alert(errorData.error || "Action forbidden");
                } else {
                    throw new Error("Failed to send message");
                }
            }
            // Message synced successfully
        } catch (error) {
            console.error(error);
            // Revert optimistic update on failure
            setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        }
    };

    const handleScreenshotDetected = async () => {
        if (!user || (!selectedUser && !selectedGroup)) return;

        const content = "[System]: 📸 User took a screenshot!";
        const receiverId = selectedGroup ? undefined : selectedUser.firebaseUid;
        const groupId = selectedGroup ? selectedGroup._id : undefined;

        try {
            await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderId: user.uid,
                    receiverId,
                    groupId,
                    content
                })
            });
            fetchMessages(selectedGroup ? selectedGroup._id : selectedUser.firebaseUid, !!selectedGroup);
        } catch (error) {
            console.error("Failed to send screenshot notification:", error);
        }
    };

    useScreenshotDetection(allowScreenshotNotifications && !!(selectedUser || selectedGroup), handleScreenshotDetected);

    const handleBlockUser = async (targetId: string, action: 'block' | 'unblock') => {
        if (!user) return;
        try {
            const res = await fetch(`/api/users/${user.uid}/block`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: targetId, action })
            });

            if (res.ok) {
                const data = await res.json();
                setBlockedUsers(data.blockedUsers);
            }
        } catch (error) {
            console.error("Failed to block/unblock user:", error);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!user || !selectedGroup) return;
        try {
            const res = await fetch(`/api/groups/${selectedGroup._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'remove_member',
                    userId: memberId,
                    requesterId: user.uid
                })
            });

            if (res.ok) {
                const data = await res.json();
                setSelectedGroup(data.group);
                // Update groups list
                setGroups(prev => prev.map(g => g._id === data.group._id ? data.group : g));
            }
        } catch (error) {
            console.error("Failed to remove member:", error);
        }
    };

    const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || (!selectedUser && !selectedGroup)) return;

        setIsUploadingWallpaper(true);
        const targetId = selectedGroup ? selectedGroup._id : selectedUser.firebaseUid;

        try {
            const storagePath = `wallpapers/${user.uid}/${targetId}/${Date.now()}_${file.name}`;
            const fileRef = storageRef(storage, storagePath);
            const snapshot = await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Update local state
            const newWallpapers = { ...chatWallpapers, [targetId]: downloadURL };
            setChatWallpapers(newWallpapers);

            // Save to DB
            await fetch(`/api/users/${user.uid}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatWallpapers: newWallpapers })
            });

        } catch (error) {
            console.error("Failed to upload wallpaper", error);
        } finally {
            setIsUploadingWallpaper(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const getInitials = (name: string | null) => {
        return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
    };

    if (!user) return null;

    const activeChatEntity = selectedGroup || selectedUser;
    const activeChatId = selectedGroup ? selectedGroup._id : (selectedUser ? selectedUser.firebaseUid : null);

    return (
        <div className="app-container">
            <Sidebar
                user={user}
                setIsModalOpen={setIsModalOpen}
                setIsPostModalOpen={setIsPostModalOpen}
                getInitials={getInitials}
            />

            <main className="main-content" style={{ display: "flex", padding: "1rem" }}>
                <div className="messaging-container card glass" style={{ display: "flex", width: "100%", height: "calc(100vh - 2rem)", borderRadius: "12px", overflow: "hidden" }}>

                    {/* Contacts List */}
                    <div className={`contacts-list ${activeChatId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[320px] border-r border-[var(--card-border)]`}>
                        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--card-border)" }}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Messages</h2>
                                {activeTab === 'groups' && (
                                    <button
                                        onClick={() => setIsCreateGroupModalOpen(true)}
                                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors flex items-center justify-center bg-zinc-800/50 border border-zinc-700"
                                        title="Create New Group"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Tabs */}
                            <div className="flex bg-[var(--accent-bg)] p-1 rounded-xl border border-[var(--card-border)] overflow-hidden shadow-inner mt-2">
                                <button
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'direct' ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--text-light)] hover:bg-[var(--card-hover)]'}`}
                                    onClick={() => setActiveTab('direct')}
                                >
                                    Direct
                                </button>
                                <button
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'groups' ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--text-light)] hover:bg-[var(--card-hover)]'}`}
                                    onClick={() => setActiveTab('groups')}
                                >
                                    Groups
                                </button>
                            </div>
                        </div>

                        <div style={{ overflowY: "auto", flex: 1 }}>
                            {activeTab === 'direct' ? (
                                loadingContacts ? (
                                    <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-light)" }}>Loading...</div>
                                ) : conversations.length === 0 ? (
                                    <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
                                        <div className="w-16 h-16 rounded-full bg-[var(--primary-bg)] text-[var(--primary)] flex items-center justify-center mx-auto mb-4 border border-[var(--primary)]/20">
                                            <Users className="w-8 h-8" />
                                        </div>
                                        <h3 className="font-bold text-[var(--text-dark)] mb-2">No contacts yet</h3>
                                        <p style={{ color: "var(--text-light)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>Follow people to start messaging!</p>
                                        <Link href="/search" className="inline-block bg-[var(--primary)] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-[var(--primary)]/30 hover:scale-[1.02] transition-transform">
                                            Find People
                                        </Link>
                                    </div>
                                ) : (
                                    conversations.map(contact => (
                                        <div
                                            key={contact.firebaseUid}
                                            onClick={() => { setSelectedUser(contact); setSelectedGroup(null); }}
                                            style={{
                                                padding: "1rem 1.5rem",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "1rem",
                                                cursor: "pointer",
                                                background: selectedUser?.firebaseUid === contact.firebaseUid ? "var(--card-hover)" : "transparent",
                                                borderBottom: "1px solid var(--card-border)",
                                                transition: "background 0.2s"
                                            }}
                                            className="hover:bg-[var(--card-hover)]"
                                        >
                                            <div className="avatar cursor-pointer" style={{ width: "40px", height: "40px", flexShrink: 0 }}>
                                                {contact.avatarUrl ? (
                                                    <img src={contact.avatarUrl} alt={contact.name} />
                                                ) : (
                                                    <div className="avatar-placeholder">{getInitials(contact.name)}</div>
                                                )}
                                            </div>
                                            <div style={{ overflow: "hidden" }}>
                                                <h3 style={{ fontSize: "1rem", fontWeight: 500, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", color: blockedUsers.includes(contact.firebaseUid) ? 'var(--text-light)' : 'inherit' }}>
                                                    {contact.name} {blockedUsers.includes(contact.firebaseUid) && <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded ml-1 border border-red-500/20">Blocked</span>}
                                                </h3>
                                            </div>
                                        </div>
                                    ))
                                )
                            ) : (
                                groups.length === 0 ? (
                                    <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-light)" }}>You are not in any groups yet.</div>
                                ) : (
                                    groups.map(group => (
                                        <div
                                            key={group._id}
                                            onClick={() => { setSelectedGroup(group); setSelectedUser(null); }}
                                            style={{
                                                padding: "1rem 1.5rem",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "1rem",
                                                cursor: "pointer",
                                                background: selectedGroup?._id === group._id ? "var(--card-hover)" : "transparent",
                                                borderBottom: "1px solid var(--card-border)",
                                                transition: "background 0.2s"
                                            }}
                                            className="hover:bg-[var(--card-hover)]"
                                        >
                                            <div className="avatar cursor-pointer" style={{ width: "40px", height: "40px", flexShrink: 0 }}>
                                                {group.avatarUrl ? (
                                                    <img src={group.avatarUrl} alt={group.name} />
                                                ) : (
                                                    <div className="avatar-placeholder rounded-xl bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30">
                                                        <Users size={20} />
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ overflow: "hidden" }}>
                                                <h3 style={{ fontSize: "1rem", fontWeight: 500, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{group.name}</h3>
                                                <p className="text-xs text-zinc-500">{group.memberIds?.length || 0} members</p>
                                            </div>
                                        </div>
                                    ))
                                )
                            )}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div
                        className={`chat-area relative ${!activeChatId ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}
                        style={{
                            background: "var(--background)",
                            backgroundImage: activeChatId && chatWallpapers[activeChatId]
                                ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${chatWallpapers[activeChatId]})`
                                : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}
                    >
                        {activeChatId ? (
                            <>
                                {/* Custom File Input for Wallpaper */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleWallpaperUpload}
                                    accept="image/*"
                                    className="hidden"
                                />

                                <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", gap: "1rem", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)" }}>
                                    <button
                                        className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white"
                                        onClick={() => { setSelectedGroup(null); setSelectedUser(null); }}
                                    >
                                        &larr;
                                    </button>
                                    <div className="avatar cursor-pointer" style={{ width: "40px", height: "40px", flexShrink: 0 }}>
                                        {activeChatEntity.avatarUrl ? (
                                            <img src={activeChatEntity.avatarUrl} alt={activeChatEntity.name} />
                                        ) : (
                                            <div className={`avatar-placeholder ${selectedGroup ? 'rounded-xl bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30' : ''}`}>
                                                {selectedGroup ? <Users size={20} /> : getInitials(activeChatEntity.name)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>{activeChatEntity.name}</h3>
                                        {selectedGroup && (
                                            <p className="text-xs text-zinc-400">{selectedGroup.memberIds?.length || 0} members</p>
                                        )}
                                    </div>

                                    <div className="flex-1 flex justify-end gap-2">
                                        {selectedGroup && (
                                            <button
                                                onClick={() => setIsGroupInfoModalOpen(true)}
                                                className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
                                                title="Group Details & Members"
                                            >
                                                <Info className="w-5 h-5" />
                                            </button>
                                        )}
                                        {selectedUser && (
                                            <button
                                                onClick={() => handleBlockUser(selectedUser.firebaseUid, blockedUsers.includes(selectedUser.firebaseUid) ? 'unblock' : 'block')}
                                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${blockedUsers.includes(selectedUser.firebaseUid) ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}
                                            >
                                                {blockedUsers.includes(selectedUser.firebaseUid) ? 'Unblock' : 'Block'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                const newValue = !allowScreenshotNotifications;
                                                setAllowScreenshotNotifications(newValue);
                                                fetch(`/api/users/${user.uid}`, {
                                                    method: "PUT",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ allowScreenshotNotifications: newValue })
                                                });
                                            }}
                                            className={`p-2 rounded-full transition-colors flex items-center justify-center ${allowScreenshotNotifications ? 'text-[var(--primary)] hover:bg-white/10' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/10'}`}
                                            title={allowScreenshotNotifications ? "Screenshot Notifications: ON" : "Screenshot Notifications: OFF"}
                                        >
                                            <Camera className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploadingWallpaper}
                                            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
                                            title="Change Chat Wallpaper"
                                        >
                                            {isUploadingWallpaper ? (
                                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                <ImageIcon className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* 24-hour Expiry Notice */}
                                <div className="w-full flex justify-center mt-4 mb-2 opacity-80">
                                    <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-full px-4 py-1.5 flex items-center gap-2 text-xs text-zinc-300 shadow-md">
                                        <Clock className="w-3.5 h-3.5 text-orange-400" />
                                        Messages disappear 24 hours after they are sent.
                                    </div>
                                </div>

                                <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    {messages.map((msg, index) => {
                                        const isMine = msg.senderId === user.uid;
                                        // For groups: try to find the sender's details in `conversations` (a bit of a hack since we don't populate message senders natively here)
                                        const senderDetails = selectedGroup && !isMine ? conversations.find(c => c.firebaseUid === msg.senderId) : null;

                                        return (
                                            <div key={msg._id || msg.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", gap: "0.5rem", alignItems: "flex-end" }}>
                                                {selectedGroup && !isMine && (
                                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0 mb-1">
                                                        {senderDetails?.avatarUrl ? (
                                                            <img src={senderDetails.avatarUrl} alt={senderDetails.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs font-semibold bg-zinc-800 text-zinc-300">
                                                                {getInitials(senderDetails?.name || '?')}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                                                    {selectedGroup && !isMine && senderDetails && (
                                                        <span className="text-xs text-zinc-400 font-medium ml-2 mb-1">{senderDetails.name}</span>
                                                    )}
                                                    <div style={{
                                                        padding: "0.8rem 1.2rem",
                                                        borderRadius: isMine ? "16px 16px 0 16px" : "16px 16px 16px 0",
                                                        background: isMine ? "var(--primary)" : "var(--card-border)",
                                                        color: isMine ? "white" : "var(--text-dark)",
                                                        fontSize: "0.95rem",
                                                        boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
                                                    }}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--card-border)", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)" }}>
                                    {selectedUser && blockedUsers.includes(selectedUser.firebaseUid) ? (
                                        <div className="text-center py-2 text-sm text-zinc-500 italic">
                                            You have blocked this user. Unblock to send messages.
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "1rem" }}>
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                placeholder="Type a message..."
                                                style={{
                                                    flex: 1,
                                                    padding: "0.8rem 1.2rem",
                                                    borderRadius: "24px",
                                                    border: "1px solid var(--card-border)",
                                                    background: "var(--background)",
                                                    color: "var(--text-dark)",
                                                    outline: "none"
                                                }}
                                            />
                                            <button
                                                type="submit"
                                                disabled={!newMessage.trim()}
                                                style={{
                                                    background: newMessage.trim() ? "var(--primary)" : "var(--card-border)",
                                                    color: newMessage.trim() ? "white" : "var(--text-light)",
                                                    border: "none",
                                                    borderRadius: "50%",
                                                    width: "45px",
                                                    height: "45px",
                                                    display: "flex",
                                                    justifyContent: "center",
                                                    alignItems: "center",
                                                    cursor: newMessage.trim() ? "pointer" : "not-allowed",
                                                    transition: "all 0.2s"
                                                }}
                                            >
                                                <Send size={20} />
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "var(--text-light)" }}>
                                <MessageSquare size={48} style={{ marginBottom: "1rem", opacity: 0.5 }} />
                                <h2>Select a conversation to start messaging</h2>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <CreateMeetModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                user={user}
                getInitials={getInitials}
            />

            <CreateGroupModal
                isOpen={isCreateGroupModalOpen}
                onClose={() => setIsCreateGroupModalOpen(false)}
                user={user}
                contacts={conversations}
                onGroupCreated={(newGroup) => {
                    setGroups(prev => [newGroup, ...prev]);
                    setActiveTab('groups');
                    setSelectedGroup(newGroup);
                    setSelectedUser(null);
                }}
                getInitials={getInitials}
            />

            <CreatePostModal
                isOpen={isPostModalOpen}
                onClose={() => setIsPostModalOpen(false)}
                user={user}
            />

            <GroupInfoModal
                isOpen={isGroupInfoModalOpen}
                onClose={() => setIsGroupInfoModalOpen(false)}
                group={selectedGroup}
                user={user}
                onRemoveMember={handleRemoveMember}
                getInitials={getInitials}
                conversations={conversations}
            />
        </div>
    );
}

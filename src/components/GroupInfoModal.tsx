import React from 'react';
import { X, UserMinus, Link, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface GroupInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: any;
    user: any;
    onRemoveMember: (userId: string) => void;
    getInitials: (name: string) => string;
    conversations: any[]; // Used to find member names/avatars
}

export function GroupInfoModal({ isOpen, onClose, group, user, onRemoveMember, getInitials, conversations }: GroupInfoModalProps) {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !group) return null;

    const isAdmin = group.adminIds.includes(user.uid);
    const inviteUrl = `${window.location.origin}/groups/join/${group.inviteLink}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Group Info</h2>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Group Header */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-20 h-20 rounded-2xl bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30 flex items-center justify-center">
                            {group.avatarUrl ? (
                                <img src={group.avatarUrl} alt={group.name} className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                                <span className="text-3xl font-bold">{getInitials(group.name)}</span>
                            )}
                        </div>
                        <h3 className="text-2xl font-bold text-white">{group.name}</h3>
                        <p className="text-zinc-500 text-sm">{group.memberIds.length} members</p>
                    </div>

                    {/* Invite Link Section (Admin Only or for joining) */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
                            <Link className="w-4 h-4" /> Invite Link
                        </h4>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                readOnly
                                value={inviteUrl}
                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none"
                            />
                            <button
                                onClick={handleCopyLink}
                                className="p-2 bg-[var(--primary)] text-white rounded-lg hover:brightness-110 transition-all flex items-center justify-center min-w-[40px]"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Member List */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-zinc-400">Members</h4>
                        <div className="max-h-[250px] overflow-y-auto space-y-2 custom-scrollbar pr-2">
                            {group.memberIds.map((memberId: string) => {
                                const isMe = memberId === user.uid;
                                const isMemberAdmin = group.adminIds.includes(memberId);
                                // Try to find member details from conversations list (shallow check)
                                const memberDetails = conversations.find(c => c.firebaseUid === memberId);

                                return (
                                    <div key={memberId} className="flex items-center justify-between p-2 hover:bg-zinc-800/30 rounded-xl transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-sm font-bold">
                                                {memberDetails?.avatarUrl ? (
                                                    <img src={memberDetails.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    <span>{getInitials(memberDetails?.name || (isMe ? user.displayName : 'User'))}</span>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white text-sm font-medium">
                                                    {isMe ? 'You' : (memberDetails?.name || 'Unknown User')}
                                                </span>
                                                {isMemberAdmin && <span className="text-[10px] text-[var(--primary)] font-bold uppercase tracking-wider">Admin</span>}
                                            </div>
                                        </div>
                                        {isAdmin && !isMe && (
                                            <button
                                                onClick={() => onRemoveMember(memberId)}
                                                className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="Remove Member"
                                            >
                                                <UserMinus className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

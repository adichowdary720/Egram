import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    contacts: any[];
    onGroupCreated: (newGroup: any) => void;
    getInitials: (name: string) => string;
}

export function CreateGroupModal({ isOpen, onClose, user, contacts, onGroupCreated, getInitials }: CreateGroupModalProps) {
    const [groupName, setGroupName] = useState('');
    const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const toggleContact = (uid: string) => {
        const newSelected = new Set(selectedContacts);
        if (newSelected.has(uid)) {
            newSelected.delete(uid);
        } else {
            newSelected.add(uid);
        }
        setSelectedContacts(newSelected);
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim() || selectedContacts.size === 0) return;

        setIsLoading(true);
        try {
            // Include creator in members and admins
            const memberIds = [user.uid, ...Array.from(selectedContacts)];

            const res = await fetch('/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: groupName.trim(),
                    adminIds: [user.uid],
                    memberIds: memberIds
                })
            });

            if (res.ok) {
                const data = await res.json();
                onGroupCreated(data.group);
                onClose();
                setGroupName('');
                setSelectedContacts(new Set());
            }
        } catch (error) {
            console.error('Failed to create group:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                    <h2 className="text-xl font-bold text-white">New Group</h2>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-6">
                    {/* Group Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Group Name</label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Awesome Team..."
                            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Contacts Selection */}
                    <div className="flex flex-col gap-2">
                        <label className="block text-sm font-medium text-zinc-400">Select Members ({selectedContacts.size} selected)</label>
                        <div className="max-h-[250px] overflow-y-auto pr-2 flex flex-col gap-2 custom-scrollbar">
                            {contacts.length === 0 ? (
                                <p className="text-zinc-500 text-sm text-center py-4">No contacts found to add.</p>
                            ) : (
                                contacts.map(contact => (
                                    <div
                                        key={contact.firebaseUid}
                                        onClick={() => toggleContact(contact.firebaseUid)}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedContacts.has(contact.firebaseUid) ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-zinc-800 bg-zinc-800/20 hover:bg-zinc-800/50'}`}
                                    >
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-700 flex items-center justify-center flex-shrink-0">
                                                {contact.avatarUrl ? (
                                                    <img src={contact.avatarUrl} alt={contact.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-zinc-300 text-sm font-medium">{getInitials(contact.name)}</span>
                                                )}
                                            </div>
                                            {selectedContacts.has(contact.firebaseUid) && (
                                                <div className="absolute -bottom-1 -right-1 bg-[var(--primary)] rounded-full p-0.5 border-2 border-zinc-900">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium truncate">{contact.name}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreateGroup}
                        disabled={!groupName.trim() || selectedContacts.size === 0 || isLoading}
                        className="px-5 py-2.5 rounded-xl font-medium bg-[var(--primary)] text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {isLoading ? 'Creating...' : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>
    );
}

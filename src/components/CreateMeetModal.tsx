import { useState } from "react";
import { X, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRooms } from "@/hooks/useRooms";
import { User } from "firebase/auth";
import { useToast } from "@/components/ToastProvider";

interface CreateMeetModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    getInitials: (name: string | null) => string;
}

export function CreateMeetModal({ isOpen, onClose, user, getInitials }: CreateMeetModalProps) {
    const { createRoom } = useRooms();
    const { addToast } = useToast();
    const [topic, setTopic] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!topic || !scheduleTime) return;

        setIsSubmitting(true);
        const success = await createRoom({
            topic,
            scheduleTime,
            hostId: user.uid,
            hostName: user.displayName || user.email || "Student",
            hostInitials: getInitials(user.displayName || user.email),
        });
        setIsSubmitting(false);

        if (success) {
            addToast("Study room created and linked generated successfully!", "success");
            setTopic("");
            setScheduleTime("");
            onClose();
        } else {
            addToast("Failed to create room. Please try again.", "error");
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="modal-overlay active"
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="modal card glass"
                        style={{ padding: "1.5rem", maxWidth: "400px", borderRadius: "12px", width: "100%" }}
                        onClick={e => e.stopPropagation()}
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", alignItems: "center" }}>
                            <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Create Study Room</h2>
                            <button className="icon-btn" onClick={onClose}><X size={20} /></button>
                        </div>

                        <div className="modal-body flex flex-col gap-4">
                            <div className="form-group flex flex-col gap-2">
                                <label className="text-sm font-bold text-[var(--text-dark)]">Focus Topic</label>
                                <input
                                    type="text"
                                    placeholder="E.g., System Design Prep"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-[var(--text-dark)] font-medium focus:outline-none focus:border-[var(--primary)] transition-colors"
                                />
                            </div>

                            <div className="form-group flex flex-col gap-2">
                                <label className="text-sm font-bold text-[var(--text-dark)]">Schedule Time</label>
                                <div className="relative">
                                    <input
                                        type="time"
                                        value={scheduleTime}
                                        onChange={(e) => setScheduleTime(e.target.value)}
                                        className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-[var(--text-dark)] font-medium focus:outline-none focus:border-[var(--primary)] transition-colors appearance-none"
                                    />
                                    {!scheduleTime && (
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[var(--text-light)]">
                                            Select time (e.g. 14:30)
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={handleSubmit}
                                disabled={isSubmitting || !topic || !scheduleTime}
                                style={{
                                    width: "100%", padding: "0.8rem", borderRadius: "8px", fontWeight: 600,
                                    background: isSubmitting || !topic || !scheduleTime ? "var(--card-border)" : "var(--primary)",
                                    color: isSubmitting || !topic || !scheduleTime ? "var(--text-light)" : "white",
                                    display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem",
                                    border: "none", cursor: isSubmitting || !topic || !scheduleTime ? "not-allowed" : "pointer",
                                    marginTop: "0.5rem", transition: "all 0.2s"
                                }}
                            >
                                <Calendar size={18} /> {isSubmitting ? "Generating..." : "Generate Jitsi Meet (59m limit)"}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

import { useState, useRef } from "react";
import { X, Image as ImageIcon, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "firebase/auth";
import { useToast } from "@/components/ToastProvider";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

export function CreatePostModal({ isOpen, onClose, user }: CreatePostModalProps) {
    const { addToast } = useToast();
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!content.trim() && !imageFile) return;

        setIsSubmitting(true);
        try {
            let mediaUrl = "";
            if (imageFile) {
                const path = `posts/${user.uid}/${Date.now()}_${imageFile.name}`;
                const fileRef = storageRef(storage, path);
                const snapshot = await uploadBytes(fileRef, imageFile);
                mediaUrl = await getDownloadURL(snapshot.ref);
            }

            const res = await fetch("/api/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    authorId: user.uid,
                    content,
                    images: mediaUrl ? [mediaUrl] : [],
                }),
            });

            if (res.ok) {
                addToast("Post shared successfully!", "success");
                setContent("");
                setImageFile(null);
                setImagePreview(null);
                onClose();
                window.dispatchEvent(new Event("postCreated"));
            } else {
                throw new Error("Failed to create post");
            }
        } catch (error) {
            console.error("Post creation error:", error);
            addToast("Failed to share post. Please try again.", "error");
        } finally {
            setIsSubmitting(false);
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
                        style={{ padding: "1.5rem", maxWidth: "500px", borderRadius: "24px", width: "100%" }}
                        onClick={e => e.stopPropagation()}
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Share Your Progress</h2>
                            <button className="icon-btn" onClick={onClose}><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full bg-zinc-950/20 border border-[var(--card-border)] rounded-2xl p-4 text-[var(--text-dark)] focus:outline-none focus:border-[var(--primary)] resize-none h-32"
                                placeholder="What did you learn today?"
                            />

                            {imagePreview && (
                                <div className="relative rounded-2xl overflow-hidden border border-[var(--card-border)] aspect-video bg-black/40">
                                    <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                    <button 
                                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                                        className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 p-3 rounded-xl hover:bg-white/5 transition-colors text-[var(--text-light)]"
                                >
                                    <ImageIcon size={20} className="text-blue-500" />
                                    <span className="text-xs font-bold">Add Image</span>
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleImageChange}
                                />

                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || (!content.trim() && !imageFile)}
                                    className="flex items-center gap-2 bg-[var(--primary)] text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Send size={16} />
                                    )}
                                    {isSubmitting ? "Posting..." : "Post"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

import { useState, useRef } from "react";
import { User } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { X, Image as ImageIcon, CheckCircle } from "lucide-react";
import { useToast } from "./ToastProvider";
import { motion, AnimatePresence } from "framer-motion";

interface CreateCertificateModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

export function CreateCertificateModal({ isOpen, onClose, user }: CreateCertificateModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                addToast("Image size should be less than 5MB", "error");
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setTitle("");
            setDescription("");
            handleRemoveImage();
            setIsSubmitting(false);
        }, 300);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            addToast("Please provide a title", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            let imageUrl = null;

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Request timed out. Please check your connection.")), 15000)
            );

            if (imageFile) {
                // Upload image to Firebase Storage with timeout
                const storageRef = ref(storage, `certificates/${user.uid}/${Date.now()}_${imageFile.name}`);
                const uploadPromise = async () => {
                    const snapshot = await uploadBytes(storageRef, imageFile);
                    return await getDownloadURL(snapshot.ref);
                };
                imageUrl = await Promise.race([uploadPromise(), timeoutPromise]);
            }

            // Save to Firestore with timeout
            const firestorePromise = addDoc(collection(db, "certificates"), {
                userId: user.uid,
                title: title.trim(),
                description: description.trim(),
                imageUrl,
                timestamp: serverTimestamp(),
            });
            await Promise.race([firestorePromise, timeoutPromise]);

            addToast("Certificate added successfully!", "success");
            handleClose();
        } catch (error: any) {
            console.error("Error adding certificate:", error);
            addToast(error.message || "Failed to add certificate", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="glass w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-zinc-800"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 bg-zinc-900/50">
                            <div className="flex items-center gap-2 text-[var(--primary)]">
                                <CheckCircle className="w-5 h-5" />
                                <h2 className="text-lg font-bold text-white">Add Certificate or Achievement</h2>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. AWS Certified Solutions Architect"
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
                                    required
                                    maxLength={100}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Description (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Briefly describe your achievement..."
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all resize-none h-24"
                                    maxLength={300}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Image (Optional)</label>
                                {!imagePreview ? (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-32 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--primary-bg)] transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
                                            <ImageIcon className="w-5 h-5 text-zinc-500 group-hover:text-[var(--primary)]" />
                                        </div>
                                        <span className="text-sm text-zinc-500 group-hover:text-zinc-300">Upload Certificate Image</span>
                                    </div>
                                ) : (
                                    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-zinc-800 group">
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <button
                                                type="button"
                                                onClick={handleRemoveImage}
                                                className="bg-red-500/20 text-red-400 hover:bg-red-500/40 px-4 py-2 rounded-lg font-medium transition-colors"
                                            >
                                                Remove Image
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !title.trim()}
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Add Achievement</span>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc, setDoc, serverTimestamp, increment, writeBatch } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { Sidebar } from "@/components/Sidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { PostCard, Post } from "@/components/PostCard";
import { PostSkeleton } from "@/components/Skeletons";
import { AnimatePresence, motion } from "framer-motion";
import { SplashScreen } from "@/components/SplashScreen";
import { CreateMeetModal } from "@/components/CreateMeetModal";
import { CreatePostModal } from "@/components/CreatePostModal";
import { Camera, Info, Award, Plus, Edit3, Check, UserPlus, UserCheck } from "lucide-react";
import { CreateCertificateModal } from "@/components/CreateCertificateModal";
import { CertificateCard, Certificate } from "@/components/CertificateCard";
import { useToast } from "@/components/ToastProvider";

export default function UserProfilePage() {
    const params = useParams();
    const profileUserId = params.userId as string;

    const [user, setUser] = useState<any>(null); // Current logged in user
    const [profileData, setProfileData] = useState<any>(null); // User data of the profile being viewed
    const [posts, setPosts] = useState<Post[]>([]);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingCertificates, setLoadingCertificates] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);


    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [bioText, setBioText] = useState("");
    const [isSavingBio, setIsSavingBio] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameText, setNameText] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();

    const isOwnProfile = user?.uid === profileUserId;

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                // 1. Fetch Profile User Data (MongoDB)
                const fetchProfile = async () => {
                    if (!profileUserId) return;
                    try {
                        const res = await fetch(`/api/users/${profileUserId}`, { cache: 'no-store' });
                        if (res.ok) {
                            const data = await res.json();
                            // Map standard fields for backwards compatibility with components
                            setProfileData({ ...data, displayName: data.name, photoURL: data.avatarUrl });
                            if (isOwnProfile || !isEditingBio) {
                                setBioText(data.bio || "");
                            }
                            if (isOwnProfile || !isEditingName) {
                                setNameText(data.name || "");
                            }
                        } else {
                            addToast("Profile not found", "error");
                        }
                    } catch (error) {
                        console.error("Error fetching profile", error);
                    }
                };
                fetchProfile();

                // 2. Fetch Profile User's Posts
                const postsQuery = query(
                    collection(db, "posts"),
                    where("authorId", "==", profileUserId),
                );

                const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
                    const postsData: Post[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
                    postsData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                    setPosts(postsData);
                    setLoading(false);
                });

                // 3. Fetch Certificates
                const certsQuery = query(
                    collection(db, "certificates"),
                    where("userId", "==", profileUserId),
                    orderBy("timestamp", "desc")
                );

                const unsubscribeCerts = onSnapshot(certsQuery, (snapshot) => {
                    const loadedCerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certificate));
                    setCertificates(loadedCerts);
                    setLoadingCertificates(false);
                });

                // 4. Check Following Status (if not own profile)
                if (!isOwnProfile) {
                    fetch(`/api/users/${currentUser.uid}`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.following) {
                                setIsFollowing(data.following.includes(profileUserId));
                            }
                        })
                        .catch(err => console.error(err));
                }

                // Safety timeout
                setTimeout(() => {
                    setLoading(false);
                    setLoadingCertificates(false);
                }, 2000);

                return () => {
                    unsubscribePosts();
                    unsubscribeCerts();
                };
            } else {
                window.location.href = "/login";
            }
        });

        return () => unsubscribeAuth();
    }, [profileUserId, isOwnProfile]);

    const handleSignOut = async () => {
        await signOut(auth);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isOwnProfile) return;
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);
        try {
            const storagePath = `avatars/${user.uid}/${Date.now()}_${file.name}`;
            const fileRef = storageRef(storage, storagePath);
            const snapshot = await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            await updateProfile(user, { photoURL: downloadURL });
            await fetch(`/api/users/${user.uid}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatarUrl: downloadURL })
            });

            setProfileData((prev: any) => ({ ...prev, photoURL: downloadURL }));

            addToast("Profile picture updated!", "success");
        } catch (error: any) {
            console.error("Upload error:", error);
            addToast("Failed to upload image", "error");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveBio = async () => {
        if (!user || !isOwnProfile) return;
        setIsSavingBio(true);
        try {
            const res = await fetch(`/api/users/${user.uid}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bio: bioText.trim() })
            });

            if (res.ok) {
                setProfileData((prev: any) => ({ ...prev, bio: bioText.trim() }));
                setIsEditingBio(false);
                addToast("Bio updated!", "success");
            } else {
                addToast("Failed to update bio", "error");
            }
        } catch (error: any) {
            addToast("Failed to update bio", "error");
        } finally {
            setIsSavingBio(false);
        }
    };

    const handleSaveName = async () => {
        if (!user || !isOwnProfile) return;
        setIsSavingName(true);
        try {
            const res = await fetch(`/api/users/${user.uid}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: nameText.trim() })
            });

            const data = await res.json();
            if (res.ok) {
                // Update local state for immediate feedback
                setProfileData((prev: any) => ({ ...prev, displayName: nameText.trim(), name: nameText.trim() }));

                // Update Firebase Auth Profile for header/sidebar consistency
                await updateProfile(user, { displayName: nameText.trim() }).catch(e => console.error("Firebase Auth update error:", e));

                // Sync with Firestore (Crucial for Stories bar & real-time presence)
                try {
                    const userRef = doc(db, "users", user.uid);
                    await setDoc(userRef, {
                        displayName: nameText.trim(),
                        uid: user.uid,
                        email: user.email,
                        photoURL: user.photoURL || ""
                    }, { merge: true });
                } catch (firestoreError) {
                    console.error("Firestore sync error:", firestoreError);
                }

                setIsEditingName(false);
                addToast("Name updated professionally!", "success");
            } else {
                if (res.status === 429) {
                    addToast(data.error || "Username can only be changed twice per month.", "error");
                } else {
                    addToast("Failed to update name", "error");
                }
            }
        } catch (error: any) {
            addToast("Failed to update name", "error");
        } finally {
            setIsSavingName(false);
        }
    };

    const toggleFollow = async () => {
        if (!user || isOwnProfile) return;

        try {
            const res = await fetch(`/api/users/${profileUserId}/follow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ followerId: user.uid })
            });

            if (res.ok) {
                const data = await res.json();
                setIsFollowing(data.isFollowing);
                setProfileData((prev: any) => ({
                    ...prev,
                    followersCount: prev.followersCount + (data.isFollowing ? 1 : -1)
                }));
                addToast(data.isFollowing ? "Following" : "Unfollowed", "success");
            } else {
                addToast("Failed to update follow status", "error");
            }
        } catch (error: any) {
            addToast("Failed to update follow status", "error");
        }
    };

    const getInitials = (name: string | null) => {
        if (!name) return "U";
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <>
            <AnimatePresence>
                {loading && <SplashScreen key="splash" />}
            </AnimatePresence>

            {!loading && user && (
                <main className="min-h-screen">
                    <Sidebar
                        user={user}
                        setIsModalOpen={setIsModalOpen}
                        setIsPostModalOpen={setIsPostModalOpen}
                        getInitials={getInitials}
                    />

                    <div className="main-content flex-col items-center pb-24 md:pb-8">
                        {/* Profile Header */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full max-w-[470px] glass rounded-3xl p-5 sm:p-8 mb-8 mt-4 md:mt-0 shadow-2xl shadow-black/20"
                        >
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-8">
                                <div
                                    className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-400 p-1 relative flex-shrink-0 ${isOwnProfile ? 'cursor-pointer group' : ''}`}
                                    onClick={() => isOwnProfile && fileInputRef.current?.click()}
                                >
                                    <div className="w-full h-full bg-zinc-900 rounded-full flex items-center justify-center border-2 border-[var(--card-border)] overflow-hidden relative">
                                        {isUploading ? (
                                            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        ) : profileData?.photoURL ? (
                                            <img src={profileData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-4xl font-black text-white tracking-widest leading-none mb-1">{getInitials(profileData?.displayName || profileData?.email)}</span>
                                        )}

                                        {isOwnProfile && !isUploading && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm">
                                                <Camera className="w-8 h-8 text-white scale-75 group-hover:scale-100 transition-transform duration-300" />
                                            </div>
                                        )}
                                    </div>
                                    {isOwnProfile && (
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleImageUpload}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                    )}
                                </div>

                                <div className="flex-1 flex flex-col gap-4 min-w-0 w-full items-center sm:items-start text-center sm:text-left">
                                    <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 w-full">
                                        {isEditingName ? (
                                            <div className="flex flex-col gap-3 flex-1 w-full min-w-0">
                                                <input
                                                    value={nameText}
                                                    onChange={(e) => setNameText(e.target.value)}
                                                    className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl px-4 py-2.5 text-[var(--text-dark)] font-bold focus:outline-none focus:border-[var(--primary)] text-lg"
                                                    autoFocus
                                                    placeholder="Enter your full name"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <button onClick={handleSaveName} disabled={isSavingName || !nameText.trim()} className="text-white bg-[var(--primary)] px-4 py-2 rounded-xl text-sm font-bold flex-1 disabled:opacity-50">
                                                        {isSavingName ? "Saving..." : "Save Name"}
                                                    </button>
                                                    <button onClick={() => setIsEditingName(false)} className="bg-[var(--accent-bg)] text-[var(--text-light)] px-4 py-2 rounded-xl text-sm font-bold hover:text-[var(--text-dark)] flex-1">
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <h1 className="text-2xl font-black text-[var(--text-dark)] truncate leading-tight tracking-tight">
                                                    {profileData?.displayName || profileData?.email?.split('@')[0]}
                                                </h1>
                                                {isOwnProfile && (
                                                    <button
                                                        onClick={() => setIsEditingName(true)}
                                                        className="p-2 text-zinc-400 hover:text-[var(--primary)] transition-all bg-white/5 hover:bg-white/10 rounded-lg flex-shrink-0"
                                                        title="Edit Name"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {!isOwnProfile && (
                                            <button
                                                onClick={toggleFollow}
                                                className={`px-8 sm:px-6 py-2.5 sm:py-2 w-full sm:w-auto rounded-xl text-sm sm:text-xs font-black transition-all transform active:scale-95 ${isFollowing
                                                    ? "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
                                                    : "bg-[var(--primary)] text-white hover:opacity-90 shadow-xl shadow-purple-500/30"
                                                    }`}
                                            >
                                                {isFollowing ? "Following" : "Follow"}
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex justify-between text-center px-4 sm:px-2 py-3 bg-[var(--accent-bg)] rounded-2xl border border-[var(--card-border)] w-full">
                                        <div className="flex-1">
                                            <p className="text-lg font-black text-[var(--text-dark)] leading-none">{posts.length}</p>
                                            <p className="text-[10px] text-[var(--text-light)] uppercase tracking-widest mt-1 font-bold">Posts</p>
                                        </div>
                                        <div className="w-[1px] bg-[var(--card-border)] my-1"></div>
                                        <div className="flex-1">
                                            <p className="text-lg font-black text-[var(--text-dark)] leading-none">{profileData?.followersCount || 0}</p>
                                            <p className="text-[10px] text-[var(--text-light)] uppercase tracking-widest mt-1 font-bold">Followers</p>
                                        </div>
                                        <div className="w-[1px] bg-[var(--card-border)] my-1"></div>
                                        <div className="flex-1">
                                            <p className="text-lg font-black text-[var(--text-dark)] leading-none">{profileData?.followingCount || 0}</p>
                                            <p className="text-[10px] text-[var(--text-light)] uppercase tracking-widest mt-1 font-bold">Following</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bio Section */}
                            <div className="mt-8 px-2 relative group/bio">
                                {isEditingBio ? (
                                    <div className="flex flex-col gap-3">
                                        <textarea
                                            value={bioText}
                                            onChange={(e) => setBioText(e.target.value)}
                                            className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-2xl p-4 text-sm text-[var(--text-dark)] focus:outline-none focus:border-[var(--primary)] resize-none h-24 shadow-inner"
                                            maxLength={150}
                                            placeholder="Write something about your journey..."
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-3">
                                            <button onClick={() => setIsEditingBio(false)} className="text-xs font-bold text-[var(--text-light)] hover:text-[var(--text-dark)] transition-colors">Cancel</button>
                                            <button
                                                onClick={handleSaveBio}
                                                disabled={isSavingBio}
                                                className="bg-[var(--primary)] px-4 py-2 rounded-xl text-xs font-black text-white shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                            >
                                                {isSavingBio ? "Saving..." : "Save Bio"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-black text-[var(--text-light)] uppercase tracking-widest">About</p>
                                            {isOwnProfile && (
                                                <button
                                                    onClick={() => setIsEditingBio(true)}
                                                    className="p-2 opacity-0 group-hover/bio:opacity-100 text-[var(--text-light)] hover:text-[var(--text-dark)] transition-all bg-[var(--accent-bg)] rounded-lg"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[15px] text-[var(--text-dark)] leading-relaxed font-medium opacity-80">
                                            {profileData?.bio || (isOwnProfile ? "No bio yet. Tell us about your learning journey! 🎓" : "Learning and growing every day.")}
                                        </p>
                                        <div className="pt-2 flex items-center gap-2 text-[var(--text-light)] opacity-70">
                                            <span className="text-xs">
                                                Joined {(() => {
                                                    if (!profileData?.createdAt) return 'recently';
                                                    let date;
                                                    if (typeof profileData.createdAt.toDate === 'function') {
                                                        date = profileData.createdAt.toDate();
                                                    } else {
                                                        date = new Date(profileData.createdAt);
                                                    }
                                                    return isNaN(date.getTime())
                                                        ? 'recently'
                                                        : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Streak Info Hero Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="w-full max-w-[470px] relative overflow-hidden rounded-[32px] mb-12 aspect-[16/8] group border-4 border-[var(--card-border)] shadow-xl"
                        >
                            <img
                                src="/streak-hero.png"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90"
                                alt="Streak Info"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/80 to-[var(--background)]/20 p-6 flex flex-col justify-end">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="bg-orange-500/20 text-orange-500 border border-orange-500/30 p-2 rounded-2xl shadow-lg shadow-orange-500/10">
                                        <span className="text-xl leading-none">🔥</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xl font-black text-[var(--text-dark)] tracking-tight leading-none">{profileData?.currentStreak || 0}-Day Streak</span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest mt-1 ${(() => {
                                            if (!profileData?.lastLoginDate) return "text-[var(--text-light)]";
                                            const lastLogin = new Date(profileData.lastLoginDate);
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            lastLogin.setHours(0, 0, 0, 0);
                                            const diffTime = today.getTime() - lastLogin.getTime();
                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                            return diffDays <= 1 ? "text-orange-500" : "text-[var(--text-light)]";
                                        })()}`}>
                                            {(() => {
                                                if (!profileData?.lastLoginDate) return "Inactive";
                                                const lastLogin = new Date(profileData.lastLoginDate);
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                lastLogin.setHours(0, 0, 0, 0);
                                                const diffTime = today.getTime() - lastLogin.getTime();
                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                return diffDays <= 1 ? "Streak Active" : "Inactive";
                                            })()}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-[var(--text-dark)] text-xs font-bold max-w-[90%] leading-relaxed opacity-80">
                                    Maintain your consistency to unlock premium badges!
                                </p>
                            </div>
                        </motion.div>

                        {/* Certificates Grid */}
                        <div className="w-full max-w-[470px] space-y-4 mb-8">
                            <div className="flex items-center justify-between">
                                <h2 className="section-title !mb-0 text-sm opacity-60 uppercase tracking-widest text-[var(--text-light)]">Achievements</h2>
                                {isOwnProfile && (
                                    <button
                                        onClick={() => setIsCertificateModalOpen(true)}
                                        className="flex items-center gap-1.5 text-[10px] font-bold bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white px-3 py-1.5 rounded-full transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> Add
                                    </button>
                                )}
                            </div>

                            {loadingCertificates ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-32 glass rounded-xl animate-pulse bg-[var(--accent-bg)]"></div>
                                    <div className="h-32 glass rounded-xl animate-pulse bg-[var(--accent-bg)]"></div>
                                </div>
                            ) : certificates.length === 0 ? (
                                <div className="text-center py-6 border border-dashed border-[var(--card-border)] rounded-2xl text-[var(--text-light)] bg-[var(--accent-bg)]">
                                    <Award className="w-8 h-8 mx-auto text-[var(--text-light)] opacity-20 mb-1" />
                                    <p className="text-[10px]">No achievements yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {certificates.map(cert => (
                                        <CertificateCard key={cert.id} certificate={cert} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Posts Feed */}
                        <div className="w-full max-w-[470px] space-y-6">
                            <h2 className="section-title text-sm opacity-60 uppercase tracking-widest text-[var(--text-light)]">Learning Posts</h2>
                            {posts.length === 0 ? (
                                <div className="text-center py-10 bg-[var(--accent-bg)] rounded-2xl border border-dashed border-[var(--card-border)]">
                                    <p className="text-[var(--text-light)] text-sm">No posts shared yet.</p>
                                </div>
                            ) : (
                                posts.map(post => (
                                    <PostCard key={post.id} post={post} user={user} getInitials={getInitials} />
                                ))
                            )}
                        </div>
                    </div>

                    <RightSidebar
                        user={user}
                        handleSignOut={handleSignOut}
                        getInitials={getInitials}
                    />

                    {isOwnProfile && (
                        <>
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
                            <CreateCertificateModal
                                isOpen={isCertificateModalOpen}
                                onClose={() => setIsCertificateModalOpen(false)}
                                user={user}
                            />
                        </>
                    )}
                </main>
            )}
        </>
    );
}

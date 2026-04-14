"use client";

import { useState, useEffect } from "react";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/SplashScreen";

export default function LoginPage() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setInitialLoading(false);
                window.location.href = "/";
            } else {
                setTimeout(() => setInitialLoading(false), 1000); // 1 second splash for guest
            }
        });

        // Safety fallback: if Firebase is offline, show login form
        const safetyTimeout = setTimeout(() => {
            setInitialLoading(false);
        }, 2500);

        return () => {
            clearTimeout(safetyTimeout);
            unsubscribe();
        };
    }, []);

    const saveUserToFirestore = async (user: any, customName?: string) => {
        if (!user) return;
        try {
            // Firestore Sync (Keep for legacy/compatibility)
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            const resolvedName = customName || user.displayName || email.split('@')[0];

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: resolvedName,
                    photoURL: user.photoURL || "",
                    createdAt: serverTimestamp(),
                    streak: 0,
                    lastLogin: serverTimestamp()
                });
            } else {
                await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
            }

            // MongoDB Sync
            await fetch("/api/users/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    displayName: resolvedName,
                    photoURL: user.photoURL,
                }),
            });
        } catch (error) {
            console.error("Error saving user data: ", error);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setLoading(true);
            setError("");
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            await saveUserToFirestore(result.user);
            window.location.href = "/";
        } catch (err: any) {
            setError(err.message || "Failed to sign in with Google.");
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError("");
            if (isSignUp) {
                if (!name.trim()) {
                    throw new Error("Full Name is required to sign up.");
                }
                const result = await createUserWithEmailAndPassword(auth, email, password);
                await saveUserToFirestore(result.user, name);
            } else {
                const result = await signInWithEmailAndPassword(auth, email, password);
                await saveUserToFirestore(result.user);
            }
            window.location.href = "/";
        } catch (err: any) {
            setError(err.message || "Authentication failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <AnimatePresence>
                {initialLoading && <SplashScreen key="splash" />}
            </AnimatePresence>

            {!initialLoading && (
                <main className="w-full min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
                    {/* Dynamic Background Elements */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/20 blur-[120px] rounded-full animate-pulse"></div>
                        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
                    </div>

                    <div className="w-full max-w-md">
                        {/* Glassmorphism Card */}
                        <div className="bg-[var(--card-bg)]/80 backdrop-blur-xl border border-[var(--card-border)] rounded-3xl p-8 shadow-2xl dark:shadow-black/50">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-[var(--text-dark)] tracking-tight mb-2">
                                    {isSignUp ? "Create an Account" : "Welcome to Egram"}
                                </h1>
                                <p className="text-[var(--text-light)]">
                                    {isSignUp ? "Join us to start learning" : "Sign in to continue your learning journey"}
                                </p>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-sm text-red-500 text-center">{error}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <button
                                    onClick={handleGoogleSignIn}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-3 bg-[var(--card-hover)] text-[var(--text-dark)] border border-[var(--card-border)] px-4 py-3.5 rounded-xl font-medium transition-all hover:bg-[var(--accent-bg)] hover:scale-[1.02] active:scale-100 disabled:opacity-70 disabled:hover:scale-100 shadow-sm"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            fill="#EA4335"
                                        />
                                    </svg>
                                    Sign in with Google
                                </button>

                                <div className="relative flex items-center py-4">
                                    <div className="flex-grow border-t border-[var(--card-border)]"></div>
                                    <span className="flex-shrink-0 mx-4 text-sm text-[var(--text-light)]">or continue with email</span>
                                    <div className="flex-grow border-t border-[var(--card-border)]"></div>
                                </div>

                                <form onSubmit={handleEmailAuth} className="space-y-4">
                                    {isSignUp && (
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-light)] mb-1.5 ml-1">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full bg-[var(--accent-bg)] border border-[var(--card-border)] text-[var(--text-dark)] px-4 py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all placeholder:text-[var(--text-main)]"
                                                placeholder="John Doe"
                                                required={isSignUp}
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-light)] mb-1.5 ml-1">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-[var(--accent-bg)] border border-[var(--card-border)] text-[var(--text-dark)] px-4 py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all placeholder:text-[var(--text-main)]"
                                            placeholder="you@example.com"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-light)] mb-1.5 ml-1">
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-[var(--accent-bg)] border border-[var(--card-border)] text-[var(--text-dark)] px-4 py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all placeholder:text-[var(--text-main)]"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-[var(--primary)] text-white px-4 py-3.5 rounded-xl font-medium transition-all hover:opacity-90 hover:scale-[1.02] active:scale-100 disabled:opacity-70 disabled:hover:scale-100 shadow-md shadow-[var(--primary)]/30"
                                    >
                                        {isSignUp ? "Sign Up" : "Sign In"}
                                    </button>
                                </form>
                                <div className="text-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                                        className="text-sm font-medium text-[var(--text-light)] hover:text-[var(--text-dark)] transition-colors"
                                    >
                                        {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            )}
        </>
    );
}

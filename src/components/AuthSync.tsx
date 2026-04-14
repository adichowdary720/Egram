"use client";

import { useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function AuthSync() {
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
            if (user) {
                try {
                    // Force a sync with MongoDB whenever auth state changes to a user
                    await fetch("/api/users/sync", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName || user.email?.split('@')[0],
                            photoURL: user.photoURL,
                        }),
                    });
                } catch (error) {
                    console.error("AuthSync error:", error);
                }
            }
        });

        return () => unsubscribe();
    }, []);

    return null; // This component doesn't render anything
}

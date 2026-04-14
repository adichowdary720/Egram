"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { SplashScreen } from "@/components/SplashScreen";

export default function ProfileRedirect() {
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                router.replace(`/profile/${user.uid}`);
            } else {
                router.replace("/login");
            }
        });
        return () => unsubscribe();
    }, [router]);

    return <SplashScreen />;
}

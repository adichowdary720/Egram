"use client";

import { useEffect } from "react";
import { User } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface PresenceHandlerProps {
  user: User | null;
}

export function PresenceHandler({ user }: PresenceHandlerProps) {
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    const updatePresence = async (status: boolean) => {
      try {
        // Use setDoc with merge: true to create doc if it doesn't exist
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0],
          photoURL: user.photoURL || "",
          isOnline: status,
          lastActive: serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        // Silently fail or log sparingly for presence updates
        console.warn("Presence update failed:", error);
      }
    };

    // Initial online status - more aggressive pulse
    updatePresence(true);
    
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === "visible";
      updatePresence(isVisible);
    };

    const handleBeforeUnload = () => {
      // Browsers often throttle this, but we try
      updatePresence(false);
    };

    // Periodic heartbeat (every 1 minute)
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        updatePresence(true);
      }
    }, 60000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updatePresence(false);
    };
  }, [user]);

  return null;
}

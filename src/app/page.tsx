"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { CenterFeed } from "@/components/CenterFeed";
import { CreateMeetModal } from "@/components/CreateMeetModal";
import { CreatePostModal } from "@/components/CreatePostModal";

import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/SplashScreen";
import { PresenceHandler } from "@/components/PresenceHandler";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        router.push("/login");
      }
    });

    // Safety fallback: if Firebase is blocked or offline, remove splash screen
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      if (!auth.currentUser) {
        router.push("/login");
      }
    }, 2500);

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, [router]);



  const handleSignOut = async () => {
    await signOut(auth);
  };

  const getInitials = (nameOrEmail: string | null) => {
    if (!nameOrEmail) return "U";
    return nameOrEmail.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <AnimatePresence>
        {loading && <SplashScreen key="splash" />}
      </AnimatePresence>

      {!loading && user && (
        <>
          <PresenceHandler user={user} />
          <Sidebar
            user={user}
            setIsModalOpen={setIsModalOpen}
            setIsPostModalOpen={setIsPostModalOpen}
            getInitials={getInitials}
          />

          <main className="main-content">
            <CenterFeed user={user} />

            <RightSidebar
              user={user}
              handleSignOut={handleSignOut}
              getInitials={getInitials}
            />
          </main>

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
        </>
      )}
    </>
  );
}

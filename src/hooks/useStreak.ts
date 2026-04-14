import { useState, useEffect } from "react";
import { User } from "firebase/auth";

export function useStreak(user: User | null) {
    const [streak, setStreak] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setStreak(0);
            setLoading(false);
            return;
        }

        const updateStreak = async () => {
            try {
                const res = await fetch(`/api/users/${user.uid}/streak`, {
                    method: "POST"
                });
                
                if (res.ok) {
                    const data = await res.json();
                    setStreak(data.currentStreak || 0);
                }
            } catch (error) {
                console.error("Error updating streak:", error);
            } finally {
                setLoading(false);
            }
        };

        updateStreak();
    }, [user]);

    return { streak, loading };
}

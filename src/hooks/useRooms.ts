import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface StudyRoom {
    id: string;
    topic: string;
    scheduleTime: string;
    hostId: string;
    hostName: string;
    hostInitials: string;
    meetLink: string;
    createdAt: any;
}

export function useRooms() {
    const [rooms, setRooms] = useState<StudyRoom[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const roomsData: StudyRoom[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                roomsData.push({
                    id: doc.id,
                    topic: data.topic,
                    scheduleTime: data.scheduleTime,
                    hostId: data.hostId,
                    hostName: data.hostName,
                    hostInitials: data.hostInitials,
                    meetLink: data.meetLink,
                    createdAt: data.createdAt,
                });
            });
            setRooms(roomsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching rooms:", error);
            // Firebase returns error if index is missing. Stop loading to avoid indefinite stuck state.
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const createRoom = async (roomData: Omit<StudyRoom, "id" | "createdAt" | "meetLink">) => {
        try {
            // Generate a secure, unique Jitsi Meet link
            const uniqueRoomId = `Egram-${roomData.topic.replace(/[^a-zA-Z0-9]/g, "")}-${Math.random().toString(36).substring(2, 8)}`;
            const jitsiLink = `https://meet.jit.si/${uniqueRoomId}`;

            // Calculate expiration time (59 minutes from now)
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 59);

            await addDoc(collection(db, "rooms"), {
                ...roomData,
                meetLink: jitsiLink,
                createdAt: serverTimestamp(),
                expiresAt: Timestamp.fromDate(expiresAt)
            });
            return true;
        } catch (error) {
            console.error("Error creating room:", error);
            return false;
        }
    };

    return { rooms, loading, createRoom };
}

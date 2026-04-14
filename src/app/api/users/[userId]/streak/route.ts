import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    try {
        await connectMongo();
        const userId = (await params).userId;

        const user = await User.findOne({ firebaseUid: userId });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const now = new Date();
        const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const today = new Date(todayStr); // start of today
        
        let currentStreak = user.currentStreak || 0;
        let longestStreak = user.longestStreak || 0;
        const lastLoginDate = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
        
        let updated = false;

        if (!lastLoginDate) {
            // First time ever opening app
            currentStreak = 1;
            longestStreak = 1;
            updated = true;
        } else {
            // Compare dates strictly at midnight to avoid timezone/hour issues
            const lastLoginDayStr = new Date(lastLoginDate.getFullYear(), lastLoginDate.getMonth(), lastLoginDate.getDate()).toISOString();
            const lastLoginDay = new Date(lastLoginDayStr);
            
            const diffTime = Math.abs(today.getTime() - lastLoginDay.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (diffDays === 1) {
                // Logged in exactly yesterday, increment streak
                currentStreak += 1;
                if (currentStreak > longestStreak) {
                    longestStreak = currentStreak;
                }
                updated = true;
            } else if (diffDays > 1) {
                // Missed a day or more, reset streak
                currentStreak = 1;
                updated = true;
            } else {
                // diffDays === 0. Logged in today. Streak is maintained. No database update needed for streak logic.
                // However, we might want to update lastLoginDate to exactly 'now' for precise tracking
                // But traditionally, streak relies on the day.
            }
        }

        if (updated) {
            user.currentStreak = currentStreak;
            user.longestStreak = longestStreak;
            user.lastLoginDate = now;
            await user.save();
        } else {
            // Just update last login time for other purposes without changing streak count
            user.lastLoginDate = now;
            await user.save();
        }

        return NextResponse.json({ 
            currentStreak: user.currentStreak, 
            longestStreak: user.longestStreak, 
            lastLoginDate: user.lastLoginDate 
        }, { status: 200 });

    } catch (error: any) {
        console.error("Error updating streak:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

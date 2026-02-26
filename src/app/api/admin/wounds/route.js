import { NextResponse } from 'next/server';
import { getAllWoundsAdmin, getWoundLogs } from '@/app/lib/db';

// Note: In a production app, this route would be protected by an admin authentication middleware/check.
// For V1 MVP, we leave it open to easily demonstrate the admin features.

export async function GET() {
    try {
        const wounds = await getAllWoundsAdmin();
        
        // Fetch logs for all these wounds to populate the dashboard alerts
        // This is N+1, but fine for a small 50-item limit demo. 
        // In real SQL, a JOIN would be used.
        const populatedWounds = await Promise.all(
            wounds.map(async (wound) => {
                const logs = await getWoundLogs(wound.user_id, wound.id);
                return {
                    ...wound,
                    logs
                };
            })
        );

        return NextResponse.json(populatedWounds);
    } catch (error) {
        console.error('Error in admin GET wounds:', error);
        return NextResponse.json({ error: 'Failed to fetch admin dashboard data' }, { status: 500 });
    }
}

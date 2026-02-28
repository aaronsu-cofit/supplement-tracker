import { getUserId } from '@/app/lib/userId';
import { getSupplements, getCheckIns, getStreak, initializeDatabase } from '@/app/lib/db';
import SupplementsClientDashboard from './SupplementsClientDashboard';

export const dynamic = 'force-dynamic';

export default async function SupplementsDashboard() {
    let supplements = [];
    let checkIns = [];
    let streak = 0;

    try {
        const userId = await getUserId();
        await initializeDatabase();

        // Fetch identically to what the API endpoints do
        const today = new Date().toISOString().split('T')[0];

        // Execute queries concurrently
        const [rawSupplements, rawCheckIns, rawStreak] = await Promise.all([
            getSupplements(userId),
            getCheckIns(userId, today),
            getStreak(userId),
        ]);

        // Strip Date objects into ISO strings to prevent RSC serialization crash
        supplements = JSON.parse(JSON.stringify(rawSupplements));
        checkIns = JSON.parse(JSON.stringify(rawCheckIns));
        streak = rawStreak;
    } catch (error) {
        console.error('Failed to fetch supplement data on server:', error);
    }

    return (
        <SupplementsClientDashboard
            initialSupplements={supplements}
            initialCheckIns={checkIns}
            initialStreak={streak}
        />
    );
}

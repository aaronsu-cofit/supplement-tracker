import { getUserId } from '@/app/lib/userId';
import { getWounds, initializeDatabase } from '@/app/lib/db';
import WoundsClientDashboard from './WoundsClientDashboard';

export const dynamic = 'force-dynamic';

export default async function WoundsDashboard() {
    let wounds = [];
    try {
        const userId = await getUserId();
        await initializeDatabase();
        const rawWounds = await getWounds(userId);

        // Strip Date objects into ISO strings to prevent RSC serialization crash
        wounds = JSON.parse(JSON.stringify(rawWounds));
    } catch (error) {
        console.error('Failed to fetch wounds data on server:', error);
    }

    return <WoundsClientDashboard initialWounds={wounds} />;
}

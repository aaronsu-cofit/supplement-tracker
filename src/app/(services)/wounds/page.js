import { getUserId } from '@/app/lib/userId';
import { getWounds, initializeDatabase } from '@/app/lib/db';
import WoundsClientDashboard from './WoundsClientDashboard';

export const dynamic = 'force-dynamic';

export default async function WoundsDashboard() {
    let wounds = [];
    try {
        const userId = await getUserId();
        await initializeDatabase();
        wounds = await getWounds(userId);
    } catch (error) {
        console.error('Failed to fetch wounds data on server:', error);
    }

    return <WoundsClientDashboard initialWounds={wounds} />;
}

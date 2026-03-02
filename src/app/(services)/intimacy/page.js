import { getUserId } from '@/app/lib/userId';
import { getIntimacyAssessments, initializeDatabase } from '@/app/lib/db';
import IntimacyClientDashboard from './IntimacyClientDashboard';

export const dynamic = 'force-dynamic';

export default async function IntimacyDashboard() {
    let assessments = [];
    try {
        const userId = await getUserId();
        await initializeDatabase();
        const rawAssessments = await getIntimacyAssessments(userId);

        // Strip Date objects into ISO strings to prevent RSC serialization crash
        assessments = JSON.parse(JSON.stringify(rawAssessments));
    } catch (error) {
        console.error('Failed to fetch intimacy data on server:', error);
    }

    return <IntimacyClientDashboard initialAssessments={assessments} />;
}

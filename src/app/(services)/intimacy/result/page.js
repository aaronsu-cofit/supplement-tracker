import { getUserId } from '@/app/lib/userId';
import { getIntimacyAssessments, initializeDatabase } from '@/app/lib/db';
import IntimacyResultClient from './IntimacyResultClient';

export const dynamic = 'force-dynamic';

export default async function IntimacyResultPage({ searchParams }) {
    const { id } = await searchParams;
    let assessment = null;

    try {
        const userId = await getUserId();
        await initializeDatabase();
        const assessments = await getIntimacyAssessments(userId);

        const rawAssessment = assessments.find(a => String(a.id) === String(id));
        if (rawAssessment) {
            assessment = JSON.parse(JSON.stringify(rawAssessment));
        }
    } catch (error) {
        console.error('Failed to fetch intimacy assessment:', error);
    }

    return <IntimacyResultClient initialData={assessment} />;
}

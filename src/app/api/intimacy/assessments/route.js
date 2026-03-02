import { NextResponse } from 'next/server';
import { getUserId, withUserCookie } from '@/app/lib/userId';
import { getIntimacyAssessments, createIntimacyAssessment } from '@/app/lib/db';

export async function GET(request) {
    try {
        const userId = await getUserId();
        const assessments = await getIntimacyAssessments(userId);

        const response = NextResponse.json({ success: true, assessments });
        return withUserCookie(response, userId);
    } catch (error) {
        console.error('Error fetching intimacy assessments:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch assessments' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const userId = await getUserId();
        const body = await request.json();

        // data holds gender, primary_concern, assessment_data, ai_summary
        const assessment = await createIntimacyAssessment(userId, body);

        const response = NextResponse.json({ success: true, assessment });
        return withUserCookie(response, userId);
    } catch (error) {
        console.error('Error creating intimacy assessment:', error);
        return NextResponse.json({ error: error.message || 'Failed to create assessment' }, { status: 500 });
    }
}

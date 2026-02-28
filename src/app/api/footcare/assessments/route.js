import { NextResponse } from 'next/server';
import { getUserId } from '@/app/lib/userId';
import { getFootAssessments, createFootAssessment, initializeDatabase } from '@/app/lib/db';

export async function GET(request) {
    try {
        const userId = await getUserId(request);
        await initializeDatabase();
        const assessments = await getFootAssessments(userId);
        return NextResponse.json(assessments);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const userId = await getUserId(request);
        const data = await request.json();
        await initializeDatabase();

        // Default values logic resides in the DB helper
        const assessment = await createFootAssessment(userId, data);
        return NextResponse.json(assessment, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

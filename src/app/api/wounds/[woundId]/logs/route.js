import { NextResponse } from 'next/server';
import { getWoundLogs, createWoundLog } from '@/app/lib/db';
import { getUserId, withUserCookie } from '@/app/lib/userId';

export async function GET(request, { params }) {
    try {
        const userId = await getUserId();
        // For Next.js App Router API, params is a promise in newer versions, 
        // but can be destructured directly in 13/14 depending on setup. Assuming standard access:
        const woundId = parseInt(params.woundId, 10);
        
        if (isNaN(woundId)) {
             return NextResponse.json({ error: 'Invalid wound ID' }, { status: 400 });
        }

        const logs = await getWoundLogs(userId, woundId);
        const response = NextResponse.json(logs);
        return withUserCookie(response, userId);
    } catch (error) {
        console.error('Error fetching wound logs:', error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    try {
        const userId = await getUserId();
        const data = await request.json();
        const woundId = parseInt(params.woundId, 10);

        if (isNaN(woundId)) {
             return NextResponse.json({ error: 'Invalid wound ID' }, { status: 400 });
        }

        const log = await createWoundLog(userId, woundId, data);
        const response = NextResponse.json(log, { status: 201 });
        return withUserCookie(response, userId);
    } catch (error) {
        console.error('Error creating wound log:', error);
        return NextResponse.json({ error: 'Failed to log wound assessment' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { initializeDatabase, getWoundById, updateWoundName, archiveWound } from '@/app/lib/db';
import { getUserId, withUserCookie } from '@/app/lib/userId';

export async function GET(request, { params }) {
    try {
        await initializeDatabase();
        const userId = await getUserId();
        const { woundId } = await params;
        const parsedId = parseInt(woundId, 10);

        if (isNaN(parsedId)) {
            return NextResponse.json({ error: 'Invalid wound ID' }, { status: 400 });
        }

        const wound = await getWoundById(userId, parsedId);
        if (!wound) {
            return NextResponse.json({ error: 'Wound not found' }, { status: 404 });
        }

        return NextResponse.json(wound);
    } catch (error) {
        console.error('Error fetching wound:', error);
        return NextResponse.json({ error: 'Failed to fetch wound' }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        await initializeDatabase();
        const { woundId } = await params;
        const parsedWoundId = parseInt(woundId, 10);

        if (isNaN(parsedWoundId)) {
            return NextResponse.json({ error: 'Invalid wound ID' }, { status: 400 });
        }

        const data = await request.json();
        const result = await updateWoundName(parsedWoundId, data.name);

        return NextResponse.json({ success: true, id: parsedWoundId, name: data.name });
    } catch (error) {
        console.error('Error updating wound:', error);
        return NextResponse.json({ error: 'Failed to update wound' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        await initializeDatabase();
        const userId = await getUserId();
        const { woundId } = await params;
        const parsedId = parseInt(woundId, 10);

        if (isNaN(parsedId)) {
            return NextResponse.json({ error: 'Invalid wound ID' }, { status: 400 });
        }

        await archiveWound(userId, parsedId);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error archiving wound:', error);
        return NextResponse.json({ error: 'Failed to archive wound' }, { status: 500 });
    }
}

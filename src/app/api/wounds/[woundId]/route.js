import { NextResponse } from 'next/server';
import { initializeDatabase, getWoundById, updateWound, archiveWound } from '@/app/lib/db';
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
        console.log("DEBUG getWoundById:", { userId, parsedId, wound });
        if (!wound) {
            // Debugging output
            const allWounds = !process.env.POSTGRES_URL ? require('@/app/lib/db').memoryStore.wounds : [];
            return NextResponse.json({ error: 'Wound not found', debug: { userId, parsedId, allWounds } }, { status: 404 });
        }

        const response = NextResponse.json(wound);
        return withUserCookie(response, userId);
    } catch (error) {
        console.error('Error fetching wound:', error);
        return NextResponse.json({ error: 'Failed to fetch wound' }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        await initializeDatabase();
        const userId = await getUserId();
        const { woundId } = await params;
        const parsedWoundId = parseInt(woundId, 10);

        if (isNaN(parsedWoundId)) {
            return NextResponse.json({ error: 'Invalid wound ID' }, { status: 400 });
        }

        const data = await request.json();

        // Build dynamic update
        const updates = {};
        if (data.name !== undefined) updates.name = data.name;
        if (data.wound_type !== undefined) updates.wound_type = data.wound_type;
        if (data.body_location !== undefined) updates.body_location = data.body_location;
        if (data.date_of_injury !== undefined) updates.date_of_injury = data.date_of_injury;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        const result = await updateWound(parsedWoundId, userId, updates);
        const response = NextResponse.json({ success: true, wound: result });
        return withUserCookie(response, userId);
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
        const response = NextResponse.json({ success: true });
        return withUserCookie(response, userId);
    } catch (error) {
        console.error('Error archiving wound:', error);
        return NextResponse.json({ error: 'Failed to archive wound' }, { status: 500 });
    }
}

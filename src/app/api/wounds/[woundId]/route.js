import { NextResponse } from 'next/server';
import { updateWoundName } from '@/app/lib/db';

export async function PATCH(request, { params }) {
    try {
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

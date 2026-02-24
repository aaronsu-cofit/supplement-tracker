import { NextResponse } from 'next/server';
import { updateSupplement, deleteSupplement } from '@/app/lib/db';
import { getUserId, withUserCookie } from '@/app/lib/userId';

export async function PUT(request, { params }) {
    try {
        const userId = await getUserId();
        const { id } = await params;
        const data = await request.json();

        if (!data.name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const supplement = await updateSupplement(userId, parseInt(id), data);
        if (!supplement) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        return withUserCookie(NextResponse.json(supplement), userId);
    } catch (error) {
        console.error('Error updating supplement:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const userId = await getUserId();
        const { id } = await params;
        await deleteSupplement(userId, parseInt(id));
        return withUserCookie(NextResponse.json({ success: true }), userId);
    } catch (error) {
        console.error('Error deleting supplement:', error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}

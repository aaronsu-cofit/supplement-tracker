import { NextResponse } from 'next/server';
import { getWounds, createWound } from '@/app/lib/db';
import { getUserId, withUserCookie } from '@/app/lib/userId';

export async function GET() {
    try {
        const userId = await getUserId();
        const wounds = await getWounds(userId);
        const response = NextResponse.json(wounds);
        return withUserCookie(response, userId);
    } catch (error) {
        console.error('Error fetching wounds:', error);
        return NextResponse.json({ error: 'Failed to fetch wounds' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const userId = await getUserId();
        const data = await request.json();

        // Basic validation
        if (!data.name?.trim()) {
            data.name = '未命名傷口';
        }

        const wound = await createWound(userId, data);
        const response = NextResponse.json(wound, { status: 201 });
        return withUserCookie(response, userId);
    } catch (error) {
        console.error('Error creating wound:', error);
        return NextResponse.json({ error: 'Failed to create wound record' }, { status: 500 });
    }
}

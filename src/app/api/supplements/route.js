import { NextResponse } from 'next/server';
import { getSupplements, createSupplement } from '@/app/lib/db';
import { getUserId, withUserCookie } from '@/app/lib/userId';

export async function GET() {
    try {
        const userId = await getUserId();
        const supplements = await getSupplements(userId);
        const response = NextResponse.json(supplements);
        return withUserCookie(response, userId);
    } catch (error) {
        console.error('Error fetching supplements:', error);
        return NextResponse.json({ error: 'Failed to fetch supplements' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const userId = await getUserId();
        const data = await request.json();

        if (!data.name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const supplement = await createSupplement(userId, data);
        const response = NextResponse.json(supplement, { status: 201 });
        return withUserCookie(response, userId);
    } catch (error) {
        console.error('Error creating supplement:', error);
        return NextResponse.json({ error: 'Failed to create supplement' }, { status: 500 });
    }
}

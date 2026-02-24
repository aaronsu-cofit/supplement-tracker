import { NextResponse } from 'next/server';
import { getSupplements, createSupplement } from '@/app/lib/db';
import { getUserId } from '@/app/lib/userId';

export async function GET() {
    try {
        const userId = await getUserId();
        const supplements = await getSupplements(userId);
        return NextResponse.json(supplements);
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
        // Set user ID cookie if it's a new user
        response.cookies.set('supplement_user_id', userId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 365 * 5, // 5 years
        });
        return response;
    } catch (error) {
        console.error('Error creating supplement:', error);
        return NextResponse.json({ error: 'Failed to create supplement' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { getCheckIns, createCheckIn, removeCheckIn, getCheckInHistory, getStreak } from '@/app/lib/db';
import { getUserId } from '@/app/lib/userId';

export async function GET(request) {
    try {
        const userId = await getUserId();
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const type = searchParams.get('type');

        if (type === 'streak') {
            const streak = await getStreak(userId);
            return NextResponse.json({ streak });
        }

        if (type === 'history' && startDate && endDate) {
            const history = await getCheckInHistory(userId, startDate, endDate);
            return NextResponse.json(history);
        }

        const today = date || new Date().toISOString().split('T')[0];
        const checkIns = await getCheckIns(userId, today);
        return NextResponse.json(checkIns);
    } catch (error) {
        console.error('Error fetching check-ins:', error);
        return NextResponse.json({ error: 'Failed to fetch check-ins' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const userId = await getUserId();
        const { supplementId } = await request.json();

        if (!supplementId) {
            return NextResponse.json({ error: 'supplementId is required' }, { status: 400 });
        }

        const checkIn = await createCheckIn(userId, supplementId);

        const response = NextResponse.json(checkIn, { status: 201 });
        response.cookies.set('supplement_user_id', userId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 365 * 5,
        });
        return response;
    } catch (error) {
        console.error('Error creating check-in:', error);
        return NextResponse.json({ error: 'Failed to check in' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const userId = await getUserId();
        const { supplementId, date } = await request.json();
        await removeCheckIn(userId, supplementId, date);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing check-in:', error);
        return NextResponse.json({ error: 'Failed to remove check-in' }, { status: 500 });
    }
}

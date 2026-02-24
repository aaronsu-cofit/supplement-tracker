import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/app/lib/db';

export async function POST() {
    try {
        const result = await initializeDatabase();
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error initializing database:', error);
        return NextResponse.json({ error: 'Failed to initialize database' }, { status: 500 });
    }
}

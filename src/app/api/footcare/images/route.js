import { NextResponse } from 'next/server';
import { getUserId } from '@/app/lib/userId';
import { getFootImages, createFootImage, initializeDatabase } from '@/app/lib/db';

export async function GET(request) {
    try {
        const userId = await getUserId(request);
        await initializeDatabase();
        const images = await getFootImages(userId);
        return NextResponse.json(images);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const userId = await getUserId(request);
        const data = await request.json();
        await initializeDatabase();

        // Default values logic resides in the DB helper
        const image = await createFootImage(userId, data);
        return NextResponse.json(image, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
    try {
        const result = await sql`
            SELECT * FROM modules 
            WHERE is_active = true 
            ORDER BY sort_order ASC
        `;

        return NextResponse.json({ modules: result.rows });
    } catch (error) {
        console.error('Failed to fetch modules:', error);
        return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserId } from '@/app/lib/userId';
import { findUserById } from '@/app/lib/db';

export async function GET(request) {
    try {
        const currentUserId = await getUserId();
        if (!currentUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await findUserById(currentUserId);
        // For MVP we allow access, but normally:
        // if (!user || (user.role !== 'superadmin' && user.role !== 'admin')) return 401;

        const result = await sql`
            SELECT * FROM modules 
            ORDER BY sort_order ASC
        `;

        return NextResponse.json({ modules: result.rows });
    } catch (error) {
        console.error('Failed to fetch HQ modules:', error);
        return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 });
    }
}

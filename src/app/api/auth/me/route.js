import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, clearAuthCookie } from '@/app/lib/auth';
import { findUserById } from '@/app/lib/db';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload?.userId) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        const user = await findUserById(payload.userId);
        if (!user) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        return NextResponse.json({
            authenticated: true,
            user: {
                id: user.id,
                email: user.email,
                displayName: user.display_name,
                pictureUrl: user.picture_url,
                authProvider: user.auth_provider,
            }
        });
    } catch (error) {
        console.error('Auth check error:', error);
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }
}

// POST /api/auth/me — for LINE login (create/update user from LIFF profile)
export async function POST(request) {
    try {
        const { lineUserId, displayName, pictureUrl } = await request.json();

        if (!lineUserId) {
            return NextResponse.json({ error: 'Missing lineUserId' }, { status: 400 });
        }

        const { findOrCreateLineUser } = await import('@/app/lib/db');
        const user = await findOrCreateLineUser(lineUserId, displayName, pictureUrl);

        const { signToken, setAuthCookie } = await import('@/app/lib/auth');
        const token = await signToken(user.id);

        const response = NextResponse.json({
            authenticated: true,
            user: {
                id: user.id,
                displayName: user.display_name,
                pictureUrl: user.picture_url,
                authProvider: user.auth_provider,
            }
        });

        setAuthCookie(response, token);

        // Also set supplement_user_id cookie
        response.cookies.set('supplement_user_id', user.id, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 365 * 5,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('LINE auth error:', error);
        return NextResponse.json({ error: 'LINE 登入失敗' }, { status: 500 });
    }
}

// DELETE /api/auth/me — logout
export async function DELETE() {
    const response = NextResponse.json({ success: true });
    clearAuthCookie(response);
    response.cookies.set('supplement_user_id', '', { maxAge: 0, path: '/' });
    response.cookies.set('line_user_id', '', { maxAge: 0, path: '/' });
    return response;
}

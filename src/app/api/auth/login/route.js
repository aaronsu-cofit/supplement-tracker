import { NextResponse } from 'next/server';
import { findUserByEmail } from '@/app/lib/db';
import { comparePassword, signToken, setAuthCookie } from '@/app/lib/auth';

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: '請輸入 Email 和密碼' }, { status: 400 });
        }

        const user = await findUserByEmail(email.toLowerCase());
        if (!user) {
            return NextResponse.json({ error: 'Email 或密碼不正確' }, { status: 401 });
        }

        const valid = await comparePassword(password, user.password_hash);
        if (!valid) {
            return NextResponse.json({ error: 'Email 或密碼不正確' }, { status: 401 });
        }

        const token = await signToken(user.id);
        const response = NextResponse.json({
            success: true,
            user: { id: user.id, email: user.email, displayName: user.display_name, authProvider: user.auth_provider }
        });

        setAuthCookie(response, token);

        // Also set the supplement_user_id cookie so existing API routes work
        response.cookies.set('supplement_user_id', user.id, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 365 * 5,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: '登入失敗，請稍後再試' }, { status: 500 });
    }
}

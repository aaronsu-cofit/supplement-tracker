import { NextResponse } from 'next/server';
import { initializeDatabase, findUserByEmail, createEmailUser } from '@/app/lib/db';
import { hashPassword, signToken, setAuthCookie } from '@/app/lib/auth';

export async function POST(request) {
    try {
        await initializeDatabase();
        const { email, password, displayName } = await request.json();

        // Validation
        if (!email || !password) {
            return NextResponse.json({ error: '請輸入 Email 和密碼' }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Email 格式不正確' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: '密碼至少需要 8 位' }, { status: 400 });
        }

        // Check if email already exists
        const existing = await findUserByEmail(email.toLowerCase());
        if (existing) {
            return NextResponse.json({ error: '此 Email 已被註冊' }, { status: 409 });
        }

        // Create user
        const userId = crypto.randomUUID();
        const passwordHash = await hashPassword(password);
        const user = await createEmailUser(userId, email.toLowerCase(), passwordHash, displayName || email.split('@')[0]);

        // Issue JWT
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
        console.error('Registration error:', error);
        return NextResponse.json({ error: '註冊失敗，請稍後再試', detail: error.message, stack: error.stack }, { status: 500 });
    }
}

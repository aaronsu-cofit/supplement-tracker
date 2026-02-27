import { cookies } from 'next/headers';
import { verifyToken } from '@/app/lib/auth';

export async function getUserId() {
    const cookieStore = await cookies();

    // 1. Prioritize JWT auth token (email or LINE registered user)
    const authToken = cookieStore.get('auth_token')?.value;
    if (authToken) {
        const payload = await verifyToken(authToken);
        if (payload?.userId) return payload.userId;
    }

    // 2. LINE User ID from LIFF (legacy / in-app browser without full auth)
    let userId = cookieStore.get('line_user_id')?.value;
    if (userId) return userId;

    // 3. Fallback to existing random UUID
    userId = cookieStore.get('supplement_user_id')?.value;
    if (userId) return userId;

    // 4. Fallback to a new random UUID (for non-line preview)
    return crypto.randomUUID();
}

// Helper to create a response with the user ID cookie set
export function withUserCookie(response, userId) {
    response.cookies.set('supplement_user_id', userId, {
        httpOnly: false,  // Allow client-side access for consistency
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365 * 5, // 5 years
    });
    return response;
}


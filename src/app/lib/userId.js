import { cookies } from 'next/headers';

export async function getUserId() {
    const cookieStore = await cookies();
    let userId = cookieStore.get('supplement_user_id')?.value;

    if (!userId) {
        userId = crypto.randomUUID();
    }

    return userId;
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

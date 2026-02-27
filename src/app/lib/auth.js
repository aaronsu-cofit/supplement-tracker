import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'dev-secret-change-in-production'
);

const TOKEN_NAME = 'auth_token';
const TOKEN_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// --- JWT helpers ---

export async function signToken(userId) {
    return new SignJWT({ userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('365d')
        .sign(JWT_SECRET);
}

export async function verifyToken(token) {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload;
    } catch {
        return null;
    }
}

// --- Password helpers ---

export async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

// --- Cookie helpers ---

export function setAuthCookie(response, token) {
    response.cookies.set(TOKEN_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: TOKEN_MAX_AGE,
        path: '/',
    });
    return response;
}

export function getTokenFromCookies(cookieStore) {
    return cookieStore.get(TOKEN_NAME)?.value || null;
}

export function clearAuthCookie(response) {
    response.cookies.set(TOKEN_NAME, '', {
        httpOnly: true,
        maxAge: 0,
        path: '/',
    });
    return response;
}

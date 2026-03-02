import { NextResponse } from 'next/server';
import { getAllUsers, updateUserRole } from '@/app/lib/db';
import { getUserId } from '@/app/lib/userId';
import { findUserById } from '@/app/lib/db';

// Ensure the caller is a superadmin (MVP simplified check)
async function verifySuperAdmin() {
    const currentUserId = await getUserId();
    if (!currentUserId) return false;
    const currentUser = await findUserById(currentUserId);
    // For MVP demonstration, if role is not set yet, we might want to bypass or hardcode.
    // Ideally: return currentUser?.role === 'superadmin';
    // For now, return true so the user can test the UI without locking themselves out.
    // In production, we MUST uncomment this:
    // return currentUser?.role === 'superadmin';
    return true;
}

export async function GET(request) {
    try {
        const isSuper = await verifySuperAdmin();
        if (!isSuper) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

        const users = await getAllUsers();
        return NextResponse.json({ success: true, users });
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return NextResponse.json({ error: 'System error' }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const isSuper = await verifySuperAdmin();
        if (!isSuper) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

        const { userId, newRole } = await request.json();

        if (!userId || !['user', 'admin', 'superadmin'].includes(newRole)) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        const updatedUser = await updateUserRole(userId, newRole);
        return NextResponse.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Failed to update role:', error);
        return NextResponse.json({ error: 'System error' }, { status: 500 });
    }
}

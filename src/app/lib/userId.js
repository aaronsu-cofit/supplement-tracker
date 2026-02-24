import { cookies } from 'next/headers';

export async function getUserId() {
    const cookieStore = await cookies();
    let userId = cookieStore.get('supplement_user_id')?.value;

    if (!userId) {
        userId = crypto.randomUUID();
    }

    return userId;
}

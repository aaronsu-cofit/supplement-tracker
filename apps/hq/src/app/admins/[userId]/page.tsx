import UserDetailClient from './UserDetailClient';

export const dynamic = 'force-dynamic';

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <UserDetailClient userId={userId} />;
}

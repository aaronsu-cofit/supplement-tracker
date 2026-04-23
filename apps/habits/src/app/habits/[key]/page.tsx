import HabitDetailClient from './HabitDetailClient';

export const dynamic = 'force-dynamic';

export default async function HabitDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <HabitDetailClient missionKey={key} />;
}

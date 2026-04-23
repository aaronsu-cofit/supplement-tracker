import HabitSettingsClient from './HabitSettingsClient';

export const dynamic = 'force-dynamic';

export default async function HabitSettingsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <HabitSettingsClient missionKey={key} />;
}

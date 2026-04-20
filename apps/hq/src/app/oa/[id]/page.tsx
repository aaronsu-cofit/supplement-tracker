import OaWorkspaceClient from './OaWorkspaceClient';

export const dynamic = 'force-dynamic';

export default async function OaWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OaWorkspaceClient oaId={id} />;
}

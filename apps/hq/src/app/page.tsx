export const dynamic = 'force-dynamic';

import HQOverviewClient from './HQOverviewClient';
import HQClientDashboard from './HQClientDashboard';

export default function HQOverviewPage() {
    return (
        <>
            <HQOverviewClient />
            <HQClientDashboard />
        </>
    );
}

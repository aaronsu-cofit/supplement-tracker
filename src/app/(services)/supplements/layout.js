import Navbar from '@/app/components/Navbar';

export const metadata = { title: '💊 保健品追蹤 | Supplement Tracker' };

export default function SupplementsLayout({ children }) {
    return (
        <>
            {children}
            <Navbar />
        </>
    );
}

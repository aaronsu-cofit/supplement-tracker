import Navbar from '@/app/components/Navbar';

export default function SupplementsLayout({ children }) {
    return (
        <>
            {children}
            <Navbar />
        </>
    );
}

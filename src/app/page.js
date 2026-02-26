import Link from "next/link";
import Image from "next/image"; // Note: For a portal, we might just use simple links.

export default function PortalPage() {
    return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h1>Health & Care Portal</h1>
            <p>Please select a service below or access via LINE Official Account</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem', maxWidth: '300px', margin: '2rem auto' }}>
                <Link href="/supplements" style={buttonStyle}>
                    💊 保健品追蹤 (Supplements)
                </Link>
                <Link href="/wounds" style={buttonStyle}>
                    🩹 傷口照護 (Wounds)
                </Link>
                <Link href="/bones" style={buttonStyle}>
                    🦴 骨骼關節 (Bones)
                </Link>
            </div>
        </div>
    );
}

const buttonStyle = {
    display: 'block',
    padding: '1rem',
    background: 'var(--accent-primary, #7c5cfc)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
};

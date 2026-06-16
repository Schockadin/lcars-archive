import Link from "next/link";

interface LcarsPillProps {
    id: string;
    text: string;
    href: string;
    active: boolean;
}


export default function LcarsPill ({id, text, href, active} : LcarsPillProps) {

    return (
        <div className="flex">
            <Link href={href} className={`lcars-pill ${active ? 'lcars-pill-active' : ''}`}>
                <div className="text-right">{id + "_" + text}</div>
            </Link>
        </div>
    );
}
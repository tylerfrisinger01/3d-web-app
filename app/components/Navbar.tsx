import Link from "next/link";

export const Navbar = () => {
    return (
        <nav className="bg-orange-600 text-white p-4 sm:p-6 md:flex md:justify-between md:items-center">
            <div className="container mx-auto flex justify-between items-center">
                <a href="/home" className="text-2xl font-bold">
                    My diddy Logo
                </a>
                <div className="hidden md:flex">
                    <Link href="/home" className="mx-2 hover:text-black">
                        Home
                    </Link>
                    <Link href="/design" className="mx-2 hover:text-black">
                        Design
                    </Link>
                    <Link href="/" className="mx-2 hover:text-black">
                        Log Out
                    </Link>
                </div>
            </div>
        </nav>
    );
};

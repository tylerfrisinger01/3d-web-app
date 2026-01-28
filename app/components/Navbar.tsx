import Link from "next/link";

export const Navbar = () => {
    return (
        <nav className="bg-orange-600 text-white p-4 sm:p-6 md:flex md:justify-between md:items-center">
            <div className="container mx-auto flex justify-between items-center">
                <a href="" className="text-2xl font-bold">
                    My diddy Logo
                </a>
                <div className="hidden md:flex">
                    <Link href="/" className="mx-2 hover:text-gray-300">
                        Home
                    </Link>
                    <Link href="/about" className="mx-2 hover:text-gray-300">
                        About
                    </Link>
                    <Link href="/contact" className="mx-2 hover:text-gray-300">
                        Contact
                    </Link>
                </div>
            </div>
        </nav>
    );
};

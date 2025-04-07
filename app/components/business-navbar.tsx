import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';

interface BusinessNavbarProps {
  isAuthPage?: boolean;
}

export default function BusinessNavbar({ isAuthPage = false }: BusinessNavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IconOnly_Transparent_NoBuffer%20(1)-qipSsiq4ftcvpww0P3lSnzRPc4YOtH.png"
              alt="Flintime"
              width={40}
              height={40}
            />
            <span className="text-xl font-bold text-violet-600">Flintime Business</span>
          </Link>
          
          {!isAuthPage && (
            <div className="hidden md:flex items-center space-x-8">
              {/* Navigation items removed */}
            </div>
          )}

          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="text-violet-600 hover:text-violet-700 hover:bg-violet-50" asChild>
              <Link href="/business/signin">
                Sign In
              </Link>
            </Button>
            <Button className="bg-violet-600 hover:bg-violet-700" asChild>
              <Link href="/business/signup">
                Sign Up
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
} 
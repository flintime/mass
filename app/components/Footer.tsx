import Link from 'next/link'
import { Facebook, Instagram, Linkedin, Mail, Phone, MapPin, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

function XIcon({ size = 20, className = "" }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      width={size} 
      height={size} 
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

export default function Footer() {
  // State for collapsible sections on mobile
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    company: false,
    business: false,
    legal: false,
    contact: false
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <footer className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Desktop Footer - Hidden on Mobile */}
        <div className="hidden md:grid md:grid-cols-5 md:gap-8">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold">Flintime</h3>
            <p className="text-sm text-violet-200 leading-relaxed max-w-md">
              Flintime helps you find and book the best local services with AI-powered recommendations.
            </p>
            <div className="flex space-x-4">
              <Link href="https://www.facebook.com/people/Flintimeusa/61572947655202/" className="hover:text-violet-300 transition-colors">
                <Facebook size={20} />
              </Link>
              <Link href="https://x.com/flintimeinc" className="hover:text-violet-300 transition-colors">
                <XIcon size={20} />
              </Link>
              <Link href="https://www.instagram.com/flintimeusa/" className="hover:text-violet-300 transition-colors">
                <Instagram size={20} />
              </Link>
              <Link href="https://www.linkedin.com/company/flintime" className="hover:text-violet-300 transition-colors">
                <Linkedin size={20} />
              </Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-4">For Businesses</h4>
            <ul className="space-y-2">
              <li><Link href="/business/signup" className="hover:text-violet-300 transition-colors">List Your Business</Link></li>
              <li><Link href="/business/signin" className="hover:text-violet-300 transition-colors">Business Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link href="/about" className="hover:text-violet-300 transition-colors">About Us</Link></li>
              <li><Link href="/careers" className="hover:text-violet-300 transition-colors">Careers</Link></li>
              <li><Link href="/faq" className="hover:text-violet-300 transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/terms" className="hover:text-violet-300 transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-violet-300 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/refund-policy" className="hover:text-violet-300 transition-colors">Cancellation & Refund Policy</Link></li>
              <li><Link href="/cookie-policy" className="hover:text-violet-300 transition-colors">Cookie Policy</Link></li>
              <li><Link href="/intellectual-property" className="hover:text-violet-300 transition-colors">Intellectual Property</Link></li>
              <li><Link href="/third-party-links" className="hover:text-violet-300 transition-colors">Third-Party Links</Link></li>
              <li><Link href="/disclaimer" className="hover:text-violet-300 transition-colors">Disclaimer & Liability</Link></li>
              <li><Link href="/ai-transparency" className="hover:text-violet-300 transition-colors">AI Transparency</Link></li>
              <li><Link href="/accessibility" className="hover:text-violet-300 transition-colors">Accessibility</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Mail size={18} className="mr-2 mt-0.5 flex-shrink-0 text-violet-300" />
                <a href="mailto:contact@flintime.com" className="hover:text-violet-300 transition-colors">
                  contact@flintime.com
                </a>
              </li>
              <li className="flex items-start">
                <Phone size={18} className="mr-2 mt-0.5 flex-shrink-0 text-violet-300" />
                <a href="tel:9165980203" className="hover:text-violet-300 transition-colors">
                  (916) 598-0203
                </a>
              </li>
              <li className="flex items-start">
                <MapPin size={18} className="mr-2 mt-0.5 flex-shrink-0 text-violet-300" />
                <span className="text-violet-200 leading-tight">
                  254 Chapman Rd, Ste 208 #20381<br />
                  Newark, Delaware 19702<br />
                  USA
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Mobile Footer - Collapsible Sections - Hidden on Desktop */}
        <div className="md:hidden space-y-6">
          {/* Logo and Social */}
          <div className="text-center space-y-3 pb-4 border-b border-white/10">
            <h3 className="text-xl font-bold">Flintime</h3>
            <p className="text-xs text-violet-200 leading-relaxed max-w-md mx-auto">
              Find and book the best local services with AI-powered recommendations.
            </p>
            <div className="flex justify-center space-x-6 pt-1">
              <Link href="https://www.facebook.com/people/Flintimeusa/61572947655202/" className="hover:text-violet-300 transition-colors">
                <Facebook size={20} />
              </Link>
              <Link href="https://x.com/flintimeinc" className="hover:text-violet-300 transition-colors">
                <XIcon size={20} />
              </Link>
              <Link href="https://www.instagram.com/flintimeusa/" className="hover:text-violet-300 transition-colors">
                <Instagram size={20} />
              </Link>
              <Link href="https://www.linkedin.com/company/flintime" className="hover:text-violet-300 transition-colors">
                <Linkedin size={20} />
              </Link>
            </div>
          </div>

          {/* Collapsible Sections */}
          <div className="space-y-3">
            {/* Business Section */}
            <div className="border-b border-white/10 pb-3">
              <button 
                onClick={() => toggleSection('business')}
                className="w-full flex justify-between items-center py-2"
              >
                <h4 className="font-semibold text-base">For Businesses</h4>
                {openSections.business ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {openSections.business && (
                <ul className="space-y-2 pl-1 pt-2 text-sm">
                  <li><Link href="/business/signup" className="hover:text-violet-300 transition-colors">List Your Business</Link></li>
                  <li><Link href="/business/signin" className="hover:text-violet-300 transition-colors">Business Dashboard</Link></li>
                </ul>
              )}
            </div>
            
            {/* Company Section */}
            <div className="border-b border-white/10 pb-3">
              <button 
                onClick={() => toggleSection('company')}
                className="w-full flex justify-between items-center py-2"
              >
                <h4 className="font-semibold text-base">Company</h4>
                {openSections.company ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {openSections.company && (
                <ul className="space-y-2 pl-1 pt-2 text-sm">
                  <li><Link href="/about" className="hover:text-violet-300 transition-colors">About Us</Link></li>
                  <li><Link href="/careers" className="hover:text-violet-300 transition-colors">Careers</Link></li>
                  <li><Link href="/faq" className="hover:text-violet-300 transition-colors">FAQ</Link></li>
                </ul>
              )}
            </div>
            
            {/* Legal Section */}
            <div className="border-b border-white/10 pb-3">
              <button 
                onClick={() => toggleSection('legal')}
                className="w-full flex justify-between items-center py-2"
              >
                <h4 className="font-semibold text-base">Legal</h4>
                {openSections.legal ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {openSections.legal && (
                <ul className="space-y-2 pl-1 pt-2 text-sm grid grid-cols-2 gap-x-2">
                  <li><Link href="/terms" className="hover:text-violet-300 transition-colors">Terms of Service</Link></li>
                  <li><Link href="/privacy" className="hover:text-violet-300 transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/refund-policy" className="hover:text-violet-300 transition-colors">Refund Policy</Link></li>
                  <li><Link href="/cookie-policy" className="hover:text-violet-300 transition-colors">Cookie Policy</Link></li>
                  <li><Link href="/intellectual-property" className="hover:text-violet-300 transition-colors">Intellectual Property</Link></li>
                  <li><Link href="/third-party-links" className="hover:text-violet-300 transition-colors">Third-Party Links</Link></li>
                  <li><Link href="/disclaimer" className="hover:text-violet-300 transition-colors">Disclaimer</Link></li>
                  <li><Link href="/ai-transparency" className="hover:text-violet-300 transition-colors">AI Transparency</Link></li>
                  <li><Link href="/accessibility" className="hover:text-violet-300 transition-colors">Accessibility</Link></li>
                </ul>
              )}
            </div>
            
            {/* Contact Section */}
            <div className="border-b border-white/10 pb-3">
              <button 
                onClick={() => toggleSection('contact')}
                className="w-full flex justify-between items-center py-2"
              >
                <h4 className="font-semibold text-base">Contact Us</h4>
                {openSections.contact ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {openSections.contact && (
                <ul className="space-y-3 pl-1 pt-2 text-sm">
                  <li className="flex items-start">
                    <Mail size={16} className="mr-2 mt-0.5 flex-shrink-0 text-violet-300" />
                    <a href="mailto:contact@flintime.com" className="hover:text-violet-300 transition-colors">
                      contact@flintime.com
                    </a>
                  </li>
                  <li className="flex items-start">
                    <Phone size={16} className="mr-2 mt-0.5 flex-shrink-0 text-violet-300" />
                    <a href="tel:9165980203" className="hover:text-violet-300 transition-colors">
                      (916) 598-0203
                    </a>
                  </li>
                  <li className="flex items-start">
                    <MapPin size={16} className="mr-2 mt-0.5 flex-shrink-0 text-violet-300" />
                    <span className="text-violet-200 leading-tight text-xs">
                      254 Chapman Rd, Ste 208 #20381<br />
                      Newark, Delaware 19702<br />
                      USA
                    </span>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Copyright - Both Mobile and Desktop */}
        <div className="mt-6 md:mt-8 pt-4 md:pt-8 border-t border-white/10 text-center text-xs md:text-sm text-violet-200">
          <p className="pb-[60px] md:pb-0">© 2025 Flintime INC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}


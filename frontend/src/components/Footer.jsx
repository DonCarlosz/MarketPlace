import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, ShieldCheck, ChevronDown, ExternalLink } from 'lucide-react';

export default function Footer() {
  const [openSections, setOpenSections] = useState({});

  const toggleSection = (key) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const footerSections = [
    {
      id: 'buy',
      title: 'Buy & Discover',
      links: [
        { label: 'Explore Marketplace', to: '/market' },
        { label: 'Second-Hand Goods', to: '/market?mode=second-hand' },
        { label: 'Brand-New Items', to: '/market?mode=brand-new' },
        { label: 'Local Handwork & Services', to: '/market?mode=services' },
        { label: 'Saved Wishlist', to: '/favorites' },
      ],
    },
    {
      id: 'sell',
      title: 'Sell & Services',
      links: [
        { label: 'Post a Free Listing', to: '/create' },
        { label: 'Zero Commission / No Fees', static: true },
        { label: 'Fast In-App Buyer Chat', static: true },
        { label: 'Direct In-Person Payment', static: true },
        { label: 'Seller Verification Policy', static: true },
      ],
    },
    {
      id: 'safety',
      title: 'Trust & Safety',
      links: [
        { label: 'Public Place Meetup Advice', static: true },
        { label: 'In-Person Inspection First', static: true },
        { label: 'No Wire Transfer Policy', static: true },
        { label: 'User Blocking & Spam Defense', static: true },
        { label: 'Zero Payment Liability Rule', static: true },
      ],
    },
    {
      id: 'about',
      title: 'About LocalMarket',
      links: [
        { label: 'Community Guidelines', static: true },
        { label: 'Safe Trading Guarantee', static: true },
        { label: 'Privacy Policy', static: true },
        { label: 'Terms of Service', static: true },
      ],
      description:
        'Direct peer-to-peer neighborhood marketplace for pre-loved items, verified brand-new merchandise, and on-demand local skills across Nigeria.',
    },
  ];

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto text-xs text-slate-500 pb-16 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Mobile Accordion View (< 768px, eBay-style) */}
        <div className="md:hidden divide-y divide-slate-100 border-b border-slate-100 mb-3">
          {footerSections.map((sec) => {
            const isOpen = !!openSections[sec.id];
            return (
              <div key={sec.id} className="py-1">
                <button
                  type="button"
                  onClick={() => toggleSection(sec.id)}
                  className="w-full py-3 flex items-center justify-between text-left font-bold text-slate-800 hover:text-indigo-600 transition cursor-pointer select-none"
                  aria-expanded={isOpen}
                >
                  <span className="text-xs uppercase tracking-wider">{sec.title}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-indigo-600' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="pb-3 pt-1 space-y-2 text-slate-600 animate-in fade-in duration-150 pl-1">
                    {sec.description && (
                      <p className="text-[11px] text-slate-500 leading-relaxed pb-1">
                        {sec.description}
                      </p>
                    )}
                    <ul className="space-y-2 text-[11px]">
                      {sec.links.map((link, idx) => (
                        <li key={idx}>
                          {link.to ? (
                            <Link
                              to={link.to}
                              className="text-slate-600 hover:text-indigo-600 transition block py-0.5"
                            >
                              {link.label}
                            </Link>
                          ) : (
                            <span className="text-slate-500 block py-0.5">{link.label}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop Multi-Column Grid (>= 768px) */}
        <div className="hidden md:grid md:grid-cols-4 gap-8 pb-10">
          {footerSections.map((sec) => (
            <div key={sec.id} className="space-y-3">
              <h4 className="font-bold text-slate-900 text-xs tracking-wider uppercase">
                {sec.title}
              </h4>
              {sec.description && (
                <p className="text-slate-500 leading-relaxed text-[11px] pb-1">
                  {sec.description}
                </p>
              )}
              <ul className="space-y-2 text-slate-600 text-[11px]">
                {sec.links.map((link, idx) => (
                  <li key={idx}>
                    {link.to ? (
                      <Link
                        to={link.to}
                        className="hover:text-indigo-600 transition block"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <span className="text-slate-500 block">{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Compact Integrated Trust & Legal Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-slate-500 text-[11px]">
          <div className="flex items-center gap-2 text-emerald-800 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Zero-Fee Peer-to-Peer Trading • Meet locally & pay in person</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <Store className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="font-bold text-slate-700">LocalMarket</span>
            <span>•</span>
            <span>© {new Date().getFullYear()}</span>
            <span>•</span>
            <span className="text-slate-700 font-semibold">Nigeria (NGN ₦)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

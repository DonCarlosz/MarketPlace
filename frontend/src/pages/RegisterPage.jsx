import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import { ShieldCheck } from 'lucide-react';

export default function RegisterPage() {
  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
      return;
    }
    openAuthModal('register');
  }, [user, openAuthModal, navigate]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-5">
        <div className="flex justify-center">
          <BrandLogo variant="badge" size="lg" showWordmark={false} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold text-slate-900">Join oBuy</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            oBuy uses email OTP verification so every buyer and seller account in your neighborhood is genuine.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openAuthModal('register')}
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Continue to Verified Sign Up</span>
        </button>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Already have an oBuy account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

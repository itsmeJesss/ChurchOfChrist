import React, { useState } from 'react';
import { motion } from 'motion/react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertCircle, ExternalLink } from 'lucide-react';

export default function LoginScreen() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/portal');
    } catch (err: any) {
      console.error('Google Sign-In Error details:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(
          `Domain Unauthorized: This preview domain is not allowed in your Firebase Console. ` +
          `Please add this domain to Firebase Console -> Authentication -> Authorized Domains.`
        );
      } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/popup-blocked') {
        setError(
          `Popup Closed/Blocked: The Google Sign-In popup was blocked or closed. ` +
          `If browsing inside an embedded iframe, please click 'Open Portal in New Tab' below.`
        );
      } else {
        setError(err.message || 'Google Sign-In failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
      className="max-w-md mx-auto px-4 py-16"
    >
      <div className="bg-white rounded-[40px] p-8 md:p-10 shadow-2xl border border-beige-warm space-y-8 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blush rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-sage rounded-full blur-3xl opacity-50 pointer-events-none" />

        <div className="text-center space-y-3 relative">
          <div className="inline-block p-4 bg-beige-warm rounded-3xl mb-1">
            <Sparkles className="text-gold w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-deep-blue">Member Portal</h1>
          <p className="text-gray-500 font-light text-sm tracking-widest uppercase">
            Welcome to Church Of Christ
          </p>
        </div>

        <div className="space-y-6 relative">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-3 text-red-600 text-sm whitespace-pre-wrap"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              
              <button
                type="button"
                onClick={() => window.open(window.location.href, '_blank')}
                className="mt-1 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl font-bold text-xs transition-colors self-start flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                Open Portal in New Tab
              </button>
            </motion.div>
          )}

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-4 bg-white border-2 border-beige-warm text-deep-blue rounded-2xl font-bold hover:bg-beige-light transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-sm cursor-pointer"
          >
            <img 
              src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" 
              alt="Google" 
              className="w-5 h-5" 
              referrerPolicy="no-referrer"
            />
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

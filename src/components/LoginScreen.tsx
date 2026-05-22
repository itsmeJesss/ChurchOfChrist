import React, { useState } from 'react';
import { motion } from 'motion/react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertCircle } from 'lucide-react';

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
          `Domain Unauthorized: This preview domain is not allowed/authorized in your Firebase Console. ` +
          `Please log into your Firebase Console -> Authentication -> Settings -> Authorized Domains, ` +
          `and add both of these domains:\n` +
          `1. ais-dev-6lffkt7mrx6dmp44tlbliv-93903399573.asia-east1.run.app\n` +
          `2. ais-pre-6lffkt7mrx6dmp44tlbliv-93903399573.asia-east1.run.app`
        );
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError(
          `Popup Closed/Blocked: The browser popup was closed before logging in. ` +
          `If you are using Google inside the embedded AI Studio preview iframe, it is highly recommended to ` +
          `open the portal in a NEW TAB using the direct link below, and ensure popups match your permission settings.`
        );
      } else if (err.code === 'auth/popup-blocked') {
        setError(
          `Popup Blocked: Your browser blocked the authentication window from opening. ` +
          `Please allow popups for this site, or open the application in a new tab.`
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="max-w-md mx-auto px-4 py-20"
    >
      <div className="bg-white rounded-[40px] p-10 shadow-2xl border border-beige-warm space-y-8 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blush rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-sage rounded-full blur-3xl opacity-50" />

        <div className="text-center space-y-4 relative">
          <div className="inline-block p-4 bg-beige-warm rounded-3xl mb-2">
            <Sparkles className="text-gold w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-deep-blue">Member Portal</h1>
          <p className="text-gray-500 font-light text-sm tracking-widest uppercase">
            Welcome Back to Grace
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
              
              {(error.includes('Popup') || error.includes('Domain') || (typeof window !== 'undefined' && window !== window.top)) && (
                <button
                  type="button"
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="mt-1 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl font-bold text-xs transition-colors self-start flex items-center gap-2"
                >
                  Open Portal in New Tab ↗
                </button>
              )}
            </motion.div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-4 bg-white border-2 border-beige-warm text-deep-blue rounded-2xl font-bold hover:bg-beige-light transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-sm"
          >
            <img 
              src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" 
              alt="Google" 
              className="w-5 h-5" 
              referrerPolicy="no-referrer"
            />
            Continue with Google
          </button>
        </div>
      </div>
    </motion.div>
  );
}

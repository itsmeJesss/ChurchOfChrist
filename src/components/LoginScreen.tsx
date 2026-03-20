import React, { useState } from 'react';
import { motion } from 'motion/react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Sparkles, LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/portal');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is disabled. Please use Google Sign-In.');
      } else {
        setError(err.message || 'Authentication failed.');
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
          <h1 className="text-3xl font-bold text-deep-blue">{isSignUp ? 'Create Account' : 'Member Portal'}</h1>
          <p className="text-gray-500 font-light text-sm tracking-widest uppercase">
            {isSignUp ? 'Join the Community' : 'Welcome Back to Grace'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-4 bg-white border-2 border-beige-warm text-deep-blue rounded-2xl font-bold hover:bg-beige-light transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <img 
              src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" 
              alt="Google" 
              className="w-5 h-5" 
              referrerPolicy="no-referrer"
            />
            Continue with Google
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="h-px bg-beige-warm flex-grow" />
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">or</span>
            <div className="h-px bg-beige-warm flex-grow" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-beige-light border border-beige-warm rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-deep-blue text-white rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-deep-blue/20 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Sparkles className="w-5 h-5" />
              </motion.div>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-4 relative">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-gold font-bold hover:underline"
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need access? Create an account'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

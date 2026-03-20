import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MapPin, LogIn, LogOut, Home, Users, FileText, LayoutDashboard, Menu, X, AlertCircle } from 'lucide-react';
import PublicHome from './components/PublicHome';
import VisitScreen from './components/VisitScreen';
import LoginScreen from './components/LoginScreen';
import MemberPortal from './components/MemberPortal';
import SermonsPage from './components/SermonsPage';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const parsedError = JSON.parse(this.state.error?.message || "");
        if (parsedError.error) {
          displayMessage = `Firestore Error: ${parsedError.error}`;
        }
      } catch (e) {
        displayMessage = this.state.error?.message || displayMessage;
      }

      return (
        <div className="min-h-screen bg-beige-light flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] p-12 max-w-md w-full shadow-2xl border border-beige-warm text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-deep-blue">Application Error</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                {displayMessage}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-deep-blue text-white rounded-2xl font-bold hover:scale-[1.02] transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-beige-light flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        >
          <Sparkles className="text-gold w-12 h-12" />
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-beige-light flex flex-col">
          <Navbar user={user} />
          <main className="flex-grow">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<PublicHome />} />
                <Route path="/visit" element={<VisitScreen />} />
                <Route path="/sermons" element={<SermonsPage />} />
                <Route path="/login" element={<LoginScreen />} />
                <Route 
                  path="/portal/*" 
                  element={user ? <MemberPortal user={user} /> : <LoginScreen />} 
                />
              </Routes>
            </AnimatePresence>
          </main>
          <Footer />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

function Navbar({ user }: { user: User | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Sermons', path: '/sermons', icon: FileText },
    { name: 'Visit Us', path: '/visit', icon: MapPin },
  ];

  if (user) {
    navLinks.push({ name: 'Portal', path: '/portal', icon: LayoutDashboard });
  } else {
    navLinks.push({ name: 'Login', path: '/login', icon: LogIn });
  }

  return (
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-beige-warm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-sage rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="text-gold w-6 h-6" />
              </div>
              <span className="font-serif text-2xl font-bold text-deep-blue tracking-tight">
                Church Of Christ
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-gold ${
                  location.pathname === link.path ? 'text-gold' : 'text-gray-600'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.name}
              </Link>
            ))}
            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-gold transition-colors"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-beige-warm overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    location.pathname === link.path 
                      ? 'bg-beige-warm text-gold' 
                      : 'text-gray-600 hover:bg-beige-light'
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  {link.name}
                </Link>
              ))}
              {user && (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-gray-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-white border-t border-beige-warm py-12">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="flex justify-center mb-6">
          <Sparkles className="text-gold w-8 h-8 opacity-50" />
        </div>
        <p className="font-serif text-xl text-deep-blue mb-2">Church Of Christ</p>
        <p className="text-sm text-gray-500 font-light tracking-widest uppercase">
          Grace • Peace • Love
        </p>
        <div className="mt-8 pt-8 border-t border-beige-warm/50 text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Church Of Christ. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

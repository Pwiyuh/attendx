import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { Menu, X } from 'lucide-react';

const Navbar: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDashboardRedirect = () => {
    if (user?.role === 'admin') navigate('/admin');
    else if (user?.role === 'teacher') navigate('/teacher');
    else navigate('/student');
  };

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b ${scrolled ? 'bg-galaxy-900/80 backdrop-blur-md border-white/10' : 'bg-transparent border-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-galaxy-light to-galaxy-purple">
              AttendX
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#home" className="text-sm font-medium text-galaxy-light/80 hover:text-white transition-colors">Home</a>
            <a href="#features" className="text-sm font-medium text-galaxy-light/80 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-galaxy-light/80 hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="text-sm font-medium text-galaxy-light/80 hover:text-white transition-colors">Pricing</a>
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <button 
                onClick={handleDashboardRedirect}
                className="px-5 py-2.5 text-sm font-medium rounded-full bg-galaxy-purple hover:bg-galaxy-blue text-white transition-all shadow-[0_0_20px_rgba(109,40,217,0.4)]"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <Link to="/login" className="px-5 py-2.5 text-sm font-medium text-white border border-white/20 rounded-full hover:bg-white/10 transition-colors">
                  Login
                </Link>
                <Link to="/get-started" className="px-5 py-2.5 text-sm font-medium rounded-full bg-galaxy-purple hover:bg-galaxy-blue text-white transition-all shadow-[0_0_20px_rgba(109,40,217,0.4)]">
                  Get Started
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:text-galaxy-light/80 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-galaxy-800/95 backdrop-blur-xl border-b border-white/10">
          <div className="px-4 pt-2 pb-6 space-y-1 sm:px-3">
            <a href="#home" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-white/5">Home</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-white/5">Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-white/5">How it Works</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-white/5">Pricing</a>
            
            <div className="pt-4 flex flex-col gap-3">
              {isAuthenticated ? (
                 <button onClick={() => { handleDashboardRedirect(); setMobileMenuOpen(false); }} className="w-full text-center px-5 py-3 text-base font-medium rounded-full bg-galaxy-purple text-white">
                  Go to Dashboard
                 </button>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="w-full text-center px-5 py-3 text-base font-medium text-white border border-white/20 rounded-full">
                    Login
                  </Link>
                  <Link to="/get-started" onClick={() => setMobileMenuOpen(false)} className="w-full text-center px-5 py-3 text-base font-medium rounded-full bg-galaxy-purple text-white">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

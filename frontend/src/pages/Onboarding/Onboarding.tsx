import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import GlassCard from '../../components/ui/GlassCard';
import { Building, User, Lock, Mail, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const Onboarding: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    school_name: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });

  // Verify if setup is already complete to block access
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await api.get('/onboarding/status');
        if (response.data.setup_completed) {
          showToast('error', 'Setup is already complete.');
          navigate('/login');
        } else {
          setLoading(false);
        }
      } catch (err) {
        showToast('error', 'Failed to check setup status.');
        setLoading(false);
      }
    };
    checkStatus();
  }, [navigate, showToast]);

  const handleNext = () => {
    if (step === 1 && !formData.school_name.trim()) {
      showToast('error', 'Please enter a school name.');
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.admin_name || !formData.admin_email || !formData.admin_password) {
      showToast('error', 'Please fill out all admin details.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/onboarding/setup', formData);
      
      // Auto-login: store in the same format as AuthContext
      const userData = {
        token: response.data.access_token,
        role: response.data.role,
        user_id: response.data.user_id,
        name: response.data.name,
      };
      localStorage.setItem('attendx_user', JSON.stringify(userData));
      
      showToast('success', 'Setup complete! Welcome to AttendX.');
      
      // Full reload so AuthContext picks up the new token from localStorage
      window.location.href = '/admin';
      
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Setup failed.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <Loader2 className="w-10 h-10 text-galaxy-purple animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-galaxy-light to-galaxy-purple">
            AttendX Setup
          </h2>
          <p className="mt-2 text-sm text-galaxy-light/70">
            Let's get your institution configured in just two steps.
          </p>
        </div>

        <GlassCard className="p-8" glow>
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8 space-x-4">
             <div className={`w-3 h-3 rounded-full ${step === 1 ? 'bg-galaxy-purple' : 'bg-green-500'}`} />
             <div className="h-0.5 w-12 bg-white/20" />
             <div className={`w-3 h-3 rounded-full ${step === 2 ? 'bg-galaxy-purple' : 'bg-white/20'}`} />
          </div>

          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
              <h3 className="text-xl font-bold text-white text-center">School Profile</h3>
              
              <div>
                <label className="block text-sm font-medium text-galaxy-light/80 mb-2">Institution Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-white/40" />
                  </div>
                  <input
                    type="text"
                    value={formData.school_name}
                    onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-galaxy-purple focus:border-transparent transition-all"
                    placeholder="e.g. Springfield High"
                  />
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-[0_0_20px_rgba(109,40,217,0.3)] text-sm font-bold text-white bg-galaxy-purple hover:bg-galaxy-blue focus:outline-none transition-all"
              >
                Next Step <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
               <h3 className="text-xl font-bold text-white text-center">Admin Account</h3>

               <div className="space-y-4">
                 <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-white/40" />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.admin_name}
                      onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                      className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-galaxy-purple transition-all"
                      placeholder="Your Full Name"
                    />
                  </div>
                 </div>

                 <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-white/40" />
                    </div>
                    <input
                      type="email"
                      required
                      value={formData.admin_email}
                      onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                      className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-galaxy-purple transition-all"
                      placeholder="Admin Email"
                    />
                  </div>
                 </div>

                 <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-white/40" />
                    </div>
                    <input
                      type="password"
                      required
                      value={formData.admin_password}
                      onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                      className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-galaxy-purple transition-all"
                      placeholder="Secure Password"
                    />
                  </div>
                 </div>
               </div>

               <div className="flex space-x-3">
                 <button
                   type="button"
                   onClick={() => setStep(1)}
                   className="w-1/3 py-3 border border-white/20 rounded-xl text-white hover:bg-white/10 transition-colors font-medium text-sm"
                 >
                   Back
                 </button>
                 <button
                   type="submit"
                   disabled={submitting}
                   className="w-2/3 flex justify-center items-center py-3 border border-transparent rounded-xl shadow-[0_0_20px_rgba(109,40,217,0.3)] text-sm font-bold text-white bg-galaxy-purple hover:bg-galaxy-blue focus:outline-none transition-all disabled:opacity-50"
                 >
                   {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Complete Setup</>}
                 </button>
               </div>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default Onboarding;

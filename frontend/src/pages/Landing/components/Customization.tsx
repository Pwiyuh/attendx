import React from 'react';
import { Palette, Image as ImageIcon, Layout, CheckCircle } from 'lucide-react';
import GlassCard from '../../../components/ui/GlassCard';

const Customization: React.FC = () => {
  return (
    <section className="py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="w-full lg:w-1/2">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white text-balance">
              Make it truly <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-galaxy-purple">yours</span>
            </h2>
            <p className="text-lg text-galaxy-light/70 mb-8 max-w-lg">
              AttendX is fully white-labelable. Customize the interface to match your institution's unique branding and specific workflows.
            </p>
            
            <ul className="space-y-4 mb-10">
              <li className="flex items-center text-galaxy-light/80">
                <CheckCircle className="h-6 w-6 text-galaxy-purple mr-3 flex-shrink-0" />
                Upload custom school logos directly to the dashboard
              </li>
              <li className="flex items-center text-galaxy-light/80">
                <CheckCircle className="h-6 w-6 text-galaxy-purple mr-3 flex-shrink-0" />
                Update instance names, tags, and email footers
              </li>
              <li className="flex items-center text-galaxy-light/80">
                <CheckCircle className="h-6 w-6 text-galaxy-purple mr-3 flex-shrink-0" />
                Tailor UI themes, colors, and layout structures
              </li>
              <li className="flex items-center text-galaxy-light/80">
                <CheckCircle className="h-6 w-6 text-galaxy-purple mr-3 flex-shrink-0" />
                Dynamic class, section, and subject setup
              </li>
            </ul>
          </div>
          
          <div className="w-full lg:w-1/2 relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-galaxy-purple to-pink-500 rounded-3xl opacity-20 blur-2xl animate-pulse-slow" />
            <GlassCard className="p-6 md:p-8 relative z-10" glow>
              <div className="space-y-6">
                 {/* Mock UI Form */}
                 <div>
                   <label className="block text-sm font-medium text-white mb-2 flex items-center">
                     <ImageIcon className="h-4 w-4 mr-2" /> Institution Logo
                   </label>
                   <div className="w-full h-24 border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                     <span className="text-sm text-galaxy-light/50">Drag & drop logo or click to browse</span>
                   </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-white mb-2 flex items-center">
                      <Layout className="block h-4 w-4 mr-2" /> Institution Name
                    </label>
                    <input type="text" disabled defaultValue="Springfield High" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none" />
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-white mb-2 flex items-center">
                     <Palette className="h-4 w-4 mr-2" /> Theme Customization
                   </label>
                   <div className="flex gap-4">
                     <div className="w-10 h-10 rounded-full bg-[#0B0B1A] border-2 border-galaxy-purple cursor-pointer" />
                     <div className="w-10 h-10 rounded-full bg-white border-2 border-white/10 cursor-pointer" />
                     <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-white/10 cursor-pointer" />
                   </div>
                 </div>
                 
                 <button className="w-full py-3 mt-4 rounded-lg bg-galaxy-purple hover:bg-galaxy-blue text-white font-medium transition-colors">
                   Save Brand Settings
                 </button>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Customization;

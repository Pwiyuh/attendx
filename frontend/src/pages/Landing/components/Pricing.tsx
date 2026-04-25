import React from 'react';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import GlassCard from '../../../components/ui/GlassCard';

const Pricing: React.FC = () => {
  const plans = [
    {
      name: 'Basic',
      price: '$49',
      period: '/month',
      description: 'Perfect for small schools or single departments.',
      features: [
        'Up to 500 Students',
        'Basic Real-time Tracking',
        'Standard Email Support',
        'Export to CSV'
      ],
      highlighted: false
    },
    {
      name: 'Standard',
      price: '$129',
      period: '/month',
      description: 'Ideal for growing institutions with multiple branches.',
      features: [
        'Up to 2,500 Students',
        'Advanced Analytics',
        'Automated Notifications',
        'Priority Phone Support',
        'Role-based Access Control'
      ],
      highlighted: true
    },
    {
      name: 'Premium',
      price: 'Custom',
      period: '',
      description: 'For large universities needing enterprise scale.',
      features: [
        'Unlimited Students',
        'Custom Integrations (API)',
        'White-label Native App',
        'Dedicated Success Manager',
        'SSO Authentication'
      ],
      highlighted: false
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-galaxy-900 relative">
      <div className="absolute left-0 bottom-0 w-full h-[500px] bg-gradient-to-t from-[#0B0B1A] to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
            Transparent Pricing for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-galaxy-purple">Every Institution</span>
          </h2>
          <p className="text-lg text-galaxy-light/70">
            Choose the plan that best fits your scale. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <GlassCard 
              key={index} 
              className={`flex flex-col p-8 ${plan.highlighted ? 'md:scale-110 border-galaxy-purple/50 shadow-[0_0_40px_rgba(109,40,217,0.3)] z-20' : 'z-10'}`}
              glow={plan.highlighted}
            >
              {plan.highlighted && (
                <div className="absolute top-0 inset-x-0 mx-auto w-max -translate-y-1/2 rounded-full bg-galaxy-purple px-4 py-1 text-sm font-semibold text-white shadow-lg">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-sm text-galaxy-light/60 h-10">{plan.description}</p>
              </div>
              <div className="mb-8">
                 <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                 {plan.period && <span className="text-galaxy-light/60">{plan.period}</span>}
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <Check className="h-5 w-5 text-galaxy-purple shrink-0 mr-3" />
                    <span className="text-galaxy-light/80 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Link 
                to="/get-started"
                className={`w-full py-3 px-6 rounded-full text-center font-semibold transition-all ${
                  plan.highlighted 
                    ? 'bg-galaxy-purple hover:bg-galaxy-blue text-white shadow-[0_0_20px_rgba(109,40,217,0.4)]' 
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {plan.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
              </Link>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;

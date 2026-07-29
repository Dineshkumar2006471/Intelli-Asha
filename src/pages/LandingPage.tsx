import { Link } from 'react-router-dom';
import { useState } from 'react';

const LandingPage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface font-body-base">
      {/* ─── Sticky Header ─── */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border-default">
        <div className="flex justify-between items-center px-gutter py-4 w-full max-w-[1200px] mx-auto">
          <Link to="/">
            <img src="/logo-ia.png" alt="IntelliASHA Logo" className="h-8 w-auto object-contain cursor-pointer" />
          </Link>
          <nav className="hidden md:flex gap-8 items-center">
            <a className="text-on-surface font-title-sm text-[14px] hover:text-primary transition-colors" href="#">Home</a>
            <a className="text-secondary font-title-sm text-[14px] hover:text-primary transition-colors" href="#innovation">Innovation</a>
            <a className="text-secondary font-title-sm text-[14px] hover:text-primary transition-colors" href="#benefits">Benefits</a>
            <a className="text-secondary font-title-sm text-[14px] hover:text-primary transition-colors" href="#difference">Why Us</a>
          </nav>
          <div className="hidden md:block">
            <Link to="/login" className="bg-primary text-on-primary font-label-md text-label-md px-5 py-2.5 rounded-lg hover:bg-surface-tint transition-all duration-200 shadow-sm hover:shadow-md">
              Get Started
            </Link>
          </div>
          {/* Mobile Hamburger Button */}
          <button 
            className="md:hidden p-2 text-on-surface-variant focus:outline-none" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <span className="material-symbols-outlined text-2xl">{isMobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <nav className="md:hidden absolute top-full left-0 w-full bg-surface border-b border-border-default shadow-lg py-4 px-gutter flex flex-col gap-4 z-40">
            <a className="text-on-surface font-title-sm text-[16px] py-2 border-b border-border-default" href="#" onClick={() => setIsMobileMenuOpen(false)}>Home</a>
            <a className="text-secondary font-title-sm text-[16px] py-2 border-b border-border-default" href="#innovation" onClick={() => setIsMobileMenuOpen(false)}>Innovation</a>
            <a className="text-secondary font-title-sm text-[16px] py-2 border-b border-border-default" href="#benefits" onClick={() => setIsMobileMenuOpen(false)}>Benefits</a>
            <a className="text-secondary font-title-sm text-[16px] py-2 border-b border-border-default" href="#difference" onClick={() => setIsMobileMenuOpen(false)}>Why Us</a>
            <Link to="/login" className="bg-primary text-on-primary text-center font-label-md text-label-md px-5 py-3 rounded-lg hover:bg-surface-tint transition-all mt-2" onClick={() => setIsMobileMenuOpen(false)}>
              Get Started
            </Link>
          </nav>
        )}
      </header>

      {/* ─── Hero Section (Ref-5 Clean Layout) ─── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-surface via-[#ebf0fc] to-surface">
        {/* Subtle background radial glow to mimic the reference */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_50%,_rgba(216,226,255,0.7)_0%,_transparent_50%)]"></div>
        
        <div className="max-w-[1200px] mx-auto px-gutter py-16 md:py-20 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-[500px]">
            
            {/* Left Content */}
            <div className="max-w-xl z-20 pt-8">
              <h1 className="font-display-hero text-on-surface mb-6 text-[36px] md:text-[48px] leading-[1.15] tracking-tight font-black">
                Data Verification<br/>
                <span className="text-primary text-[32px] md:text-[40px] font-bold">Made Easy & Fast</span>
              </h1>
              
              <p className="font-body-base text-secondary mb-10 text-[16px] leading-relaxed max-w-lg">
                You can monitor and manage rural health visits with the platform we provide. We replace manual paperwork with real-time AI data capture in 6 regional languages.
              </p>
              
              <div className="flex items-center gap-8 mb-16">
                <Link to="/login" className="bg-primary text-white font-label-md text-[14px] px-8 py-3 rounded-md hover:bg-primary/90 transition-all duration-200 shadow-sm">
                  Get Started
                </Link>
                <a href="#innovation" className="text-primary font-label-md text-[14px] hover:underline">
                  Read Case Study
                </a>
              </div>

              {/* Stats row embedded in hero like the reference */}
              <div className="grid grid-cols-3 gap-6 pt-4 border-t-0">
                <div>
                  <div className="font-headline-kpi text-primary text-[28px] font-bold mb-1">1M+</div>
                  <div className="font-label-md text-[13px] text-primary/80">ASHA Workers</div>
                </div>
                <div>
                  <div className="font-headline-kpi text-primary text-[28px] font-bold mb-1">6</div>
                  <div className="font-label-md text-[13px] text-primary/80">Languages</div>
                </div>
                <div>
                  <div className="font-headline-kpi text-primary text-[28px] font-bold mb-1">&lt;2s</div>
                  <div className="font-label-md text-[13px] text-primary/80">Verification</div>
                </div>
              </div>
            </div>

            {/* Right Visual - Large Isolated Subject with Floating Icons */}
            <div className="relative h-full hidden lg:flex items-end justify-end">
              {/* Main character image, mix-blend-multiply drops the white background on light surfaces */}
              <img 
                src="/images/asha-hero.png" 
                alt="ASHA Worker" 
                className="relative z-10 w-auto h-[600px] object-cover object-top mix-blend-multiply origin-bottom transform translate-y-12" 
              />
              
              {/* Floating Vertical Icons mimicking the reference's social bar */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-20">
                <div className="w-[2px] h-12 bg-primary/30 mb-2"></div>
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-md cursor-pointer hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[20px]">mic</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-md cursor-pointer hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-md cursor-pointer hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[20px]">analytics</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-md cursor-pointer hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Scrolling Marquee / Social Proof ─── */}
      <section className="bg-on-surface py-4 overflow-hidden border-y border-on-surface-variant/20">
        <div className="flex gap-16 whitespace-nowrap animate-scroll items-center px-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-16 items-center">
              <span className="text-white/80 font-title-sm text-[16px]">Real-Time Verification</span>
              <span className="material-symbols-outlined text-primary text-[20px]">asterisk</span>
              <span className="text-white/80 font-title-sm text-[16px]">Multilingual Voice Capture</span>
              <span className="material-symbols-outlined text-primary text-[20px]">asterisk</span>
              <span className="text-white/80 font-title-sm text-[16px]">Automated Anomaly Detection</span>
              <span className="material-symbols-outlined text-primary text-[20px]">asterisk</span>
              <span className="text-white/80 font-title-sm text-[16px]">Cloud Native Architecture</span>
              <span className="material-symbols-outlined text-primary text-[20px]">asterisk</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Section 1: The Innovation ─── */}
      <section className="py-20 md:py-28 bg-surface" id="innovation">
        <div className="max-w-[1200px] mx-auto px-gutter">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <img src="/images/community-health-center.png" alt="Community Health Center" className="w-full h-[400px] object-cover rounded-2xl shadow-lg" />
              {/* Floating KPI Card */}
              <div className="absolute -bottom-8 -right-8 bg-surface p-6 rounded-xl shadow-xl border border-border-default hidden md:block">
                <div className="text-primary font-display-hero text-[32px] leading-none mb-1">&lt; 2s</div>
                <div className="text-secondary font-label-md text-[12px] uppercase tracking-wider">Verification Latency</div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-[2px] bg-primary"></span>
                <span className="font-label-md text-[12px] text-primary uppercase tracking-widest">The Innovation</span>
              </div>
              <h2 className="font-display-landing text-[36px] md:text-[44px] text-on-surface mb-6 leading-tight">AI-Powered Data Capture at the Edge</h2>
              <p className="font-body-base text-secondary mb-6 text-[17px] leading-relaxed">
                Traditional reporting involves weeks of manual paperwork. IntelliASHA introduces a streamlined digital interface designed specifically for field conditions.
              </p>
              
              <div className="space-y-6 mt-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">translate</span>
                  </div>
                  <div>
                    <h3 className="font-title-md text-[18px] text-on-surface mb-1">Native Language Processing</h3>
                    <p className="font-body-base text-secondary text-[14px]">Speak or type in Hindi, Tamil, Telugu, Kannada, Marathi, or Bengali. Google AI instantly standardizes it.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">verified</span>
                  </div>
                  <div>
                    <h3 className="font-title-md text-[18px] text-on-surface mb-1">Automated Verification</h3>
                    <p className="font-body-base text-secondary text-[14px]">Data is cross-referenced with geo-tags and historical records to ensure visit authenticity instantly.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 2: Benefits to ASHA Workers ─── */}
      <section className="py-20 md:py-28 bg-surface-container-low" id="benefits">
        <div className="max-w-[1200px] mx-auto px-gutter">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-[2px] bg-at-risk-red"></span>
                <span className="font-label-md text-[12px] text-at-risk-red uppercase tracking-widest">Worker Impact</span>
              </div>
              <h2 className="font-display-landing text-[36px] md:text-[44px] text-on-surface mb-6 leading-tight">Eliminating the Burden of Paperwork</h2>
              <p className="font-body-base text-secondary mb-8 text-[17px] leading-relaxed">
                ASHA workers are meant to be healthcare providers, not data entry clerks. Our platform reduces reporting time by 80%, allowing workers to focus on what matters most: patient care.
              </p>
              
              <div className="bg-surface rounded-xl p-6 border border-border-default shadow-sm mb-4 flex items-center justify-between">
                <div>
                  <div className="font-title-md text-on-surface text-[16px]">Time Spent on Care</div>
                  <div className="font-label-sm text-secondary">Before vs After IntelliASHA</div>
                </div>
                <div className="font-display-hero text-verified-green text-[32px] leading-none">+60%</div>
              </div>
              <div className="bg-surface rounded-xl p-6 border border-border-default shadow-sm flex items-center justify-between">
                <div>
                  <div className="font-title-md text-on-surface text-[16px]">Reporting Errors</div>
                  <div className="font-label-sm text-secondary">Automated anomaly detection</div>
                </div>
                <div className="font-display-hero text-primary text-[32px] leading-none">-45%</div>
              </div>
            </div>
            
            <div className="relative">
               <img src="/images/asha-briefing.png" alt="ASHA Briefing" className="w-full h-[450px] object-cover rounded-2xl shadow-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 3: How we are different (Grid) ─── */}
      <section className="py-20 md:py-28 bg-surface" id="difference">
        <div className="max-w-[1200px] mx-auto px-gutter text-center">
          <div className="flex items-center gap-3 justify-center mb-4">
            <span className="w-8 h-[2px] bg-primary"></span>
            <span className="font-label-md text-[12px] text-primary uppercase tracking-widest">Why IntelliASHA</span>
            <span className="w-8 h-[2px] bg-primary"></span>
          </div>
          <h2 className="font-display-landing text-[36px] md:text-[44px] text-on-surface mb-12 leading-tight">Built for Scale and Transparency</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-surface-container-low rounded-2xl p-8 hover:shadow-md transition-shadow border border-transparent hover:border-border-default">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                <span className="material-symbols-outlined">dashboard</span>
              </div>
              <h3 className="font-title-lg text-[20px] text-on-surface mb-3">Real-Time DHO Dashboards</h3>
              <p className="font-body-base text-secondary text-[15px] leading-relaxed">
                Unlike legacy systems where data is weeks old, District Health Officers see verified metrics, resource needs, and anomalies the second they happen in the field.
              </p>
            </div>
            
            <div className="bg-surface-container-low rounded-2xl p-8 hover:shadow-md transition-shadow border border-transparent hover:border-border-default">
              <div className="w-12 h-12 rounded-full bg-flagged-amber/10 text-flagged-amber flex items-center justify-center mb-6">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <h3 className="font-title-lg text-[20px] text-on-surface mb-3">Fraud & Anomaly Detection</h3>
              <p className="font-body-base text-secondary text-[15px] leading-relaxed">
                Advanced AI flags overlapping timestamps, impossible travel distances between geo-anchors, and repeated generic notes for supervisor review.
              </p>
            </div>
            
            <div className="bg-surface-container-low rounded-2xl p-8 hover:shadow-md transition-shadow border border-transparent hover:border-border-default">
              <div className="w-12 h-12 rounded-full bg-verified-green/10 text-verified-green flex items-center justify-center mb-6">
                <span className="material-symbols-outlined">cloud</span>
              </div>
              <h3 className="font-title-lg text-[20px] text-on-surface mb-3">100% Cloud Native</h3>
              <p className="font-body-base text-secondary text-[15px] leading-relaxed">
                Built on secure, scalable Google Cloud infrastructure, capable of supporting 1 million ASHA workers simultaneously without performance degradation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer CTA ─── */}
      <section className="relative w-full h-[300px] overflow-hidden flex items-center">
        {/* Blurred Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/footer-cta-bg.png')" }}
        ></div>
        <div className="absolute inset-0 bg-on-surface/60 backdrop-blur-md"></div>
        
        {/* Content */}
        <div className="relative z-10 w-full flex flex-col items-center justify-center px-gutter text-center">
          <h2 className="font-display-landing text-[32px] md:text-[44px] text-white mb-4 leading-tight">Ready to Transform Rural Healthcare?</h2>
          <p className="font-body-base text-white/80 text-[17px] mb-8 max-w-2xl mx-auto leading-relaxed">
            Join the AI-powered mission to bring accountability and transparency to India's last-mile health infrastructure.
          </p>
          <Link to="/login" className="bg-primary text-on-primary font-label-md text-[15px] px-8 py-3.5 rounded-lg hover:bg-surface-tint transition-all duration-200 shadow-lg hover:shadow-xl inline-flex items-center gap-2">
            Get Started Now
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </section>

      {/* ─── Standard Footer ─── */}
      <footer className="bg-on-surface border-t border-on-surface-variant/20">
        <div className="w-full py-8 px-gutter flex flex-col md:flex-row justify-between items-center max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <Link to="/">
              <img src="/logo-ia.png" alt="IntelliASHA Logo" className="h-6 w-auto object-contain brightness-0 invert" />
            </Link>
            <div className="font-label-sm text-[12px] text-white/50">© 2024 IntelliASHA. Built on Google AI.</div>
          </div>
          <div className="flex gap-6">
            <a className="font-label-sm text-[12px] text-white/50 hover:text-white transition-colors" href="#">Platform</a>
            <a className="font-label-sm text-[12px] text-white/50 hover:text-white transition-colors" href="#">Contact Us</a>
            <a className="font-label-sm text-[12px] text-white/50 hover:text-white transition-colors" href="#">Privacy & Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

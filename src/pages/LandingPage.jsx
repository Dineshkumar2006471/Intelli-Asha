import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background-subtle">
      {/* 
        Note: Links and interactive elements need to be wired up. 
        Replace <a> tags with <Link to="..."> where appropriate.
      */}
      

<header className="bg-surface dark:bg-on-background docked full-width top-0 border-b border-border-default dark:border-outline-variant flat no shadows transition-all duration-200 ease-in-out relative z-20">
<div className="flex justify-between items-center px-gutter py-4 w-full max-w-max-width mx-auto">
<img src="/logo-ia.png" alt="IntelliASHA Logo" className="h-8 w-auto object-contain" />
<nav className="hidden md:flex gap-8">
<a className="text-primary dark:text-primary-fixed border-b-2 border-primary pb-1 font-title-sm text-title-sm hover:text-primary-container dark:hover:text-primary-fixed transition-colors" href="#">Home</a>
<a className="text-secondary dark:text-secondary-fixed-dim font-title-sm text-title-sm hover:text-primary-container dark:hover:text-primary-fixed transition-colors" href="#how-it-works">How It Works</a>
<a className="text-secondary dark:text-secondary-fixed-dim font-title-sm text-title-sm hover:text-primary-container dark:hover:text-primary-fixed transition-colors" href="#impact">Impact</a>
</nav>
<Link to="/login" className="bg-primary-container text-on-primary-container font-label-md text-label-md px-4 py-2 rounded-lg hover:bg-surface-tint transition-colors">Request Demo</Link>
</div>
</header>

<section className="relative overflow-hidden" style={{ backgroundImage: "url('/hero_bg.png')", backgroundSize: "cover", backgroundPosition: "center center", backgroundRepeat: "no-repeat" }}>

<div className="max-w-max-width mx-auto px-gutter py-margin-desktop relative z-10 text-center flex flex-col items-center">
<div>
<h1 className="font-display-hero text-on-surface mb-6 text-[32px] md:text-display-landing lg:text-[56px] leading-tight xl:whitespace-nowrap"><span className="text-text-primary">1 Million ASHA Workers.</span> <span className="text-at-risk-red">Zero Verified Visits.</span></h1>
<p className="font-title-lg text-title-lg text-secondary mb-8 leading-snug max-w-3xl mx-auto">We built the AI agent network that fixes India's last-mile health reporting — in real time, in 6 languages, entirely on Google's AI stack.</p>
<div className="flex gap-4 justify-center">
<Link to="/login" className="bg-primary-container text-on-primary-container font-label-md text-label-md px-6 py-3 rounded-lg hover:bg-surface-tint transition-colors">Explore the Platform</Link>
<button className="border border-border-strong text-text-primary font-label-md text-label-md px-6 py-3 rounded-lg hover:bg-surface-variant transition-colors bg-surface/50 backdrop-blur-sm">Read Case Study</button>
</div>
</div>
</div>
</section>

<section className="bg-surface-container-low border-y border-border-default py-8">
<div className="max-w-max-width mx-auto px-gutter grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
<div>
<div className="font-headline-kpi text-headline-kpi text-primary mb-2">1M+</div>
<div className="font-label-md text-label-md text-secondary uppercase tracking-wider">Health Workers</div>
</div>
<div>
<div className="font-headline-kpi text-headline-kpi text-primary mb-2">6</div>
<div className="font-label-md text-label-md text-secondary uppercase tracking-wider">Native Languages</div>
</div>
<div>
<div className="font-headline-kpi text-headline-kpi text-primary mb-2">&lt; 2s</div>
<div className="font-label-md text-label-md text-secondary uppercase tracking-wider">Verification Latency</div>
</div>
<div>
<div className="font-headline-kpi text-headline-kpi text-primary mb-2">100%</div>
<div className="font-label-md text-label-md text-secondary uppercase tracking-wider">Cloud Native</div>
</div>
</div>
</section>

<section className="max-w-max-width mx-auto px-gutter py-margin-desktop">
<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
<div>
<h2 className="font-display-landing text-display-landing text-on-surface mb-6">The Ground Reality</h2>
<p className="font-body-base text-body-base text-secondary mb-6 text-lg">ASHA workers are the backbone of India's rural health system. Yet, legacy reporting systems are slow, prone to errors, and difficult to verify at scale.</p>
<p className="font-body-base text-body-base text-secondary text-lg">By introducing intelligent data capture and automated verification, we bring transparency to the frontlines without adding burden to the workers.</p>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<img alt="ASHA worker interacting with mother and child" className="w-full h-[300px] object-cover rounded-xl shadow-md grayscale" src="https://lh3.googleusercontent.com/aida/AP1WRLtYq56BPLP_GD8PD_Abf5tFiclC_ouY-ZCmuYWOMY8WkiMzH5HWWoHQcebs7i3n7PoXFchZdldYMsQABVvLEjduZlwHaw-iOpUvMjYRxh7Ftr_boJ9QmQi6wl8kXRe44r5LQgSEdROeFER4KvEEqqlhTcUWmC8janMFSixcqlbI8jt46XmqfUrG5aejnuccCHg_HrBRnf9c0o7qoDG1nz4xGMWpIz2Kjav7l6Pgka2U7l2XViOM8NxwWE4" />
<img alt="ASHA workers in briefing" className="w-full h-[300px] object-cover rounded-xl shadow-md grayscale mt-8" src="https://lh3.googleusercontent.com/aida/AP1WRLsjzD35p6Y4msSwEgK3s2kMXtF0gaPcD2WB5S372FsHONKpxLbo8nCn0sigm22t5MHwX_U9rvgDwajiTOxjGprbgbNmFSoj_CjGMofmk4sYNsg1EWuIXMK2ESggaCCTmXB7E-gJ3m43SXwbSTvaRrY1XdhlEAbJjz8N2XjNv0_ulg5wqVXe9HGOhGztPru_AYJd9iOdnNG3g0_DiYdUv1iTVk81YRWEdNrLWI7sx2qXGzo-1fFQPlrmMg" />
</div>
</div>
</section>

<section className="w-full overflow-hidden bg-surface-container-low py-8 border-y border-border-default">
<div className="horizontal-scroll gap-4 px-gutter pb-4 flex animate-scroll w-max">
<img alt="ASHA worker in rural village" className="scroll-item w-[300px] md:w-[450px] h-[300px] object-cover rounded-xl shadow-sm grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBj1FYf-fw3O_VikyiZk46FoJACs0ogLKG2GqZwGz4_Qx2J4HepaczQaTQRC37aWt6MaqFB2FR9H2ABkyi6nNZfqmt9X9qaSRHEMGUeW75bdTeQXiezSr5WzoymRGePldojGqXXl4mDqAWcfTk4kyxielk2lRdFfR2aJ2QEsY5MQT4GOdD-bVSRqA-BcZFiO1AwPves9zxtsaZz7f0rft0m2V8HlCZMFI18e9hrUjon3gvO7wWNn7K9xNeG-_eSKNDaEuoOzDtC_Us" />
<img alt="Close up of health app on smartphone" className="scroll-item w-[300px] md:w-[450px] h-[300px] object-cover rounded-xl shadow-sm grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD15plri8SGWvwWeei4NWgqX7ddL9oRcjgiWMYNvHNI0fvaU2s-hTOugvtFno553aDyH1oaGgnnYPqP496N6-AImdQ22ebv_dTW48aVktDCmKW4FO5rU4TOucx4UF4_SKyFB2cq3vgraWW-r7UpLhyjiDGPBy7ENNpOR7moP-ESgJBaBwETNdBELgelrQwd5bbvwI1lEo3QB1X9ZOQVJ-ytLx9c1c5mLh6E48OVvemuzh-v33kpVadEe9Qhta5JV3z_wxtvdvt2F28" />
<img alt="ASHA worker in rural village" className="scroll-item w-[300px] md:w-[450px] h-[300px] object-cover rounded-xl shadow-sm grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBj1FYf-fw3O_VikyiZk46FoJACs0ogLKG2GqZwGz4_Qx2J4HepaczQaTQRC37aWt6MaqFB2FR9H2ABkyi6nNZfqmt9X9qaSRHEMGUeW75bdTeQXiezSr5WzoymRGePldojGqXXl4mDqAWcfTk4kyxielk2lRdFfR2aJ2QEsY5MQT4GOdD-bVSRqA-BcZFiO1AwPves9zxtsaZz7f0rft0m2V8HlCZMFI18e9hrUjon3gvO7wWNn7K9xNeG-_eSKNDaEuoOzDtC_Us" />
<img alt="Community Health Center" className="scroll-item w-[300px] md:w-[450px] h-[300px] object-cover rounded-xl shadow-sm grayscale" src="https://lh3.googleusercontent.com/aida/AP1WRLsjzD35p6Y4msSwEgK3s2kMXtF0gaPcD2WB5S372FsHONKpxLbo8nCn0sigm22t5MHwX_U9rvgDwajiTOxjGprbgbNmFSoj_CjGMofmk4sYNsg1EWuIXMK2ESggaCCTmXB7E-gJ3m43SXwbSTvaRrY1XdhlEAbJjz8N2XjNv0_ulg5wqVXe9HGOhGztPru_AYJd9iOdnNG3g0_DiYdUv1iTVk81YRWEdNrLWI7sx2qXGzo-1fFQPlrmMg" />
<img alt="Mother and Child Care" className="scroll-item w-[300px] md:w-[450px] h-[300px] object-cover rounded-xl shadow-sm grayscale" src="https://lh3.googleusercontent.com/aida/AP1WRLtYq56BPLP_GD8PD_Abf5tFiclC_ouY-ZCmuYWOMY8WkiMzH5HWWoHQcebs7i3n7PoXFchZdldYMsQABVvLEjduZlwHaw-iOpUvMjYRxh7Ftr_boJ9QmQi6wl8kXRe44r5LQgSEdROeFER4KvEEqqlhTcUWmC8janMFSixcqlbI8jt46XmqfUrG5aejnuccCHg_HrBRnf9c0o7qoDG1nz4xGMWpIz2Kjav7l6Pgka2U7l2XViOM8NxwWE4" />
</div>
</section>

<section className="max-w-max-width mx-auto px-gutter py-margin-desktop" id="how-it-works">
<div className="text-center mb-12">
<h2 className="font-display-landing text-display-landing text-on-surface mb-4">How the Agent Network Operates</h2>
<p className="font-title-md text-title-md text-secondary max-w-3xl mx-auto">A seamless, AI-driven pipeline verifying health data from the field to the dashboard.</p>
</div>
<div className="relative">

<div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-border-default -z-10 transform -translate-y-1/2"></div>
<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">

<div className="bg-surface relative flex flex-col items-center text-center">
<div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-title-lg mb-4 border-4 border-surface z-10">1</div>
<h3 className="font-title-sm text-title-sm text-on-surface mb-2">Data Capture</h3>
<p className="font-body-base text-body-base text-secondary">Workers input text or voice notes in native languages via simple mobile interfaces.</p>
</div>

<div className="bg-surface relative flex flex-col items-center text-center">
<div className="w-12 h-12 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center font-title-lg mb-4 border-4 border-surface z-10">2</div>
<h3 className="font-title-sm text-title-sm text-on-surface mb-2">Translation</h3>
<p className="font-body-base text-body-base text-secondary">Google AI instantly translates regional dialects into standardized English for processing.</p>
</div>

<div className="bg-surface relative flex flex-col items-center text-center">
<div className="w-12 h-12 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center font-title-lg mb-4 border-4 border-surface z-10">3</div>
<h3 className="font-title-sm text-title-sm text-on-surface mb-2">Verification</h3>
<p className="font-body-base text-body-base text-secondary">Agents cross-reference historical data and geographical markers to validate reports.</p>
</div>

<div className="bg-surface relative flex flex-col items-center text-center">
<div className="w-12 h-12 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center font-title-lg mb-4 border-4 border-surface z-10">4</div>
<h3 className="font-title-sm text-title-sm text-on-surface mb-2">Anomaly Detection</h3>
<p className="font-body-base text-body-base text-secondary">Suspicious patterns or inconsistencies are automatically flagged for manual review.</p>
</div>

<div className="bg-surface relative flex flex-col items-center text-center">
<div className="w-12 h-12 rounded-full bg-verified-bg text-verified-green flex items-center justify-center font-title-lg mb-4 border-4 border-surface z-10"><span className="material-symbols-outlined">check</span></div>
<h3 className="font-title-sm text-title-sm text-on-surface mb-2">Dashboard Sync</h3>
<p className="font-body-base text-body-base text-secondary">Clean, verified data is visualized on institutional dashboards in real-time.</p>
</div>
</div>
</div>
</section>

<section className="bg-surface-bright border-y border-border-default py-margin-desktop" id="impact">
<div className="max-w-max-width mx-auto px-gutter">
<div className="text-center mb-16">
<h2 className="font-display-landing text-display-landing text-on-surface mb-4">Measurable Impact at Scale</h2>
<p className="font-title-md text-title-md text-secondary max-w-3xl mx-auto">Driving accountability and transparency in public health infrastructure.</p>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-12">
<div className="text-center border-b md:border-b-0 md:border-r border-border-default pb-8 md:pb-0 md:pr-8 last:border-0">
<div className="font-display-hero text-display-hero text-primary mb-2">45%</div>
<h3 className="font-title-lg text-title-lg text-on-surface mb-3">Reduction in Errors</h3>
<p className="font-body-base text-body-base text-secondary">Significant decrease in reporting discrepancies and data entry mistakes across deployed districts.</p>
</div>
<div className="text-center border-b md:border-b-0 md:border-r border-border-default pb-8 md:pb-0 md:pr-8 md:pl-8 last:border-0">
<div className="font-display-hero text-display-hero text-primary mb-2">2.4M</div>
<h3 className="font-title-lg text-title-lg text-on-surface mb-3">Beneficiaries Tracked</h3>
<p className="font-body-base text-body-base text-secondary">Accurate tracking of maternal and child health interventions leading to better resource allocation.</p>
</div>
<div className="text-center md:pl-8">
<div className="font-display-hero text-display-hero text-primary mb-2">10x</div>
<h3 className="font-title-lg text-title-lg text-on-surface mb-3">Faster Processing</h3>
<p className="font-body-base text-body-base text-secondary">Reduction in data processing time from manual entry to dashboard availability.</p>
</div>
</div>
</div>
</section>

<footer className="bg-surface-container-highest dark:bg-inverse-surface border-t border-border-default flat no shadows full-width transition-opacity duration-200 mt-24">
<div className="w-full py-8 px-gutter flex flex-col md:flex-row justify-between items-center max-w-max-width mx-auto">
<div className="font-label-sm text-label-sm text-on-surface-variant dark:text-secondary-fixed mb-4 md:mb-0">© 2024 IntelliASHA. AI House × Google for Developers.</div>
<div className="flex gap-6">
<a className="font-label-sm text-label-sm text-on-secondary-container hover:text-primary dark:hover:text-primary-fixed transition-colors" href="#">GitHub</a>
<a className="font-label-sm text-label-sm text-on-secondary-container hover:text-primary dark:hover:text-primary-fixed transition-colors" href="#">Contact</a>
<a className="font-label-sm text-label-sm text-on-secondary-container hover:text-primary dark:hover:text-primary-fixed transition-colors" href="#">Privacy</a>
</div>
</div>
</footer>





    </div>
  );
};

export default LandingPage;

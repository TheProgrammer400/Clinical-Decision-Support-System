'use client';

import React from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  Cpu,
  FileText,
  AlertTriangle,
  Search,
  CheckCircle2,
  ChevronRight,
  Stethoscope,
  Terminal,
  Layers,
  Gavel,
  MemoryStick,
  Sparkles,
  Zap,
} from 'lucide-react';

export default function HomePage() {
  const [activeSection, setActiveSection] = React.useState<string>('overview');

  const handleScroll = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  React.useEffect(() => {
    const sectionIds = ['overview', 'how-it-works', 'capabilities', 'safety'];

    const updateActiveSection = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Edge case: Top of the page -> activate the first section ('overview')
      if (scrollPosition < 80) {
        setActiveSection('overview');
        return;
      }

      // Edge case: Near bottom of the page -> activate the last section ('safety')
      if (scrollPosition + windowHeight >= documentHeight - 50) {
        setActiveSection('safety');
        return;
      }

      // Dynamic focal offset line: 35% down the active viewport
      const targetLine = windowHeight * 0.35;
      let current = 'overview';

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= targetLine) {
            current = id;
          }
        }
      }

      setActiveSection(current);
    };

    // Primary IntersectionObserver for efficient viewport monitoring
    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '-80px 0px -40% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1.0],
    };

    const observer = new IntersectionObserver(() => {
      updateActiveSection();
    }, observerOptions);

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    // Passive scroll & resize listener with requestAnimationFrame for smooth updates
    let ticking = false;
    const handleScrollOrResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateActiveSection();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Initial check on mount
    updateActiveSection();

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-body selection:bg-primary selection:text-on-primary">
      {/* 1. TOP NAVBAR HEADER */}
      <header className="sticky top-0 z-50 w-full flex justify-between items-center px-6 py-3.5 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-headline font-bold text-primary tracking-tight">Obsidian CDSS</span>
            <span className="text-xs bg-surface-container-highest border border-outline-variant text-on-surface-variant px-1.5 py-0.5 rounded font-mono">
              Groq v1.4
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <a
            href="#overview"
            onClick={handleScroll('overview')}
            className={
              activeSection === 'overview'
                ? 'text-primary font-bold border-b-2 border-primary pb-0.5 text-sm transition-colors'
                : 'text-on-surface-variant hover:text-on-surface transition-colors text-sm'
            }
          >
            Platform
          </a>
          <a
            href="#how-it-works"
            onClick={handleScroll('how-it-works')}
            className={
              activeSection === 'how-it-works'
                ? 'text-primary font-bold border-b-2 border-primary pb-0.5 text-sm transition-colors'
                : 'text-on-surface-variant hover:text-on-surface transition-colors text-sm'
            }
          >
            Reasoning
          </a>
          <a
            href="#capabilities"
            onClick={handleScroll('capabilities')}
            className={
              activeSection === 'capabilities'
                ? 'text-primary font-bold border-b-2 border-primary pb-0.5 text-sm transition-colors'
                : 'text-on-surface-variant hover:text-on-surface transition-colors text-sm'
            }
          >
            Capabilities
          </a>
          <a
            href="#safety"
            onClick={handleScroll('safety')}
            className={
              activeSection === 'safety'
                ? 'text-primary font-bold border-b-2 border-primary pb-0.5 text-sm transition-colors'
                : 'text-on-surface-variant hover:text-on-surface transition-colors text-sm'
            }
          >
            Governance
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="bg-primary hover:bg-primary-fixed-dim text-on-primary text-sm font-bold py-1.5 px-4 rounded-full transition-colors active:scale-95 duration-200 flex items-center gap-1.5"
          >
            <span>Sign In</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow pt-10 pb-16 px-6 max-w-7xl mx-auto w-full flex flex-col gap-24">
        {/* 2. HERO SECTION */}
        <section id="overview" className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-4">
          {/* Left Column: Core Value Proposition */}
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 bg-surface-container border border-outline-variant rounded-full px-3 py-1 w-fit">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary tracking-wide uppercase">
                AI-Assisted Clinical Decision Support
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-extrabold tracking-tight leading-tight text-on-surface">
              Clinical Decision Support, <br />
              <span className="text-primary">Built for Better Decisions.</span>
            </h1>

            <p className="text-base sm:text-lg text-on-surface-variant max-w-xl leading-relaxed">
              An AI-assisted clinical decision support system that helps physicians analyze clinical presentations, explore differential diagnoses, identify urgent concerns, and determine appropriate next diagnostic investigations.
            </p>

            <div className="flex items-center gap-4 pt-2">
              <Link
                href="/login"
                className="bg-primary hover:bg-primary-fixed-dim text-on-primary text-sm font-bold py-2.5 px-6 rounded transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
              >
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#capabilities"
                onClick={handleScroll('capabilities')}
                className="bg-transparent border border-outline-variant hover:bg-surface-container-high text-on-surface text-sm font-medium py-2.5 px-6 rounded transition-colors flex items-center gap-2"
              >
                <span>Explore Capabilities</span>
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            <div className="bg-surface-container-low border border-outline-variant rounded p-4 flex gap-3 mt-4">
              <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-on-surface-variant leading-relaxed">
                <strong className="text-on-surface font-semibold">Non-Diagnostic Disclaimer:</strong> AI-generated decision support — not a definitive diagnosis. Clinical judgment remains with the licensed healthcare professional.
              </p>
            </div>
          </div>

          {/* Right Column: Interface Preview Card */}
          <div className="bg-surface-container rounded-lg border border-outline-variant p-6 flex flex-col gap-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-on-surface tracking-widest uppercase">
                  CDSS Interface Preview
                </span>
              </div>
              <span className="text-[10px] bg-surface-container-highest border border-outline-variant text-primary px-2 py-0.5 rounded font-mono">
                Groq LLM v1.4
              </span>
            </div>

            {/* Case Presentation */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-on-surface-variant uppercase font-semibold tracking-wider">
                Case Presentation
              </span>
              <p className="text-xs sm:text-sm text-on-surface bg-surface-container-lowest p-3 rounded border border-outline-variant leading-relaxed">
                54-year-old male with a 3-month history of progressive morning headache, nausea, and recent onset focal neurological deficits.
              </p>
            </div>

            {/* Differential Diagnostic Considerations */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] text-on-surface-variant uppercase font-semibold tracking-wider">
                Differential Diagnostic Considerations
              </span>
              
              <div className="bg-surface-container-lowest border border-outline-variant rounded p-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-mono text-on-surface">High-Grade Glioma / Glioblastoma</span>
                  <span className="text-primary font-bold">85% Likelihood</span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded p-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-mono text-on-surface">Brain Metastasis (Solitary)</span>
                  <span className="text-tertiary font-bold">42% Likelihood</span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                  <div className="bg-tertiary h-1.5 rounded-full" style={{ width: '42%' }}></div>
                </div>
              </div>
            </div>

            {/* Red Flag Alert */}
            <div className="bg-[#3b1111]/40 border border-error/40 rounded p-3 flex gap-2.5 items-start">
              <AlertTriangle className="h-4 w-4 text-error flex-shrink-0 mt-0.5" />
              <p className="text-xs text-on-error-container leading-normal">
                <strong className="font-bold text-error">Red Flag:</strong> Elevated intracranial pressure symptoms detected.
              </p>
            </div>

            {/* Suggested Next Investigation */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-on-surface-variant uppercase font-semibold tracking-wider">
                Suggested Next Investigation
              </span>
              <p className="text-xs text-primary font-mono bg-surface-container-lowest p-3 rounded border border-outline-variant">
                Contrast MRI (T1+C, T2/FLAIR) + MR Spectroscopy
              </p>
            </div>

            {/* Status Bar */}
            <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-mono pt-3 border-t border-outline-variant">
              <div className="flex items-center gap-2">
                <span>Status:</span>
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                <span className="text-tertiary font-semibold">GPU Worker Active</span>
              </div>
              <span>U-Net: unet_v1.2.0</span>
            </div>
          </div>
        </section>

        {/* 3. OPERATIONAL WORKFLOW SECTION */}
        <section id="how-it-works" className="flex flex-col items-center gap-10 pt-6">
          <div className="text-center flex flex-col gap-2">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">
              Structured Clinical Workflow
            </span>
            <h2 className="text-3xl font-headline font-bold text-on-surface">How CDSS Operates</h2>
            <p className="text-on-surface-variant text-sm max-w-xl">
              A simple, 3-step decision support workflow designed to integrate seamlessly into clinical practice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {/* Step 1 */}
            <div className="bg-surface-container border border-outline-variant rounded-lg p-6 flex flex-col gap-4">
              <div className="text-4xl font-headline font-bold text-outline">01</div>
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-on-surface">Enter Clinical Case</h3>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Physician provides the relevant clinical presentation, symptoms, medical history, and available diagnostic findings into the system.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-surface-container border border-outline-variant rounded-lg p-6 flex flex-col gap-4">
              <div className="text-4xl font-headline font-bold text-primary/50">02</div>
              <div className="flex items-center gap-2.5">
                <Cpu className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-on-surface">AI-Assisted Analysis</h3>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                The system analyzes the provided information using Groq LLM reasoning and optional PyTorch U-Net image findings to generate structured clinical decision support.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-surface-container border border-outline-variant rounded-lg p-6 flex flex-col gap-4">
              <div className="text-4xl font-headline font-bold text-tertiary/50">03</div>
              <div className="flex items-center gap-2.5">
                <Stethoscope className="h-5 w-5 text-tertiary" />
                <h3 className="text-lg font-bold text-on-surface">Review & Decide</h3>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                The physician reviews differential considerations, urgent red flags, missing clinical information, and suggested next diagnostic investigations.
              </p>
            </div>
          </div>
        </section>

        {/* 4. KEY CAPABILITIES GRID */}
        <section id="capabilities" className="flex flex-col items-center gap-10 pt-6">
          <div className="text-center flex flex-col gap-2">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">
              Core Diagnostic Features
            </span>
            <h2 className="text-3xl font-headline font-bold text-on-surface">Key Capabilities</h2>
            <p className="text-on-surface-variant text-sm max-w-xl">
              Purpose-built capabilities designed to support clinical reasoning and organize complex medical cases.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {/* Capability 1 */}
            <div className="bg-surface-container border border-outline-variant rounded-lg p-6 hover:bg-surface-container-high transition-colors">
              <div className="bg-surface-container-low border border-outline-variant w-10 h-10 rounded flex items-center justify-center mb-4">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-bold mb-2 text-on-surface">Clinical Case Synthesis</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Converts complex clinical presentations into a concise, structured summary highlighting pertinent positive and negative findings.
              </p>
            </div>

            {/* Capability 2 */}
            <div className="bg-surface-container border border-outline-variant rounded-lg p-6 hover:bg-surface-container-high transition-colors">
              <div className="bg-surface-container-low border border-outline-variant w-10 h-10 rounded flex items-center justify-center mb-4">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-bold mb-2 text-on-surface">Differential Diagnosis</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Provides qualitative differential diagnostic considerations with supporting evidence, contradicting factors, and likelihood indicators.
              </p>
            </div>

            {/* Capability 3 */}
            <div className="bg-surface-container border border-outline-variant rounded-lg p-6 hover:bg-surface-container-high transition-colors">
              <div className="bg-surface-container-low border border-outline-variant w-10 h-10 rounded flex items-center justify-center mb-4">
                <AlertTriangle className="h-5 w-5 text-error" />
              </div>
              <h3 className="text-base font-bold mb-2 text-on-surface">Urgent Red Flags</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Highlights potentially serious conditions, life-threatening diagnoses, and clinical findings requiring immediate physician attention.
              </p>
            </div>

            {/* Capability 4 */}
            <div className="bg-surface-container border border-outline-variant rounded-lg p-6 hover:bg-surface-container-high transition-colors">
              <div className="bg-surface-container-low border border-outline-variant w-10 h-10 rounded flex items-center justify-center mb-4">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-bold mb-2 text-on-surface">Missing Clinical Information</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Identifies important clinical history, physical examination findings, or baseline laboratory tests that may be missing from the workup.
              </p>
            </div>

            {/* Capability 5 */}
            <div className="bg-surface-container border border-outline-variant rounded-lg p-6 hover:bg-surface-container-high transition-colors">
              <div className="bg-surface-container-low border border-outline-variant w-10 h-10 rounded flex items-center justify-center mb-4">
                <Stethoscope className="h-5 w-5 text-tertiary" />
              </div>
              <h3 className="text-base font-bold mb-2 text-on-surface">Diagnostic Investigations</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Suggests relevant next diagnostic investigations, imaging modalities, and confirmatory tests for physician review and order.
              </p>
            </div>

            {/* Capability 6 */}
            <div className="bg-surface-container border border-outline-variant rounded-lg p-6 hover:bg-surface-container-high transition-colors">
              <div className="bg-surface-container-low border border-outline-variant w-10 h-10 rounded flex items-center justify-center mb-4">
                <Cpu className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-bold mb-2 text-on-surface">MRI-Assisted Analysis</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Integrates image-derived PyTorch U-Net segmentation metrics when available, while strictly separating quantitative measurement from final diagnosis.
              </p>
            </div>
          </div>
        </section>

        {/* 5. TECHNICAL PIPELINE SECTION */}
        <section className="bg-surface-container border border-outline-variant rounded-xl p-8 sm:p-10 flex flex-col items-center text-center gap-8 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 0%, #a78bfa 0%, transparent 70%)',
            }}
          ></div>

          <div className="flex flex-col items-center gap-3 relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant rounded-full px-3 py-1">
              <MemoryStick className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-mono text-primary">PyTorch U-Net GPU Pipeline</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-on-surface">
              Optional MRI Workflow
            </h2>
            <p className="text-sm text-on-surface-variant max-w-xl leading-relaxed">
              Quantitative segmentation features are extracted and passed as objective evidence to the reasoning engine.
            </p>
          </div>

          {/* Pipeline Flow Visualizer */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full max-w-4xl relative z-10">
            <div className="bg-surface-container-lowest border border-outline-variant rounded py-3 px-6 w-full md:w-auto text-sm font-mono text-on-surface">
              Clinical Case
            </div>
            <ChevronRight className="h-5 w-5 text-outline hidden md:block" />
            <ChevronRight className="h-5 w-5 text-outline md:hidden rotate-90" />
            <div className="bg-primary/10 border border-primary/30 rounded py-3 px-6 w-full md:w-auto text-sm font-mono text-primary shadow-[0_0_15px_rgba(167,139,250,0.1)]">
              MRI Analysis (U-Net)
            </div>
            <ChevronRight className="h-5 w-5 text-outline hidden md:block" />
            <ChevronRight className="h-5 w-5 text-outline md:hidden rotate-90" />
            <div className="bg-surface-container-lowest border border-outline-variant rounded py-3 px-6 w-full md:w-auto text-sm font-mono text-on-surface">
              Quantitative Findings
            </div>
          </div>

          <div className="mt-2 border border-outline-variant bg-surface-container-lowest/70 rounded p-4 max-w-2xl text-center relative z-10">
            <p className="text-[10px] font-bold tracking-widest uppercase text-primary mb-1">
              Strict Safety Separation
            </p>
            <p className="text-xs text-on-surface-variant italic leading-relaxed">
              "Image segmentation provides quantitative and spatial information (<code className="text-primary font-mono">area_percent</code>, <code className="text-primary font-mono">visual_width_span_percent</code>). It does not determine tumor type, grade, or definitive diagnosis."
            </p>
          </div>
        </section>

        {/* 6. SAFETY & GOVERNANCE SECTION */}
        <section id="safety" className="bg-surface-container-low border border-outline-variant rounded-xl p-8 sm:p-10 flex flex-col items-center gap-8">
          <div className="text-center flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-1.5 bg-surface-container border border-outline-variant rounded-full px-3 py-1">
              <Gavel className="h-3.5 w-3.5 text-tertiary" />
              <span className="text-[10px] font-bold text-tertiary uppercase tracking-wide">
                Governance & Medical Ethics
              </span>
            </div>
            <h2 className="text-3xl font-headline font-bold text-on-surface">
              Decision Support. Not Clinical Authority.
            </h2>
            <p className="text-sm text-on-surface-variant max-w-2xl leading-relaxed">
              CDSS provides AI-generated clinical decision support for licensed healthcare professionals. Outputs should be independently reviewed and clinically correlated before being used in patient care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="bg-surface-container-lowest border border-outline-variant rounded p-5 space-y-2">
              <h4 className="text-sm font-bold text-primary">1. No Definitive Diagnosis</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                The system generates structured differential considerations and likelihood indicators, not binding medical conclusions.
              </p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded p-5 space-y-2">
              <h4 className="text-sm font-bold text-primary">2. No Replacement for Judgment</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Designed purely to assist physician reasoning. Clinical judgment and final decision-making belong solely to the attending doctor.
              </p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded p-5 space-y-2">
              <h4 className="text-sm font-bold text-primary">3. Clinical Correlation Required</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                All AI considerations must be interpreted alongside full patient examination, laboratory findings, and diagnostic workups.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

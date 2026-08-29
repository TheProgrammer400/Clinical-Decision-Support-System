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
  Lock,
  Layers,
  Sparkles,
  Stethoscope,
  ChevronRight,
} from 'lucide-react';

export default function HomePage() {
  const handleScroll = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-sky-500 selection:text-white flex flex-col font-sans">
      {/* 1. NAVBAR */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-500/10 rounded-xl border border-sky-500/20">
              <Activity className="h-5 w-5 text-sky-400" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-slate-100 tracking-tight">CDSS</span>
              <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 bg-slate-900 rounded-full border border-slate-800">
                Groq v1.4
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-xs font-medium text-slate-400">
            <a href="#overview" onClick={handleScroll('overview')} className="hover:text-slate-200 transition-colors">
              Overview
            </a>
            <a href="#capabilities" onClick={handleScroll('capabilities')} className="hover:text-slate-200 transition-colors">
              Capabilities
            </a>
            <a href="#how-it-works" onClick={handleScroll('how-it-works')} className="hover:text-slate-200 transition-colors">
              How It Works
            </a>
            <a href="#safety" onClick={handleScroll('safety')} className="hover:text-slate-200 transition-colors">
              Safety
            </a>
          </nav>

          <div>
            <Link
              href="/login"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-sky-600/20"
            >
              <span>Sign In</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full space-y-24 py-12">
        {/* 2. HERO SECTION */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-sky-500/10 border border-sky-500/20 rounded-full text-xs font-medium text-sky-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI-Assisted Clinical Decision Support</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-100 tracking-tight leading-[1.15]">
                Clinical Decision Support, <br />
                <span className="bg-gradient-to-r from-sky-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                  Built for Better Decisions.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl">
                An AI-assisted clinical decision support system that helps physicians analyze clinical presentations, explore differential diagnoses, identify urgent concerns, and determine appropriate next diagnostic investigations.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center space-x-2 px-6 py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-sky-600/25 group"
                >
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <a
                  href="#capabilities"
                  onClick={handleScroll('capabilities')}
                  className="inline-flex items-center justify-center space-x-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-sm rounded-xl border border-slate-800 transition-all cursor-pointer"
                >
                  <span>Explore Capabilities</span>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </a>
              </div>

              {/* Disclaimer Badge */}
              <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 flex items-start space-x-2.5 max-w-xl">
                <ShieldCheck className="h-4 w-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Non-Diagnostic Disclaimer:</strong> AI-generated decision support — not a definitive diagnosis. Clinical judgment remains with the licensed healthcare professional.
                </span>
              </div>
            </div>

            {/* Hero Right Visual Representation */}
            <div className="lg:col-span-5">
              <div className="glass-panel p-5 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-sky-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      CDSS Interface Preview
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/30">
                    Groq LLM v1.4
                  </span>
                </div>

                {/* Case Summary Preview */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Case Presentation</div>
                  <p className="text-xs text-slate-300 line-clamp-2">
                    54-year-old male with a 3-month history of progressive morning headache, nausea, and recent onset focal neurological deficits.
                  </p>
                </div>

                {/* Differential Considerations Bar Chart */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Differential Diagnostic Considerations</div>
                  
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800/60 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-200 font-semibold">High-Grade Glioma / Glioblastoma</span>
                        <span className="text-sky-400 font-bold">85% Likelihood</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-sky-500 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>

                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800/60 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-300">Brain Metastasis (Solitary)</span>
                        <span className="text-amber-400 font-bold">42% Likelihood</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: '42%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Urgent Red Flag Alert */}
                <div className="p-2.5 bg-red-950/20 border border-red-500/30 rounded-xl flex items-center space-x-2 text-xs text-red-300">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-400" />
                  <span className="text-[11px]">
                    <strong>Red Flag:</strong> Elevated intracranial pressure symptoms detected.
                  </span>
                </div>

                {/* Recommended Investigation */}
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/60 text-xs space-y-1 font-mono">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Suggested Next Investigation</div>
                  <div className="text-purple-300 text-[11px]">Contrast MRI (T1+C, T2/FLAIR) + MR Spectroscopy</div>
                </div>

                {/* Model Status */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                  <span>Status: <span className="text-emerald-400">● GPU Worker Active</span></span>
                  <span>U-Net: <span className="text-slate-300">unet_v1.2.0</span></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. HOW IT WORKS */}
        <section id="how-it-works" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-sky-400">Structured Clinical Workflow</h2>
            <h3 className="text-3xl font-extrabold text-slate-100 tracking-tight">How CDSS Operates</h3>
            <p className="text-sm text-slate-400">
              A simple, 3-step decision support workflow designed to integrate seamlessly into clinical practice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4 relative">
              <div className="text-3xl font-extrabold font-mono text-sky-500/40">01</div>
              <h4 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <FileText className="h-5 w-5 text-sky-400" />
                <span>Enter Clinical Case</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Physician provides the relevant clinical presentation, symptoms, medical history, and available diagnostic findings into the system.
              </p>
            </div>

            {/* Step 2 */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4 relative">
              <div className="text-3xl font-extrabold font-mono text-purple-500/40">02</div>
              <h4 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <Cpu className="h-5 w-5 text-purple-400" />
                <span>AI-Assisted Analysis</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                The system analyzes the provided information using Groq LLM reasoning and optional PyTorch U-Net image findings to generate structured clinical decision support.
              </p>
            </div>

            {/* Step 3 */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4 relative">
              <div className="text-3xl font-extrabold font-mono text-emerald-500/40">03</div>
              <h4 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <Stethoscope className="h-5 w-5 text-emerald-400" />
                <span>Review & Decide</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                The physician reviews differential considerations, urgent red flags, missing clinical information, and suggested next diagnostic investigations.
              </p>
            </div>
          </div>
        </section>

        {/* 4. KEY CAPABILITIES */}
        <section id="capabilities" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-sky-400">Core Diagnostic Features</h2>
            <h3 className="text-3xl font-extrabold text-slate-100 tracking-tight">Key Capabilities</h3>
            <p className="text-sm text-slate-400">
              Purpose-built capabilities designed to support clinical reasoning and organize complex medical cases.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 glass-panel rounded-2xl border border-slate-800/80 bg-slate-900/70 hover:border-sky-500/30 transition-all space-y-3">
              <div className="p-2.5 bg-sky-500/10 rounded-xl border border-sky-500/20 w-fit text-sky-400">
                <FileText className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-slate-100">Clinical Case Synthesis</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Converts complex clinical presentations into a concise, structured summary highlighting pertinent positive and negative findings.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 glass-panel rounded-2xl border border-slate-800/80 bg-slate-900/70 hover:border-sky-500/30 transition-all space-y-3">
              <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 w-fit text-purple-400">
                <Layers className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-slate-100">Differential Diagnosis</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Provides qualitative differential diagnostic considerations with supporting evidence, contradicting factors, and likelihood indicators.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 glass-panel rounded-2xl border border-slate-800/80 bg-slate-900/70 hover:border-sky-500/30 transition-all space-y-3">
              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 w-fit text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-slate-100">Urgent Red Flags</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Highlights potentially serious conditions, life-threatening diagnoses, and clinical findings requiring immediate physician attention.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 glass-panel rounded-2xl border border-slate-800/80 bg-slate-900/70 hover:border-sky-500/30 transition-all space-y-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 w-fit text-indigo-400">
                <Search className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-slate-100">Missing Clinical Information</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Identifies important clinical history, physical examination findings, or baseline laboratory tests that may be missing from the workup.
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-6 glass-panel rounded-2xl border border-slate-800/80 bg-slate-900/70 hover:border-sky-500/30 transition-all space-y-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 w-fit text-emerald-400">
                <Stethoscope className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-slate-100">Diagnostic Investigations</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Suggests relevant next diagnostic investigations, imaging modalities, and confirmatory tests for physician review and order.
              </p>
            </div>

            {/* Card 6 */}
            <div className="p-6 glass-panel rounded-2xl border border-slate-800/80 bg-slate-900/70 hover:border-sky-500/30 transition-all space-y-3">
              <div className="p-2.5 bg-sky-500/10 rounded-xl border border-sky-500/20 w-fit text-sky-400">
                <Cpu className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-slate-100">MRI-Assisted Analysis</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Integrates image-derived PyTorch U-Net segmentation metrics when available, while strictly separating quantitative measurement from final diagnosis.
              </p>
            </div>
          </div>
        </section>

        {/* 5. WHY USE CDSS */}
        <section id="overview" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-sky-950/20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-sky-400">Clinical Value</h2>
                <h3 className="text-3xl font-extrabold text-slate-100 tracking-tight">
                  Designed to Support Clinical Reasoning
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  CDSS is engineered as an auxiliary decision-support tool. It enhances clinical workflow efficiency by standardizing differential evaluations without interfering with physician autonomy.
                </p>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  'Organize complex clinical information',
                  'Reduce overlooked differential considerations',
                  'Highlight urgent clinical concerns',
                  'Identify important missing information',
                  'Structure diagnostic workups',
                  'Provide a consistent decision-support format',
                  'Help physicians review cases efficiently',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 6. AI + MEDICAL IMAGING */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-purple-500/20 bg-purple-950/10 space-y-8">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs font-medium text-purple-300">
                <Cpu className="h-3.5 w-3.5" />
                <span>PyTorch U-Net GPU Pipeline</span>
              </div>
              <h3 className="text-3xl font-extrabold text-slate-100 tracking-tight">Optional MRI Workflow</h3>
              <p className="text-sm text-slate-400">
                Quantitative segmentation features are extracted and passed as objective evidence to the reasoning engine.
              </p>
            </div>

            {/* Workflow Flowchart */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center text-center text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 font-semibold">
                Clinical Case
              </div>
              <div className="text-purple-400 hidden md:block">→</div>
              <div className="p-3 bg-purple-900/30 rounded-xl border border-purple-500/30 text-purple-300 font-semibold">
                MRI Analysis (U-Net)
              </div>
              <div className="text-purple-400 hidden md:block">→</div>
              <div className="p-3 bg-sky-900/30 rounded-xl border border-sky-500/30 text-sky-300 font-semibold">
                Quantitative Findings
              </div>
            </div>

            {/* Wording Banner */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-purple-500/30 text-center max-w-3xl mx-auto space-y-1">
              <div className="text-xs font-bold text-purple-300 uppercase font-mono">Strict Safety Separation</div>
              <p className="text-xs text-slate-300">
                "Image segmentation provides quantitative and spatial information (`area_percent`, `visual_width_span_percent`). It does not determine tumor type, grade, or definitive diagnosis."
              </p>
            </div>
          </div>
        </section>

        {/* 7. CLINICAL SAFETY */}
        <section id="safety" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-sky-500/20 bg-slate-900/60 space-y-8">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-sky-500/10 border border-sky-500/20 rounded-full text-xs font-medium text-sky-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Governance & Medical Ethics</span>
              </div>
              <h3 className="text-3xl font-extrabold text-slate-100 tracking-tight">
                Decision Support. Not Clinical Authority.
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                CDSS provides AI-generated clinical decision support for licensed healthcare professionals. Outputs should be independently reviewed and clinically correlated before being used in patient care.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-sky-400 font-bold text-sm">1. No Definitive Diagnosis</div>
                <p className="text-xs text-slate-400">
                  The system generates structured differential considerations and likelihood indicators, not binding medical conclusions.
                </p>
              </div>

              <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-sky-400 font-bold text-sm">2. No Replacement for Judgment</div>
                <p className="text-xs text-slate-400">
                  Designed purely to assist physician reasoning. Clinical judgment and final decision-making belong solely to the attending doctor.
                </p>
              </div>

              <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-sky-400 font-bold text-sm">3. Clinical Correlation Required</div>
                <p className="text-xs text-slate-400">
                  All AI considerations must be interpreted alongside full patient examination, laboratory findings, and diagnostic workups.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

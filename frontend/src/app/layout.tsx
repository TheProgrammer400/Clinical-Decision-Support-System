import './globals.css';
import React from 'react';
import Providers from './providers';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'CDSS — Clinical Decision Support System',
  description: 'AI-assisted probabilistic differential diagnostic decision support system for clinicians.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-sky-500 selection:text-white">
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
              <div className="max-w-7xl mx-auto px-4">
                Clinical Decision Support System (CDSS) — Powered by Groq LLM Provider.
                <div className="mt-1 text-slate-600">
                  Strictly Decision Support — Requires independent clinical judgment by a licensed healthcare professional.
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}

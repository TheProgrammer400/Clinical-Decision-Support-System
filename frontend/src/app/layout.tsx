import './globals.css';
import React from 'react';
import Providers from './providers';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Obsidian CDSS — Clinical Decision Support System',
  description: 'AI-assisted probabilistic differential diagnostic decision support system for clinicians.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="bg-background text-on-surface antialiased selection:bg-primary selection:text-on-primary font-body min-h-screen flex flex-col">
        <Providers>
          <div className="min-h-screen flex flex-col bg-background text-on-surface">
            <Navbar />
            <main className="flex-1 w-full">
              {children}
            </main>
            <footer className="w-full py-8 px-6 bg-surface-container-lowest border-t border-outline-variant text-center text-xs text-on-surface-variant">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex flex-col text-left">
                  <span className="text-sm font-headline font-bold text-on-surface">Obsidian CDSS</span>
                  <span className="text-[11px] text-on-surface-variant">
                    © 2026 Obsidian Health. For clinical professional use only. Regulatory compliance: HIPAA, GDPR, SaMD Class II.
                  </span>
                </div>
                <div className="text-[11px] text-on-surface-variant text-right">
                  Decision Support System — Powered by Groq LLM & PyTorch U-Net.
                  <div className="text-secondary font-medium">
                    Strictly Decision Support — Non-Diagnostic Disclaimer.
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}


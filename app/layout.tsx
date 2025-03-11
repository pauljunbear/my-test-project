import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
// Import our UI patch to fix styleSingleton issues
import '@/lib/ui-patch';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: "Halftone & Duotone Editor",
  description: "A tool for creating halftone and duotone effects on images",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} font-sans antialiased h-full bg-gray-50 dark:bg-gray-950`}>
        <div className="h-full w-full flex flex-col">
          {/* Header - Simplified to be more compact */}
          <header className="border-b bg-white dark:bg-gray-900 px-6 py-2 flex items-center justify-between sticky top-0 z-10 shadow-sm">
            <div className="flex items-center space-x-2">
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="text-primary"
              >
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Halftone & Duotone</h1>
              </div>
            </div>
            
            <nav className="flex items-center space-x-4">
              <a 
                href="/shader-studio" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Shader Studio
              </a>
              <a 
                href="https://github.com/pauljunbear/my-test-project" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                GitHub
              </a>
              <a 
                href="#" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Help
              </a>
            </nav>
          </header>
          
          {/* Main content - Takes full remaining height */}
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
          
          {/* Footer - Removed for more space */}
        </div>
      </body>
    </html>
  );
}

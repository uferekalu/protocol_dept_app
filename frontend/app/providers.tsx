'use client';

import { Provider } from 'react-redux';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { store } from '@/lib/redux/store';
import { AppHeader } from '@/components/app-header';

// Central place to wrap the app in client-side providers: theming, Redux store,
// toast notifications, and anything else added later.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Provider store={store}>
        <AppHeader />
        {children}
        <Toaster richColors position="top-right" />
      </Provider>
    </ThemeProvider>
  );
}

'use client';

import { Provider } from 'react-redux';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { store } from '@/lib/redux/store';
import { AppHeader } from '@/components/app-header';
import { AppNav } from '@/components/app-nav';
import { MobileNavDrawer } from '@/components/mobile-nav-drawer';
import { AuthGuard } from '@/components/auth-guard';

// Central place to wrap the app in client-side providers: theming, Redux store,
// toast notifications, and anything else added later.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Provider store={store}>
        <AuthGuard>
          <AppHeader />
          <AppNav />
          <MobileNavDrawer />
          {/* Reserves exactly the collapsed MobileNavDrawer's width below `sm`, so it
              always sits side-by-side with content, never covering it. Expanding the
              drawer overlays on top instead of growing this — the reserved width is
              fixed regardless of the drawer's own state. */}
          <div className="pl-14 sm:pl-0">{children}</div>
        </AuthGuard>
        <Toaster richColors position="top-right" />
      </Provider>
    </ThemeProvider>
  );
}

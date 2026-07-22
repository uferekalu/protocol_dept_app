'use client';

import { Provider } from 'react-redux';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { store } from '@/lib/redux/store';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
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
          <ContentGutter>{children}</ContentGutter>
        </AuthGuard>
        <Toaster richColors position="top-right" />
      </Provider>
    </ThemeProvider>
  );
}

// Reserves exactly the collapsed MobileNavDrawer's width below `sm`, so it always sits
// side-by-side with content, never covering it — but only while there's a confirmed
// session (same signal MobileNavDrawer itself uses to decide whether to render at
// all): reserving space for a drawer that isn't there would leave a pointless blank
// gutter on /login, /signup, etc.
function ContentGutter({ children }: { children: React.ReactNode }) {
  const { data: currentUser } = useCurrentUser();
  return <div className={currentUser ? 'pl-14 sm:pl-0' : undefined}>{children}</div>;
}

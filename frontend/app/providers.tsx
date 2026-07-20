'use client';

import { Provider } from 'react-redux';
import { Toaster } from 'sonner';
import { store } from '@/lib/redux/store';

// Central place to wrap the app in client-side providers: Redux store, toast
// notifications, and anything else added later (theme provider, etc.).
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      {children}
      <Toaster richColors position="top-right" />
    </Provider>
  );
}

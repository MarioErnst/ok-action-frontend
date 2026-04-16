// src/App.tsx

import { lazy, Suspense } from 'react';

const PhonationTestPage = lazy(() => import('./features/phonation/test/PhonationTestPage'));

export default function App() {
  if (import.meta.env.DEV) {
    return (
      <Suspense fallback={null}>
        <PhonationTestPage />
      </Suspense>
    );
  }

  return <main />;
}

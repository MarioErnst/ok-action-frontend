import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './features/auth';

const AuthPage = lazy(() => import('./features/auth/presentation/pages/AuthPage').then(m => ({ default: m.AuthPage })));
const PhonationTestPage = lazy(() => import('./features/phonation/test/PhonationTestPage'));
const EvaluationPage = lazy(() => import('./features/phonation/pages/EvaluationPage'));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user ? <Navigate to="/evaluation" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<GuestRoute><AuthPage /></GuestRoute>} />
        <Route path="/phonation" element={<PrivateRoute><PhonationTestPage /></PrivateRoute>} />
        <Route path="/evaluation" element={<PrivateRoute><EvaluationPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

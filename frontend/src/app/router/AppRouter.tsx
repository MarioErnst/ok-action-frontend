import { Route, Routes } from 'react-router-dom';
import { AuthPage } from '../../features/auth/presentation/pages/AuthPage';
import { AccentuationPage } from '../../features/accentuation';

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/accentuation" element={<AccentuationPage />} />
      <Route path="*" element={<AuthPage />} />
    </Routes>
  );
};

import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthPage } from '../../features/auth/presentation/pages/AuthPage'
import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '../../shared/ui/templates/AppLayout'
import { DashboardPage } from '../../features/dashboard/pages/DashboardPage'
import EvaluationPage from '../../features/phonation/pages/EvaluationPage'
import PronunciationPage from '../../features/pronunciation/pages/PronunciationPage'
import AccentuationPage from '../../features/accentuation/pages/AccentuationPage'
import LoudnessCoachPage from '../../features/loudness/pages/LoudnessCoachPage'
import MuletillasPage from '../../features/muletillas/presentation/pages/MuletillasPage'
import { PrecisionPage } from '../../features/precision/presentation/pages/PrecisionPage'
import LiveSessionPage from '../../features/live-session/presentation/pages/LiveSessionPage'
import { FacialExpressionPage } from '../../features/facial-expression'

export const AppRouter = () => (
  <Routes>
    <Route path="/auth" element={<AuthPage />} />

    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/fonacion" element={<EvaluationPage />} />
        <Route path="/pronunciacion" element={<PronunciationPage />} />
        <Route path="/acentuacion" element={<AccentuationPage />} />
        <Route path="/volumen" element={<LoudnessCoachPage />} />
        <Route path="/muletillas" element={<MuletillasPage />} />
        <Route path="/precision" element={<PrecisionPage />} />
        <Route path="/sesion-libre" element={<LiveSessionPage />} />
        <Route path="/expresion-facial" element={<FacialExpressionPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Route>
  </Routes>
)

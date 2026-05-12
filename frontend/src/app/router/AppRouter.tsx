import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthPage } from '../../features/auth/presentation/pages/AuthPage'
import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '../../shared/ui/templates/AppLayout'
import { DashboardPage } from '../../features/dashboard/presentation/pages/DashboardPage'
import { ExercisesPage } from '../../features/exercises/presentation/pages/ExercisesPage'
import { CapsulesPage } from '../../features/capsules/presentation/pages/CapsulesPage'
import EvaluationPage from '../../features/phonation/presentation/pages/EvaluationPage'
import PronunciationPage from '../../features/pronunciation/presentation/pages/PronunciationPage'
import AccentuationPage from '../../features/accentuation/presentation/pages/AccentuationPage'
import LoudnessCoachPage from '../../features/loudness/presentation/pages/LoudnessCoachPage'
import MuletillasPage from '../../features/muletillas/presentation/pages/MuletillasPage'
import { PrecisionPage } from '../../features/precision/presentation/pages/PrecisionPage'
import LiveSessionPage from '../../features/live-session/presentation/pages/LiveSessionPage'
import { FacialExpressionPage } from '../../features/facial-expression'
import { BodyExpressionPage } from '../../features/body-expression'
import { LinguisticVersatilityPage } from '../../features/linguistic-versatility/presentation/pages/LinguisticVersatilityPage'
import { PauseEvaluationPage } from '../../features/pauses'
import { FluencyPage } from '../../features/fluency'
import { ConsistencyPage } from '../../features/consistency'
import { ProfilePage } from '../../features/profile/presentation/pages/ProfilePage'

export const AppRouter = () => (
  <Routes>
    <Route path="/auth" element={<AuthPage />} />

    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/ejercicios" element={<ExercisesPage />} />
        <Route path="/capsulas" element={<CapsulesPage />} />
        <Route path="/fonacion" element={<EvaluationPage />} />
        <Route path="/pronunciacion" element={<PronunciationPage />} />
        <Route path="/acentuacion" element={<AccentuationPage />} />
        <Route path="/volumen" element={<LoudnessCoachPage />} />
        <Route path="/pausas" element={<PauseEvaluationPage />} />
        <Route path="/muletillas" element={<MuletillasPage />} />
        <Route path="/precision" element={<PrecisionPage />} />
        <Route path="/sesion-libre" element={<LiveSessionPage />} />
        <Route path="/expresion-facial" element={<FacialExpressionPage />} />
        <Route path="/expresion-corporal" element={<BodyExpressionPage />} />
        <Route path="/versatilidad-linguistica" element={<LinguisticVersatilityPage />} />
        <Route path="/fluidez" element={<FluencyPage />} />
        <Route path="/consistencia" element={<ConsistencyPage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Route>
  </Routes>
)

import { Route, Routes } from 'react-router-dom'
import { DashboardPage } from './pages/DashboardPage'
import { KakaoCallbackPage } from './pages/KakaoCallbackPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/kakao/callback" element={<KakaoCallbackPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
    </Routes>
  )
}

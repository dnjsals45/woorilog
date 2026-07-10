import { Route, Routes } from 'react-router-dom'
import { DashboardPage } from './pages/DashboardPage'
import { KakaoCallbackPage } from './pages/KakaoCallbackPage'
import { LedgerPage } from './pages/LedgerPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { TransactionEditPage } from './pages/TransactionEditPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/kakao/callback" element={<KakaoCallbackPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/calendar" element={<LedgerPage />} />
      <Route path="/transactions/:transactionId" element={<TransactionEditPage />} />
    </Routes>
  )
}

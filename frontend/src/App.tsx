import { Route, Routes } from 'react-router-dom'
import { BudgetMonthPage } from './pages/BudgetMonthPage'
import { DashboardPage } from './pages/DashboardPage'
import { InvitationLinkPage } from './pages/InvitationLinkPage'
import { KakaoCallbackPage } from './pages/KakaoCallbackPage'
import { LedgerPage } from './pages/LedgerPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { TransactionEditPage } from './pages/TransactionEditPage'
import { StatisticsPage } from './pages/StatisticsPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/kakao/callback" element={<KakaoCallbackPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/calendar" element={<LedgerPage />} />
      <Route path="/transactions/:transactionId" element={<TransactionEditPage />} />
      <Route path="/stats" element={<StatisticsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route
        path="/ledgers/:ledgerId/months/:budgetMonth"
        element={<BudgetMonthPage />}
      />
      <Route path="/invitations/links/:token" element={<InvitationLinkPage />} />
    </Routes>
  )
}

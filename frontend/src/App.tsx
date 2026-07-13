import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { BudgetMonthPage } from './pages/BudgetMonthPage'
import { DashboardPage } from './pages/DashboardPage'
import { InvitationLinkPage } from './pages/InvitationLinkPage'
import { KakaoCallbackPage } from './pages/KakaoCallbackPage'
import { LedgerPage } from './pages/LedgerPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { TransactionEditPage } from './pages/TransactionEditPage'
import { TransactionImportPage } from './pages/TransactionImportPage'
import { StatisticsPage } from './pages/StatisticsPage'
import { SettingsPage } from './pages/SettingsPage'
import { HelpPage } from './pages/HelpPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { CategoryManagementPage } from './pages/CategoryManagementPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/kakao/callback" element={<KakaoCallbackPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/calendar" element={<LedgerPage />} />
          <Route path="/transactions/:transactionId" element={<TransactionEditPage />} />
          <Route path="/stats" element={<StatisticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/categories" element={<CategoryManagementPage />} />
          <Route path="/imports" element={<TransactionImportPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/ledgers/:ledgerId/months/:budgetMonth" element={<BudgetMonthPage />} />
          <Route path="/invitations/links/:token" element={<InvitationLinkPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

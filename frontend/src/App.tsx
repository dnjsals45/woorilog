import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { ProfileGate } from './components/layout/ProfileGate'
import { DashboardPage } from './pages/DashboardPage'
import { InvitationLinkPage } from './pages/InvitationLinkPage'
import { KakaoCallbackPage } from './pages/KakaoCallbackPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { TransactionEditPage } from './pages/TransactionEditPage'
import { UserSettingsPage } from './pages/UserSettingsPage'
import { RecurringTransactionPage } from './pages/RecurringTransactionPage'
import { HelpPage } from './pages/HelpPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { CategoryManagementPage } from './pages/CategoryManagementPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { BudgetPage } from './pages/BudgetPage'
import { AnalysisPage } from './pages/AnalysisPage'
import { TransactionImportPage } from './pages/TransactionImportPage'
import { LedgerSettingsRoute, OnboardingRoute, SharedLedgerCreateRoute } from './pages/V1RouteBindings'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/kakao/callback" element={<KakaoCallbackPage />} />
      <Route path="/invitations/:token" element={<InvitationLinkPage />} />
      <Route path="/invitations/links/:token" element={<InvitationLinkPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<OnboardingRoute />} />
        <Route element={<ProfileGate />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/transactions/import" element={<TransactionImportPage />} />
            <Route path="/transactions/uncategorized" element={<TransactionsPage />} />
            <Route path="/transactions/:transactionId" element={<TransactionEditPage />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/settings" element={<UserSettingsPage />} />
            <Route path="/ledgers/new" element={<SharedLedgerCreateRoute />} />
            <Route path="/ledgers/:ledgerId/settings" element={<LedgerSettingsRoute />} />
            <Route path="/recurring" element={<RecurringTransactionPage />} />
            <Route path="/categories" element={<CategoryManagementPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

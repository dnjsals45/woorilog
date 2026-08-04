import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { ProfileGate } from './components/layout/ProfileGate'
import { DashboardPage } from './pages/DashboardPage'
import { InvitationLinkPage } from './pages/InvitationLinkPage'
import { KakaoCallbackPage } from './pages/KakaoCallbackPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { UserSettingsPage } from './pages/UserSettingsPage'
import { RecurringTransactionPage } from './pages/RecurringTransactionPage'
import { HelpPage } from './pages/HelpPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { BudgetPage } from './pages/BudgetPage'
import { AnalysisPage } from './pages/AnalysisPage'
import { PeriodSummaryPage } from './pages/PeriodSummaryPage'
import { OnboardingRoute, SharedLedgerCreateRoute } from './pages/V1RouteBindings'

/* 라우트는 확정된 디자인 14화면을 기준으로 한다.
 * 디자인에서 오버레이가 된 화면은 라우트를 갖지 않는다 — 거래 추가(우측 드로어),
 * 알림함(대시보드 헤더 팝오버), 이미지 업로드(중앙 모달), 거래 상세(거래 내역 내 모달).
 * 사라진 화면의 기존 링크는 404 대신 대체 화면으로 흘려보낸다. */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      {/* 디자인상 로그인은 랜딩 위 모달이다. 이 라우트는 초대 확인의 "로그인하고 확인하기",
          AuthReturnRedirect, 개발자 로그인 진입점으로 남는다. */}
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
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/recurring" element={<RecurringTransactionPage />} />
            <Route path="/periods/:startDate/summary" element={<PeriodSummaryPage />} />
            <Route path="/settings" element={<UserSettingsPage />} />
            <Route path="/ledgers/new" element={<SharedLedgerCreateRoute />} />
            <Route path="/help" element={<HelpPage />} />

            {/* 아래는 디자인에서 독립 화면이 사라진 경로들이다. */}
            {/* 이미지 업로드는 중앙 모달(TransactionImportModal)로, 거래 상세는 거래 내역 내 모달로 바뀌었다. */}
            <Route path="/transactions/import" element={<Navigate replace to="/transactions" />} />
            <Route path="/transactions/uncategorized" element={<Navigate replace to="/transactions" />} />
            <Route path="/transactions/:transactionId" element={<Navigate replace to="/transactions" />} />
            {/* 가계부 설정과 카테고리 관리는 설정 화면의 탭으로 흡수됐다. */}
            <Route path="/ledgers/:ledgerId/settings" element={<Navigate replace to="/settings" />} />
            <Route path="/categories" element={<Navigate replace to="/settings" />} />
            {/* 알림함은 대시보드 헤더 종 아이콘이 여는 팝오버(NotificationInbox)다. */}
            <Route path="/notifications" element={<Navigate replace to="/dashboard" />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

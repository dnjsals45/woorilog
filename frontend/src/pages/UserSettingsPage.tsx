import { useState, type FormEvent } from 'react'
import { Bell, UserRound } from 'lucide-react'
import { useMeQuery, useUpdateProfileMutation } from '../features/auth/model/authQueries'
import { useNotificationPreferencesQuery, useUpdateNotificationPreferencesMutation } from '../features/notification/model/notificationQueries'
import { ErrorState, PageHeader, SurfaceCard } from '../shared/ui/DesignPrimitives'

export function UserSettingsPage() {
  const me = useMeQuery()
  const profile = useUpdateProfileMutation()
  const preferences = useNotificationPreferencesQuery()
  const updatePreferences = useUpdateNotificationPreferencesMutation()
  return <main className="product-page product-page--standard"><PageHeader eyebrow="SETTINGS" title="설정" description="내 프로필과 알림 방식을 관리합니다." />
    {me.isError || preferences.isError ? <div className="mt-6"><ErrorState description="설정을 다시 불러와주세요." /></div> : null}
    <section className="mt-6 grid gap-5 lg:grid-cols-2">{me.data ? <ProfileSettingsForm initialNickname={me.data.user.nickname} initialTimezone={me.data.user.timezone} isError={profile.isError} isPending={profile.isPending} onSubmit={(nickname, timezone) => profile.mutate({ nickname, timezone })}/> : <SurfaceCard><p className="text-sm text-[var(--wl-color-text-secondary)]">프로필을 불러오는 중입니다.</p></SurfaceCard>}
      <SurfaceCard><div className="flex items-center gap-2"><Bell aria-hidden="true" size={20}/><h2 className="text-lg font-bold">알림</h2></div><div className="mt-5 divide-y divide-[var(--wl-color-border)]">{([['budgetWarning80Enabled','예산 80% 알림'],['weeklyGuideEnabled','일요일 주간 가이드']] as const).map(([key,label]) => <label className="flex min-h-16 items-center justify-between gap-4" key={key}><span className="text-sm font-bold">{label}</span><input checked={preferences.data?.[key] ?? true} disabled={!preferences.data || updatePreferences.isPending} onChange={(event) => preferences.data && updatePreferences.mutate({ ...preferences.data, [key]: event.target.checked })} type="checkbox"/></label>)}</div><p className="mt-4 text-xs leading-5 text-[var(--wl-color-text-secondary)]">예산 소진·초과와 공동 예산 변경 알림은 안전한 예산 운영을 위해 항상 표시합니다.</p></SurfaceCard></section>
  </main>
}

function ProfileSettingsForm({ initialNickname, initialTimezone, isError, isPending, onSubmit }: { initialNickname: string; initialTimezone: string; isError: boolean; isPending: boolean; onSubmit: (nickname: string, timezone: string) => void }) {
  const [nickname, setNickname] = useState(initialNickname)
  const [timezone, setTimezone] = useState(initialTimezone)
  function submitProfile(event: FormEvent) { event.preventDefault(); onSubmit(nickname.trim(), timezone) }
  return <SurfaceCard><div className="flex items-center gap-2"><UserRound aria-hidden="true" size={20}/><h2 className="text-lg font-bold">프로필</h2></div><form className="mt-5 space-y-4" onSubmit={submitProfile}><label className="block text-sm font-bold" htmlFor="settings-nickname">닉네임<input className="mt-2 h-12 w-full px-4" id="settings-nickname" maxLength={20} onChange={(event) => setNickname(event.target.value)} required value={nickname}/></label><label className="block text-sm font-bold" htmlFor="settings-timezone">시간대<select className="mt-2 h-12 w-full px-4" id="settings-timezone" onChange={(event) => setTimezone(event.target.value)} value={timezone}><option value="Asia/Seoul">Asia/Seoul</option><option value="Asia/Tokyo">Asia/Tokyo</option><option value="America/New_York">America/New_York</option><option value="Europe/London">Europe/London</option></select></label>{isError ? <p className="text-sm text-[var(--wl-color-danger)]" role="alert">프로필을 저장하지 못했습니다.</p> : null}<button className="min-h-11 rounded-xl bg-[var(--wl-color-primary)] px-4 text-sm font-bold text-white disabled:bg-slate-300" disabled={isPending || !nickname.trim()} type="submit">{isPending ? '저장 중...' : '프로필 저장'}</button></form></SurfaceCard>
}

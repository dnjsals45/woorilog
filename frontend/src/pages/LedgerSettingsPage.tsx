import { Copy, Crown, Link2, LockKeyhole, UserMinus, UsersRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { EmptyState, ErrorState, PageHeader, SurfaceCard } from '../shared/ui/DesignPrimitives'

export type LedgerSettingsMember = { id: number; nickname: string; role: 'OWNER' | 'MEMBER'; accessState?: 'ACTIVE' | 'FORMER_READ_ONLY' }
export type LedgerSettingsPageProps = {
  ledger?: { id: number; name: string; role: 'OWNER' | 'MEMBER'; accessState?: 'ACTIVE' | 'FORMER_READ_ONLY' }
  members?: LedgerSettingsMember[]
  invitationUrl?: string | null
  isLoading?: boolean
  error?: string | null
  onRename?: (name: string) => Promise<void> | void
  onCreateInvitation?: () => Promise<void> | void
  onCopyInvitation?: (url: string) => void
  onRemoveMember?: (memberId: number) => Promise<void> | void
  onTransferOwnership?: (memberId: number) => Promise<void> | void
  onLeave?: () => Promise<void> | void
}

export function LedgerSettingsPage({ ledger, members, invitationUrl, isLoading = false, error, onRename, onCreateInvitation, onCopyInvitation, onRemoveMember, onTransferOwnership, onLeave }: LedgerSettingsPageProps) {
  const [name, setName] = useState(ledger?.name ?? '')
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  const isOwner = ledger?.role === 'OWNER'
  const readOnly = ledger?.accessState === 'FORMER_READ_ONLY'

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onRename || name.trim().length < 1 || name.trim().length > 30) return
    await onRename(name.trim())
  }

  if (!ledger && !isLoading) return <main className="product-page product-page--narrow"><PageHeader title="장부 설정" description="장부 정보와 멤버를 관리합니다." /><div className="mt-6"><EmptyState title="선택한 장부가 없습니다." description="장부 선택기에서 설정할 공동 장부를 선택해주세요." /></div></main>
  return <main className="product-page product-page--standard">
    <PageHeader eyebrow="LEDGER SETTINGS" title="공동 장부 설정" description={readOnly ? '참여했던 기간의 기록을 읽기 전용으로 보고 있습니다.' : '장부 이름, 초대 링크와 멤버를 관리합니다.'} />
    {isLoading ? <div className="mt-6 grid gap-5 lg:grid-cols-2"><div className="h-56 animate-pulse rounded-2xl bg-[var(--wl-color-surface-subtle)]" /><div className="h-56 animate-pulse rounded-2xl bg-[var(--wl-color-surface-subtle)]" /></div> : null}
    {error ? <div className="mt-6"><ErrorState title="장부 설정을 불러오지 못했습니다." description={error} /></div> : null}
    {ledger && !isLoading && !error ? <section className="mt-6 grid gap-5 lg:grid-cols-2">
      <SurfaceCard><h2 className="text-lg font-bold">장부 정보</h2><form className="mt-5" onSubmit={handleRename}><label className="block text-sm font-bold" htmlFor="ledger-settings-name">장부 이름<input className="mt-2 h-12 w-full px-4" disabled={readOnly} id="ledger-settings-name" maxLength={30} onChange={(event) => setName(event.target.value)} value={name} /></label><button className="mt-4 min-h-11 rounded-xl bg-[var(--wl-color-primary)] px-4 text-sm font-bold text-white disabled:bg-slate-300" disabled={readOnly || name.trim().length < 1 || name.trim().length > 30} type="submit">이름 저장</button></form>{readOnly ? <p className="mt-4 flex gap-2 rounded-xl bg-[var(--wl-color-surface-subtle)] px-4 py-3 text-sm font-medium"><LockKeyhole aria-hidden="true" size={17} />읽기 전용 장부는 변경할 수 없습니다.</p> : null}</SurfaceCard>
      <SurfaceCard><div className="flex items-center gap-2"><Link2 aria-hidden="true" className="text-[var(--wl-color-primary-dark)]" size={20} /><h2 className="text-lg font-bold">초대 링크</h2></div>{isOwner && !readOnly ? <><p className="mt-3 text-sm leading-6 text-[var(--wl-color-text-secondary)]">링크는 30분 동안 유효하며, 새 링크를 만들면 이전 링크는 사용할 수 없게 됩니다.</p><button className="mt-5 min-h-11 rounded-xl border border-[var(--wl-color-border-strong)] px-4 text-sm font-bold" onClick={() => void onCreateInvitation?.()} type="button">새 초대 링크 만들기</button>{invitationUrl ? <div className="mt-4 flex flex-col gap-2 rounded-xl bg-[var(--wl-color-surface-subtle)] p-3 sm:flex-row"><input aria-label="초대 링크" className="h-11 min-w-0 flex-1 px-3 text-sm" readOnly value={invitationUrl} /><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--wl-color-primary)] px-4 text-sm font-bold text-white" onClick={() => onCopyInvitation?.(invitationUrl)} type="button"><Copy aria-hidden="true" size={16} />복사</button></div> : null}</> : <p className="mt-4 rounded-xl bg-[var(--wl-color-surface-subtle)] px-4 py-3 text-sm font-medium">초대 링크는 장부 소유자만 만들 수 있습니다.</p>}</SurfaceCard>
      <SurfaceCard className="lg:col-span-2"><div className="flex items-center gap-2"><UsersRound aria-hidden="true" className="text-[var(--wl-color-primary-dark)]" size={20} /><h2 className="text-lg font-bold">멤버</h2></div><ul className="mt-5 divide-y divide-[var(--wl-color-border)]">{members?.map((member) => <li className="flex min-h-16 flex-wrap items-center justify-between gap-4 py-3" key={member.id}><span className="min-w-0 flex-1"><strong className="block truncate">{member.nickname}</strong><span className="text-xs font-bold text-[var(--wl-color-text-secondary)]">{member.role === 'OWNER' ? '소유자' : member.accessState === 'FORMER_READ_ONLY' ? '과거 멤버 · 읽기 전용' : '멤버'}</span></span>{isOwner && member.role !== 'OWNER' && member.accessState !== 'FORMER_READ_ONLY' && !readOnly ? <span className="flex gap-2"><button aria-label={`${member.nickname}에게 소유권 이전`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--wl-color-border-strong)] px-3 text-sm font-bold text-[var(--wl-color-primary-dark)]" onClick={() => { if (window.confirm(`${member.nickname}님에게 장부 소유권을 이전할까요?`)) void onTransferOwnership?.(member.id) }} type="button"><Crown aria-hidden="true" size={16} />소유권 이전</button><button aria-label={`${member.nickname} 내보내기`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--wl-danger-soft)] px-3 text-sm font-bold text-[var(--wl-color-danger)]" onClick={() => void onRemoveMember?.(member.id)} type="button"><UserMinus aria-hidden="true" size={16} />내보내기</button></span> : null}</li>)}</ul>{!members?.length ? <p className="mt-4 text-sm text-[var(--wl-color-text-secondary)]">아직 함께하는 멤버가 없습니다.</p> : null}{!isOwner && !readOnly ? <div className="mt-6 border-t border-[var(--wl-color-border)] pt-5">{confirmingLeave ? <div className="rounded-xl bg-[var(--wl-danger-soft)] p-4"><p className="text-sm font-bold">장부에서 나가면 예약 거래가 일시정지될 수 있습니다.</p><div className="mt-3 flex gap-2"><button className="min-h-10 rounded-xl bg-[var(--wl-color-danger)] px-3 text-sm font-bold text-white" onClick={() => void onLeave?.()} type="button">나가기</button><button className="min-h-10 rounded-xl border border-[var(--wl-color-border)] px-3 text-sm font-bold" onClick={() => setConfirmingLeave(false)} type="button">취소</button></div></div> : <button className="min-h-11 rounded-xl border border-[var(--wl-danger-soft)] px-4 text-sm font-bold text-[var(--wl-color-danger)]" onClick={() => setConfirmingLeave(true)} type="button">공동 장부 나가기</button>}</div> : null}</SurfaceCard>
    </section> : null}
  </main>
}

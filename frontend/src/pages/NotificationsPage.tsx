import { Bell, CheckCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation, useNotificationsQuery } from '../features/notification/model/notificationQueries'
import { EmptyState, ErrorState, PageHeader, SurfaceCard } from '../shared/ui/DesignPrimitives'

export function NotificationsPage() {
  const query = useNotificationsQuery()
  const markRead = useMarkNotificationReadMutation()
  const markAll = useMarkAllNotificationsReadMutation()
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[900px] px-4 py-4 sm:px-6 md:p-8 lg:p-10">
      <PageHeader eyebrow="NOTIFICATIONS" title="알림" description="초대, 예산, 월 마감 소식을 확인합니다." actions={query.data?.unreadCount ? <button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold" disabled={markAll.isPending} onClick={() => markAll.mutate()} type="button"><CheckCheck size={17} />모두 읽음</button> : null} />
      {query.isLoading ? <p className="py-10 text-sm font-bold text-slate-500">알림을 불러오는 중입니다.</p> : null}
      {query.isError ? <div className="mt-5"><ErrorState onRetry={() => query.refetch()} /></div> : null}
      {query.isSuccess && !query.data.notifications.length ? <SurfaceCard className="mt-5"><EmptyState title="새 알림이 없습니다." description="초대나 예산 상태 변화가 생기면 이곳에 표시됩니다." /></SurfaceCard> : null}
      {query.isSuccess && query.data.notifications.length ? <ul className="mt-5 space-y-3">{query.data.notifications.map((item) => <li key={item.id}><SurfaceCard className={item.readAt ? 'opacity-70' : 'border-emerald-200'}><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Bell size={18} /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><strong className="text-sm">{item.title}</strong>{!item.readAt ? <span className="mt-1 size-2 shrink-0 rounded-full bg-emerald-500" aria-label="읽지 않음" /> : null}</div><p className="mt-1 text-sm leading-6 text-slate-500">{item.message}</p><div className="mt-3 flex items-center gap-4">{item.targetPath ? <Link className="text-xs font-bold text-emerald-700" onClick={() => !item.readAt && markRead.mutate(item.id)} to={item.targetPath}>관련 화면 보기</Link> : null}{!item.readAt ? <button className="text-xs font-bold text-slate-500" onClick={() => markRead.mutate(item.id)} type="button">읽음 처리</button> : null}</div></div></div></SurfaceCard></li>)}</ul> : null}
    </main>
  )
}

import { ArrowLeft, FolderPlus, Pencil, Tags, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMeQuery } from '../features/auth/model/authQueries'
import { useCategoriesQuery, useCategoryGroupsQuery, useCreateCategoryGroupMutation, useCreateCategoryMutation, useDeleteCategoryMutation, useUpdateCategoryMutation } from '../features/category/model/categoryQueries'
import type { TransactionType } from '../features/transaction/api/transactionApi'
import { ApiClientError } from '../shared/api/client'
import { CardHeading, EmptyState, ErrorState, PageHeader, SurfaceCard } from '../shared/ui/DesignPrimitives'

export function CategoryManagementPage() {
  const navigate = useNavigate()
  const meQuery = useMeQuery()
  const ledgerId = meQuery.data?.currentLedger.id
  const categoriesQuery = useCategoriesQuery(ledgerId)
  const groupsQuery = useCategoryGroupsQuery(ledgerId)
  const createCategoryMutation = useCreateCategoryMutation(ledgerId)
  const updateCategoryMutation = useUpdateCategoryMutation(ledgerId)
  const deleteCategoryMutation = useDeleteCategoryMutation(ledgerId)
  const createGroupMutation = useCreateCategoryGroupMutation(ledgerId)
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<TransactionType>('EXPENSE')
  const [listType, setListType] = useState<TransactionType>('EXPENSE')
  const [groupId, setGroupId] = useState<number | null>(null)
  const [groupName, setGroupName] = useState('')
  const editingCategory = categoriesQuery.data?.find((category) => category.id === editingCategoryId)
  const visibleGroups = groupsQuery.data?.filter((group) => group.type === type) ?? []

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) return <Navigate replace to="/login" />

  function resetForm() {
    setEditingCategoryId(null)
    setName('')
    setType('EXPENSE')
    setGroupId(null)
  }

  function beginEdit(categoryId: number) {
    const category = categoriesQuery.data?.find((item) => item.id === categoryId)
    if (!category) return
    setEditingCategoryId(category.id)
    setName(category.name)
    setType(category.type)
    setListType(category.type)
    setGroupId(category.categoryGroupId)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!groupId) return
    if (editingCategory) {
      updateCategoryMutation.mutate({ categoryId: editingCategory.id, request: { name, categoryGroupId: groupId } }, { onSuccess: resetForm })
      return
    }
    createCategoryMutation.mutate({ name, type, categoryGroupId: groupId }, { onSuccess: resetForm })
  }

  function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    createGroupMutation.mutate({ name: groupName, type }, { onSuccess: (group) => { setGroupName(''); setGroupId(group.id) } })
  }

  function handleDelete(categoryId: number, categoryName: string) {
    if (!window.confirm(`'${categoryName}' 카테고리를 삭제할까요? 사용 중인 카테고리는 삭제할 수 없습니다.`)) return
    deleteCategoryMutation.mutate(categoryId, {
      onSuccess: () => {
        if (editingCategoryId === categoryId) resetForm()
      },
    })
  }

  const categories = categoriesQuery.data ?? []
  const visibleCategories = categories.filter((category) => category.type === listType)
  const categoryCounts = {
    EXPENSE: categories.filter((category) => category.type === 'EXPENSE').length,
    INCOME: categories.filter((category) => category.type === 'INCOME').length,
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1040px] px-4 py-4 sm:px-6 md:p-8 lg:p-10">
      <PageHeader eyebrow="CATEGORIES" title="카테고리 관리" description="거래에 사용할 카테고리를 만들고 통계 분류를 연결합니다." actions={<button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm" onClick={() => navigate(-1)} type="button"><ArrowLeft size={17} />이전으로</button>} />

      {categoriesQuery.isError || groupsQuery.isError ? <div className="mt-5"><ErrorState onRetry={() => { categoriesQuery.refetch(); groupsQuery.refetch() }} /></div> : null}
      {categoriesQuery.isSuccess && groupsQuery.isSuccess ? <div className="mt-5 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <SurfaceCard labelledBy="category-editor-title">
          <CardHeading eyebrow={editingCategory ? 'EDIT' : 'NEW'} id="category-editor-title" title={editingCategory ? '카테고리 수정' : '새 카테고리'} trailing={<Tags size={19} className="text-emerald-700" />} />
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-bold text-slate-600">카테고리 이름<input className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-base font-bold" onChange={(event) => setName(event.target.value)} placeholder="예: 배달" required value={name} /></label>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="카테고리 유형">{(['EXPENSE', 'INCOME'] as const).map((candidate) => <button className={`min-h-11 rounded-xl border text-sm font-extrabold ${type === candidate ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'} disabled:cursor-not-allowed disabled:opacity-60`} disabled={Boolean(editingCategory)} key={candidate} onClick={() => { setType(candidate); setGroupId(null) }} type="button">{candidate === 'EXPENSE' ? '지출' : '수입'}</button>)}</div>
            {editingCategory ? <p className="text-xs font-medium text-slate-500">카테고리 유형은 기존 거래의 일관성을 위해 변경할 수 없습니다.</p> : null}
            <label className="block text-sm font-bold text-slate-600">통계 대분류<select aria-label="통계 대분류" className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-bold" onChange={(event) => setGroupId(Number(event.target.value) || null)} required value={groupId ?? ''}><option value="">대분류 선택</option>{visibleGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
            {!visibleGroups.length ? <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">먼저 아래에서 이 유형의 통계 대분류를 추가해주세요.</p> : null}
            <div className="flex gap-2"><button className="min-h-12 flex-1 rounded-xl bg-emerald-600 text-sm font-extrabold text-white disabled:bg-slate-300" disabled={!groupId || createCategoryMutation.isPending || updateCategoryMutation.isPending} type="submit">{editingCategory ? '카테고리 저장' : '카테고리 추가'}</button>{editingCategory ? <button className="min-h-12 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-slate-600" onClick={resetForm} type="button"><X size={17} /></button> : null}</div>
          </form>
          <details className="mt-6 border-t border-slate-100 pt-5"><summary className="cursor-pointer text-sm font-extrabold text-emerald-700">+ 통계 대분류 추가</summary><form className="mt-4 flex gap-2" onSubmit={handleCreateGroup}><input className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm font-bold" onChange={(event) => setGroupName(event.target.value)} placeholder={`새 ${type === 'EXPENSE' ? '지출' : '수입'} 대분류`} required value={groupName} /><button className="min-h-11 rounded-xl border border-emerald-600 px-4 text-sm font-extrabold text-emerald-700 disabled:opacity-50" disabled={createGroupMutation.isPending} type="submit"><FolderPlus size={17} /></button></form></details>
        </SurfaceCard>

        <SurfaceCard labelledBy="category-list-title"><CardHeading eyebrow="YOUR CATEGORIES" id="category-list-title" title="카테고리 목록" trailing={<span className="text-xs font-bold text-slate-400">{categories.length}개</span>} /><div aria-label="카테고리 유형" className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-1"><button aria-pressed={listType === 'EXPENSE'} className={`min-h-11 rounded-lg text-sm font-extrabold transition ${listType === 'EXPENSE' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`} onClick={() => setListType('EXPENSE')} type="button">지출 {categoryCounts.EXPENSE}</button><button aria-pressed={listType === 'INCOME'} className={`min-h-11 rounded-lg text-sm font-extrabold transition ${listType === 'INCOME' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`} onClick={() => setListType('INCOME')} type="button">수입 {categoryCounts.INCOME}</button></div>{categoriesQuery.isLoading ? <div className="mt-5 space-y-2">{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div> : null}{!categoriesQuery.isLoading && visibleCategories.length ? <ul className="mt-4 divide-y divide-slate-100">{visibleCategories.map((category) => <li className="flex items-center gap-3 py-3" key={category.id}><span className={`flex size-10 items-center justify-center rounded-xl text-xs font-black ${category.type === 'EXPENSE' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>{category.type === 'EXPENSE' ? '지출' : '수입'}</span><strong className="min-w-0 flex-1 truncate text-sm">{category.name}</strong><button aria-label={`${category.name} 수정`} className="flex min-h-10 items-center gap-1 rounded-lg px-3 text-xs font-extrabold text-emerald-700 hover:bg-emerald-50" onClick={() => beginEdit(category.id)} type="button"><Pencil size={15} />수정</button><button aria-label={`${category.name} 삭제`} className="flex min-h-10 items-center gap-1 rounded-lg px-3 text-xs font-extrabold text-red-600 hover:bg-red-50 disabled:opacity-50" disabled={deleteCategoryMutation.isPending} onClick={() => handleDelete(category.id, category.name)} type="button"><Trash2 size={15} />삭제</button></li>)}</ul> : null}{deleteCategoryMutation.isError ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{deleteCategoryMutation.error instanceof ApiClientError ? deleteCategoryMutation.error.message : '카테고리를 삭제하지 못했습니다.'}</p> : null}{!categoriesQuery.isLoading && !visibleCategories.length ? <EmptyState title={`${listType === 'EXPENSE' ? '지출' : '수입'} 카테고리가 없습니다.`} description="왼쪽에서 이 유형의 카테고리를 추가해보세요." /> : null}</SurfaceCard>
      </div> : null}
    </main>
  )
}

import { afterEach, describe, expect, it, vi } from 'vitest'
import { previewImportSession, saveImportSession } from './transactionImportApi'

afterEach(() => vi.unstubAllGlobals())

describe('V1 transaction import API', () => {
  it('sends multiple images and their source as multipart form data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ sessionId: 1, candidates: [], omittedCount: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const firstImage = new File(['image-1'], 'receipt-1.png', { type: 'image/png' })
    const secondImage = new File(['image-2'], 'receipt-2.png', { type: 'image/png' })

    await previewImportSession(1, 'RECEIPT', [firstImage, secondImage])

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:8080/api/ledgers/1/transaction-imports/previews')
    expect(options.headers).not.toHaveProperty('Content-Type')
    expect((options.body as FormData).get('sourceType')).toBe('RECEIPT')
    expect((options.body as FormData).getAll('images')).toEqual([firstImage, secondImage])
  })

  it('saves selected candidates with the preview session id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ transactionIds: [9] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const candidates = [{ candidateId: 3, amount: 12_000, occurredOn: '2026-07-21', merchant: '점심', categoryId: 1, budgetSource: { type: 'PERSONAL' as const, ownerUserId: 1 }, selected: true }]

    await saveImportSession(1, 7, candidates)

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:8080/api/ledgers/1/transaction-imports')
    expect(options.body).toBe(JSON.stringify({ sessionId: 7, candidates }))
  })
})

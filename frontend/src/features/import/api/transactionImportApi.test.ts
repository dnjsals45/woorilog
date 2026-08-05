import { afterEach, describe, expect, it, vi } from 'vitest'
import { previewImportSession, saveImportSession } from './transactionImportApi'

afterEach(() => vi.unstubAllGlobals())

describe('V1 transaction import API', () => {
  it('sends one sourceType per image as multipart form data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ sessionId: 1, candidates: [], omittedCount: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const firstImage = new File(['image-1'], 'receipt-1.png', { type: 'image/png' })
    const secondImage = new File(['image-2'], 'card-1.png', { type: 'image/png' })

    await previewImportSession(1, [
      { image: firstImage, sourceType: 'RECEIPT' },
      { image: secondImage, sourceType: 'CARD_APP_SCREENSHOT' },
    ])

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:8080/api/ledgers/1/transaction-imports/previews')
    expect(options.headers).not.toHaveProperty('Content-Type')
    expect((options.body as FormData).getAll('sourceTypes')).toEqual(['RECEIPT', 'CARD_APP_SCREENSHOT'])
    expect((options.body as FormData).getAll('images')).toEqual([firstImage, secondImage])
  })

  it('saves selected candidates with the preview session id', async () => {
    /* 목 응답은 백엔드 SaveImportSessionResponse 와 같은 모양이어야 한다.
     * 예전에는 { transactionIds: [...] } 로 두어, 실제 응답과 다른데도 테스트가 통과했다.
     * 지금은 apiRequest 가 schema 로 응답을 검사해서 모양이 어긋나면 여기서 바로 실패한다. */
    const created = [{
      candidateId: 3,
      transaction: {
        id: 9,
        ledgerId: 1,
        type: 'EXPENSE',
        amount: 12_000,
        transactionDate: '2026-07-21',
        category: null,
        payer: { id: 1, nickname: '개발자1' },
        memo: null,
        paymentMethod: null,
        card: null,
        installment: null,
      },
    }]
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ created }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const candidates = [{ candidateId: 3, amount: 12_000, occurredOn: '2026-07-21', merchant: '점심', categoryId: 1, budgetSource: { type: 'PERSONAL' as const, ownerUserId: 1 }, selected: true }]

    const result = await saveImportSession(1, 7, candidates)

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:8080/api/ledgers/1/transaction-imports')
    expect(options.body).toBe(JSON.stringify({ sessionId: 7, candidates }))
    expect(result.created[0].candidateId).toBe(3)
  })
})

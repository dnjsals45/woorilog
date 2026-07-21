import { afterEach, describe, expect, it, vi } from 'vitest'
import { previewTransactionImageImport, saveTransactionImport } from './transactionImportApi'

describe('previewTransactionImageImport', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should send multiple images as repeated multipart form data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      extractedText: '바오 25,000원',
      ocrEngine: 'tesseract-5-server',
      candidates: [],
      rejectedLines: 0,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const firstImage = new File(['image-1'], 'receipt-1.png', { type: 'image/png' })
    const secondImage = new File(['image-2'], 'receipt-2.png', { type: 'image/png' })

    await previewTransactionImageImport(1, [firstImage, secondImage], '2026-07-21')

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:8080/api/ledgers/1/transaction-imports/ocr-preview')
    expect(options.method).toBe('POST')
    expect(options.headers).not.toHaveProperty('Content-Type')
    expect(options.body).toBeInstanceOf(FormData)
    expect((options.body as FormData).getAll('image')).toEqual([firstImage, secondImage])
    expect((options.body as FormData).get('transactionDate')).toBe('2026-07-21')
  })
})

describe('saveTransactionImport', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should send selected candidates in one request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await saveTransactionImport(1, [{
      type: 'EXPENSE',
      amount: 12_000,
      transactionDate: '2026-07-21',
      categoryId: 1,
      memo: '점심',
    }])

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:8080/api/ledgers/1/transaction-imports')
    expect(options.method).toBe('POST')
    expect(options.body).toBe(JSON.stringify({
      candidates: [{
        type: 'EXPENSE',
        amount: 12_000,
        transactionDate: '2026-07-21',
        categoryId: 1,
        memo: '점심',
      }],
    }))
  })
})

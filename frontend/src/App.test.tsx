import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { clearAccessToken } from './shared/api/client'

function renderApp(initialPath = '/') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  clearAccessToken()
  vi.restoreAllMocks()
})

describe('App', () => {
  it('renders the landing page at the root route', () => {
    renderApp('/')

    expect(
      screen.getByRole('heading', { level: 1, name: /수입과 지출을 함께 관리하고/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '무료로 시작하기' })).toHaveAttribute('href', '/login')
  })

})

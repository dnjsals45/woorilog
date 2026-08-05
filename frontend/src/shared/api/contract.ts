import type { ZodType } from 'zod'

/* 서버 응답이 프론트가 기대하는 모양과 어긋나는지 실제 응답으로 확인합니다.
 *
 * 프론트 타입을 손으로 적어 두면 타입과 mock 이 서로만 일치해도 `tsc` 와 unit test 가 통과합니다.
 * 실제 응답의 필드 이름이 달라도 아무도 모르고, 화면에만 값이 비어 보입니다
 * (docs/engineering/testing-strategy.md 의 '알려진 공백').
 *
 * 그래서 검증을 API client 한 곳에 두고, 타입은 schema 에서 `z.infer` 로 뽑습니다.
 * schema 가 유일한 출처라서 타입과 검증이 따로 놀 수 없습니다.
 */

export class ContractMismatchError extends Error {
  readonly violation: ContractViolation

  constructor(violation: ContractViolation) {
    super(`${violation.method} ${violation.path} 응답이 프론트 타입과 다릅니다.\n${violation.issues.map((issue) => `  - ${issue}`).join('\n')}`)
    this.name = 'ContractMismatchError'
    this.violation = violation
  }
}

export type ContractViolation = {
  method: string
  path: string
  issues: string[]
}

const listeners = new Set<(violation: ContractViolation) => void>()

/** 어긋난 응답을 밖에서 모으고 싶을 때 씁니다. 해제 함수를 돌려줍니다. */
export function onContractViolation(listener: (violation: ContractViolation) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** URL 의 id 같은 가변 조각을 지워 같은 엔드포인트끼리 묶습니다. */
function normalizePath(path: string) {
  return path.split('?')[0].replace(/\/\d+(?=\/|$)/g, '/{id}')
}

/** 어긋난 자리에 서버가 실제로 뭘 넣었는지 보여줍니다. 이게 없으면 백엔드 코드를 열어봐야 합니다. */
function valueAt(data: unknown, path: ReadonlyArray<PropertyKey>) {
  let cursor: unknown = data
  for (const key of path) {
    if (cursor === null || typeof cursor !== 'object') return undefined
    cursor = (cursor as Record<PropertyKey, unknown>)[key]
  }
  if (cursor === undefined) return '없음'
  const text = typeof cursor === 'object' ? JSON.stringify(cursor) : String(cursor)
  return text.length > 80 ? `${text.slice(0, 80)}…` : text
}

function describe(issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>, data: unknown) {
  return issues.slice(0, 12).map((issue) => {
    const at = issue.path.length ? issue.path.map(String).join('.') : '(응답 최상위)'
    return `${at}: ${issue.message} (받은 값: ${valueAt(data, issue.path)})`
  })
}

/* 같은 화면을 오갈 때마다 같은 위반이 반복되면 콘솔이 묻혀서, 실행당 한 번만 알립니다. */
const reported = new Set<string>()

/** 테스트에서 상태가 새지 않도록 초기화합니다. */
export function resetContractViolations() {
  reported.clear()
}

/**
 * 응답을 검사만 하고 원본을 그대로 돌려줍니다.
 *
 * `parse` 로 갈아끼우지 않는 이유는 zod object 가 기본으로 모르는 키를 지우기 때문입니다.
 * 검증을 켠 것만으로 화면 동작이 달라지면 안 됩니다.
 *
 * 실패했을 때의 처리는 환경에 따라 다릅니다.
 * - test: 던집니다. mock 이 실제 응답과 다르면 unit test 가 바로 실패합니다.
 * - 그 외(dev·운영): 콘솔 오류만 남기고 통과시킵니다. 서버가 필드를 하나 더 붙였다고
 *   화면이 죽으면 안 되고, 전 화면 자동 점검은 콘솔 오류를 모으므로 이것만으로 잡힙니다.
 */
export function checkResponse(schema: ZodType, data: unknown, path: string, method: string) {
  const result = schema.safeParse(data)
  if (result.success) return

  const violation: ContractViolation = {
    method,
    path: normalizePath(path),
    issues: describe(result.error.issues, data),
  }
  listeners.forEach((listener) => listener(violation))

  if (import.meta.env.MODE === 'test') {
    throw new ContractMismatchError(violation)
  }

  const key = `${violation.method} ${violation.path} ${violation.issues.join('|')}`
  if (reported.has(key)) return
  reported.add(key)
  console.error(`[api-contract] ${new ContractMismatchError(violation).message}`)
}

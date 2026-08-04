# Data Migration

이 문서는 이전 월 단위 구현을 새 V1 목표 모델로 옮기는 기준입니다. 실제 Flyway migration은 이 순서와 검증을 따르며, 스키마 변경 전 운영 데이터 백업과 복구 절차가 준비되어야 합니다.

## 원칙

- 먼저 새 컬럼·테이블을 추가하고 backfill을 검증한 뒤 구형 읽기·쓰기를 제거합니다.
- 사용자 데이터의 의미가 불명확하면 임의 변환하거나 삭제하지 않고 migration report에 격리합니다.
- 금액 합계, 거래 수, 멤버십과 카테고리 표시가 전후에 보존되어야 합니다.
- 구형 API 제거와 스키마 삭제는 새 프론트엔드가 배포된 뒤 별도 migration에서 수행합니다.
- down migration에 의존하지 않고 백업 복원과 이전 애플리케이션 재배포가 가능한 단계로 나눕니다.

## 현재 모델과 목표 모델

| 현재 기준선 | 새 V1 목표 | 전환 |
| --- | --- | --- |
| `ledger_months.budget_month` | `budget_periods.start_date/end_date` | 가계부 기간 규칙으로 날짜 구간 생성 |
| 월 총예산·member allocation | 기간 전체·개인·공동·예비비 나누기 | 기존 멤버별 개인 예산 보존, 공동 예산은 0으로 초기화 후 사용자 확인 |
| 사용자 생성 category group | 고정 system category group | 검증된 이름만 mapping하고 미매핑 세부 카테고리는 `기타` 카테고리 아래 원래 이름으로 보존·보고 |
| transaction의 category FK | category snapshot | 현재 category와 group 이름을 거래에 backfill |
| `EXPENSE/INCOME` | `EXPENSE/INCOME/TRANSFER` | 기존 값은 그대로 유지 |
| payer 중심 거래 | budget allocation 차감 | 개인 가계부는 소유자 예산, 공동 가계부는 기존 payer의 개인 예산으로 임시 mapping |
| 직접·링크 invitation | 30분 단일 링크 invitation | 기존 pending 직접 초대 종료, 링크는 만료 처리 후 재생성 |
| archived ledger | V1 보관 미지원 | archived 상태는 읽기 전용 legacy ledger로 격리, 자동 복원 금지 |
| closed month | 수동 마감 없음 | 마감 이력 보존, 새 mutation guard에서는 사용하지 않음 |
| settlement | V1 제외 | 지급 이력 보존용 legacy read model로 이동, 새 쓰기 중단 |
| fixed budget template | recurring expense의 `isFixedExpense` | 연결 가능한 반복 지출에 병합, 단독 예산 템플릿은 검토 목록 |
| card management | 거래 payment snapshot | 기존 거래에 카드 표시 snapshot backfill, 카드 관리 API 쓰기 중단 |

공동 가계부 거래의 차감 예산은 제품 의미를 자동으로 확정할 수 없습니다. 초기 backfill은 기존 결제자의 개인 예산으로 매핑하고, migration report와 첫 진입 확인 화면에서 사용자가 공동 예산 거래를 재분류할 수 있게 해야 합니다.

## 단계

### 1. 사전 점검

- 개인 가계부가 없거나 둘 이상인 사용자 수
- 활성 멤버가 두 명을 초과하는 공동 가계부 수
- owner가 없거나 여러 명인 가계부 수
- 잘못된 category/type 참조와 orphan 거래 수
- 중복 가계부 월, 마감 상태, 음수 금액 수
- pending 직접 초대와 30분보다 오래된 링크 수
- archived 가계부와 settlement 지급 이력 수

사전 점검이 0을 요구하는 항목과 별도 격리가 가능한 항목을 migration report에 구분합니다.

- 추가 개인 가계부는 삭제하지 않고 기본 가계부가 아닌 legacy read-only 가계부로 격리합니다.
- 활성 멤버가 두 명을 초과하거나 owner가 유일하지 않은 공동 가계부는 자동으로 멤버를 제거하지 않고 legacy read-only로 격리합니다.
- 이전 구현에 남아 있지 않은 탈퇴자 이력은 추측해 만들지 않습니다. 기존 공동 가계부의 재초대 제한은 확인 가능한 상대방 이력부터 적용합니다.

### 2. 확장 스키마 추가

- 사용자 닉네임 확정 시각과 시간대
- 멤버십 참여 구간과 종료 사유
- 예산 기간·예산 나누기·예비비 이전·카테고리 예산
- 거래 차감 예산, 이체 하위 유형, 보임 상태와 카테고리·결제 수단 snapshot
- 자동 기록 계획·occurrence와 일시정지 사유
- import session·candidate metadata
- 알림 설정·threshold state·주간 가이드

이 단계에서는 구형 컬럼을 삭제하지 않습니다.

### 3. Backfill

1. 모든 사용자에 기본 개인 가계부를 하나 지정합니다. 없으면 생성하고 중복이면 기존 owner·최근 사용 이력을 기준으로 하나를 기본으로 표시하되 나머지는 격리합니다.
2. 가계부별 기본 예산 기간 규칙을 달력 월(`1일`)로 설정하고 기존 월을 동일한 날짜 범위의 `BudgetPeriod`로 변환합니다.
3. 개인 가계부 거래는 소유자 개인 예산, 공동 가계부 거래는 기존 payer 개인 예산으로 연결합니다.
4. category group을 system group code에 mapping하고 거래에 category snapshot을 채웁니다.
5. 기존 반복 거래(legacy)를 자동 기록 계획·occurrence로 옮기고 generation 기록으로 중복 방지 key를 채웁니다.
6. 기존 카드 거래에 소유자에게만 보이는 결제 수단 snapshot을 채웁니다.
7. 기존 알림은 원래 수신자와 읽음 상태를 유지하고 새 알림 유형으로 mapping할 수 없는 항목은 legacy type으로 보존합니다.

### 4. 이중 검증과 읽기 전환

- 가계부·기간별 거래 건수와 수입·지출 합계 비교
- 기존 월 총예산과 새 기간 총예산 비교
- 사용자별 접근 가능한 가계부와 거래 수 비교
- category group별 합계와 snapshot 집계 비교
- 자동 기록 계획별 과거 생성 거래와 occurrence 비교
- 샘플 사용자 UI에서 개인·공동·나만 보는 거래 노출 확인

읽기 경로를 새 모델로 전환한 뒤 최소 한 배포 주기 동안 구형 테이블을 보존합니다.

### 5. 쓰기 전환과 정리

- 새 V1 API만 새 모델에 쓰도록 전환합니다.
- 직접 초대, 월 마감·재오픈, 정산, 가계부 보관과 추가 개인 가계부 쓰기를 막습니다.
- 전환 검증 후 구형 write code와 더 이상 사용하지 않는 index·constraint를 제거합니다.
- 구형 테이블 삭제는 별도 배포로 분리하고 백업 복구 리허설 이후 수행합니다.

## 검증 쿼리 기준

- migration 전후 사용자·가계부·멤버십·거래 총건수
- 가계부와 날짜 구간별 `EXPENSE`, `INCOME` 합계
- allocation이 없는 지출 거래 수
- snapshot 카테고리 code가 없는 거래 수
- 두 명 초과 활성 멤버, owner 수 불일치, 겹치는 기간 수
- `GENERATED` occurrence와 연결 거래 불일치 수
- 함께 보는 개인 거래 중 결제 수단 식별 정보가 상대방 query에 노출되는 수

모든 결과와 허용된 예외를 배포 artifact로 남기되 개인 거래 내용과 credential은 포함하지 않습니다.

## Rollback

- 확장·backfill 단계는 구형 컬럼과 읽기 경로를 유지해 애플리케이션 rollback이 가능해야 합니다.
- 새 모델 write가 시작된 뒤에는 단순 코드 rollback을 금지하고 새 데이터를 구형 모델로 역변환할 수 있는지 먼저 판단합니다.
- destructive cleanup 이후 rollback은 검증된 DB backup 복원과 이전 이미지 재배포로 수행합니다.
- rollback trigger는 금액 합계 불일치, 권한 누출, 중복 자동 거래 또는 인증 실패율 급증입니다.

## 구현 및 리허설 상태

- `V8`~`V15`는 V1 확장 스키마를 추가하고, `V16__backfill_v1_read_models.sql`은 기존 월 예산·멤버별 예산·거래·반복 거래(legacy)·카드 표시값과 사용자별 기본 설정을 V1 read model로 옮깁니다.
- `V16`은 구형 테이블을 삭제하지 않으며 다시 실행되어도 동일 key를 중복 생성하지 않도록 작성합니다.
- 공동 가계부의 구형 category budget은 개인/공동 귀속을 추측하지 않고 구형 테이블에 보존합니다. 첫 V1 예산 설정에서 사용자가 공동·개인 예산을 확정해야 합니다.
- 2026-07-31 로컬 MySQL 8.4 데이터에 Flyway `V1`~`V16`을 순차 적용했고, 적용 후 `EXPENSE` 거래의 allocation 미연결과 category가 있는 거래의 group snapshot 누락이 모두 0건임을 확인했습니다.

운영 적용 전에는 아래 결과를 배포 artifact에 남깁니다.

```sql
SELECT version, description, success
FROM flyway_schema_history
ORDER BY installed_rank;

SELECT COUNT(*) AS missing_expense_allocations
FROM transactions
WHERE type = 'EXPENSE' AND budget_allocation_id IS NULL;

SELECT COUNT(*) AS missing_category_snapshots
FROM transactions
WHERE category_id IS NOT NULL AND category_group_code IS NULL;
```

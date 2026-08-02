-- 공동 장부 삭제. archived 와 따로 두는 이유는, 삭제된 장부의 초대 링크를 클릭했을 때
-- "보관됨"이 아니라 "삭제됨"을 정확히 알려주기 위해서입니다.
-- 삭제 시 archived 도 함께 true 로 두어 기존 목록 필터가 그대로 동작합니다.
ALTER TABLE ledgers ADD COLUMN deleted_at DATETIME(6) NULL;

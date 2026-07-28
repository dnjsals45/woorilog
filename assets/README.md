# Assets

이 디렉토리는 코드가 아닌 프로젝트 asset을 보관합니다.

## Structure

```text
assets/
  local/       # git ignore
  exports/     # git ignore
  tmp/         # git ignore
```

## Commit Rules

Git에 올립니다:

- 제품 문서에서 지속적으로 사용하는 소형 reference
- 출처와 사용 목적이 명확한 공용 asset
- asset 사용 기준을 설명하는 README

Git에 올리지 않습니다:

- 임시 export 파일
- zip archive
- Figma/이미지 편집 원본 중 대용량 또는 개인 작업 파일
- 실험용 생성 이미지
- 외부에서 받은 license가 불명확한 원본 파일

## Runtime Rule

실제 앱에서 사용하는 파일은 `frontend/src/assets` 또는 `frontend/public/assets`에 둡니다.
일회성 목업과 비교용 이미지는 저장소에 계속 보관하지 않고, 확정된 판단을 `docs/design`과 실제 코드에 반영합니다.

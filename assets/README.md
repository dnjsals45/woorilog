# Assets

이 디렉토리는 코드가 아닌 프로젝트 asset을 보관합니다.

## Structure

```text
assets/
  design/
    Desktop/
    Landing/
    Mobile/
    README.md
  local/       # git ignore
  exports/     # git ignore
  tmp/         # git ignore
```

## Commit Rules

Git에 올립니다:

- 구현 기준이 되는 화면 목업 PNG
- 랜딩 hero처럼 제품 방향을 정하는 reference image
- asset 사용 기준을 설명하는 README

Git에 올리지 않습니다:

- 임시 export 파일
- zip archive
- Figma/이미지 편집 원본 중 대용량 또는 개인 작업 파일
- 실험용 생성 이미지
- 외부에서 받은 license가 불명확한 원본 파일

## Runtime Rule

`assets/design`은 디자인 reference 폴더입니다.
프론트엔드에서 직접 import하지 않고, 실제 앱에 필요한 파일만 `frontend/src/assets` 또는 `frontend/public/assets`로 복사해 사용합니다.

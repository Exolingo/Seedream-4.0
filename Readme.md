# Seedream 4.0 Studio

React + Vite 기반의 Seedream 4.0 이미지 생성/편집 스튜디오입니다. Text to Image, Image to Image 두 모드를 지원하며 BytePlus ModelArk Seedream 4.0과 ChatGPT 기반 프롬프트 강화를 연동할 수 있도록 설계되었습니다.

## 주요 기능

- **탭 네비게이션**: Text to Image / Image to Image 를 전환하면서 URL `?tab=` 파라미터와 동기화합니다.
- **프롬프트 박스**: 원본/강화 프롬프트를 비교·편집하며 ChatGPT API를 통한 강화 버튼을 제공합니다.
- **비율/해상도 선택**: 정의된 Aspect Ratio & Resolution Preset 조합으로 출력 크기를 계산합니다.
- **Seedream 4.0 호출**: fetch + AbortController + 지수 백오프 재시도로 안정적인 호출을 수행하도록 구성했습니다.
- **Image to Image 업로드**: JPEG/PNG, 10MB 이하, 1:3~3:1 비율 검사, 최대 8개의 참조 이미지 순서 변경 기능을 제공합니다.
- **히스토리 드로어**: LocalStorage(`seedream.history.v1`)에 최근 100건을 저장하고 재로딩/삭제/링크 열기를 지원합니다.
- **접근성**: 모달/드로어 포커스 트랩, 키보드 네비게이션, 포커스 스타일 등을 제공합니다.
- **라이트/다크 테마**: 헤더에서 테마를 즉시 전환하며, CSS 변수 기반의 색상 시스템을 사용합니다.

## 환경 변수

`.env.example` 파일을 참고해 `.env.local` 등에 환경 변수를 정의하세요. Vite는 `VITE_` prefix가 있는 값만 노출됩니다.

```
VITE_ARK_API_KEY=YOUR_ARK_KEY
VITE_ARK_BASE=https://ark.ap-southeast.bytepluses.com/api/v3
VITE_CHATGPT_API_KEY=YOUR_OPENAI_KEY
VITE_CHATGPT_BASE=https://api.openai.example/v1
```

## 실행 방법

```bash
npm install
npm run dev
```

> **주의:** 샌드박스 환경에서는 npm 레지스트리 접근이 제한될 수 있습니다. 이 경우 로컬 개발 환경에서 의존성을 설치한 뒤 실행하세요.

## 테마 색상 커스터마이징

`src/theme/color.ts` 파일에서 Primary 컬러와 라이트/다크 테마 팔레트를 정의합니다. 필요 시 해당 파일의 값을 수정해 브랜드 컬러를 적용하고, 앱을 재빌드하면 전체 UI에 반영됩니다.

## 빌드

```bash
npm run build
```

## 테스트 체크리스트

- [ ] 프롬프트 강화 결과 반영 및 수정 가능 여부
- [ ] 비율/해상도 조합 해상도 계산 검증
- [ ] Image to Image 업로드 제약 확인
- [ ] 동일 조건 재생성 시 중복 호출 방지
- [ ] 히스토리 저장/복원/삭제/재생성 동작 확인
- [ ] 키보드 내비게이션 및 포커스 이동 검증
- [ ] 에러 메시지 및 취소 동작 확인
- [ ] 워터마크/스트리밍/시퀀스 옵션 적용 확인

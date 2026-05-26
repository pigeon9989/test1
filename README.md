# test1 — Notes (MF Platform remote)

간단한 메모장 모듈. **MF Platform**의 host shell이 런타임에 동적으로 로드합니다.

- expose: `./App` (default export)
- MF runtime name: `notes`
- GitHub Pages base: `/test1/`

## 로컬에서 실행

```powershell
pnpm install
pnpm dev   # http://localhost:5177 — standalone 미리보기
```

host와 함께 실행하려면 host-shell의 `public/local-registry.json`에 이미 `notes` 항목이 들어있습니다. status를 `disabled`에서 `active`로 바꾸고 entry를 `http://localhost:5177/mf-manifest.json` 으로 바꾸면 host(:5175)에서 보입니다.

## 처음 GitHub에 push 하기

이 폴더는 빈 GitHub repo `pigeon9989/test1`로 push할 준비가 되어 있습니다:

```powershell
git init
git add .
git commit -m "feat: initial scaffold for notes remote"
git branch -M main
git remote add origin https://github.com/pigeon9989/test1.git
git push -u origin main
```

push되면 `.github/workflows/deploy.yml`이 자동 실행:

1. **security gates** — gitleaks · semgrep · pnpm audit · trivy
2. **build** — typecheck · test · vite build
3. **deploy to GitHub Pages** (main 브랜치 + push 이벤트에서만)

## GitHub Pages 활성화

저장소 Settings → Pages → **Source: GitHub Actions**로 설정하세요. 워크플로우가 처음 deploy 단계까지 가서 성공하면 자동 활성화되기도 하지만, Source 옵션이 "Deploy from a branch"로 되어 있다면 첫 배포가 실패할 수 있어요.

배포 URL: `https://pigeon9989.github.io/test1/`

manifest 검증:

```powershell
curl https://pigeon9989.github.io/test1/mf-manifest.json
```

## host에 등록

배포가 끝나면 host-shell의 `public/local-registry.json`에서 `notes` 항목을 `"status": "active"`로 바꾸면 host의 스토어에 즉시 나타납니다. (운영에선 DDB registry로 PUT — `docs/DEVELOPER_GUIDE.md`)

# test1 — Notes (MF Platform remote)

간단한 메모장 모듈. **MF Platform**의 host shell이 런타임에 동적으로 로드합니다.

- expose: `./App` (default export)
- MF runtime name: `notes`
- GitHub Pages base: `/test1/` (보조 채널)
- 운영 URL: `https://mf.gonogono.org/remotes/test1/` (호스트 서버가 직접 빌드/서빙)

## 로컬에서 실행

```powershell
pnpm install
pnpm dev   # http://localhost:5177 — standalone 미리보기
```

host와 함께 실행하려면 host-shell의 `public/local-registry.json`에 이미 `notes` 항목이
`status: "active"`로 들어 있고 dev entry는 `http://localhost:5177/mf-manifest.json`을
가리킵니다. 그대로 `cd ../host-shell && pnpm dev`만 띄우면 host(:5175)에서 mount됩니다.

## 서비스에 반영 (정해진 운영 흐름)

이 모듈은 **호스트 서버가 직접 git pull + vite build**해서 `https://mf.gonogono.org/remotes/test1/`로
서빙합니다. GitHub Pages는 보조 채널로 함께 deploy되지만 호스트가 쓰진 않습니다.

코드 변경 흐름:
1. 이 repo(`pigeon9989/test1`)에 `git push origin main`
2. (옵셔널) GitHub Actions가 `gh-pages` branch로 deploy (보안 게이트 + 빌드)
3. 호스트 운영자가 로컬에서 `bash scripts/deploy.sh` 한 번 — 서버가 git pull + vite build
   `--base /remotes/test1/`로 빌드, `local-registry.json`의 `entry`/`origin`/`version`/`buildSha`를
   자동 stamp
4. 사용자 브라우저 새로고침 → 새 manifest fetch (no-cache) → 새 hashed chunk load

## CI/CD (action-less workflow)

`.github/workflows/deploy.yml`은 **`uses:` action을 쓰지 않습니다** — codeload.github.com
장애에도 빌드가 살아남도록 모든 step을 raw shell로:

1. **security gates** (blocking): gitleaks · semgrep · pnpm audit
2. **trivy fs** (informational, continue-on-error)
3. **build**: node + pnpm 직접 install · typecheck · test · vite build
4. **deploy to `gh-pages` branch** (main + push 이벤트에서만)

Pages publish는 GitHub Pages의 branch 모드가 자동 처리. SARIF 업로드(github/codeql-action)는
codeload 장애 회피를 위해 제거된 상태 — 보안 검사 자체는 그대로 blocking.

## 처음 GitHub에 push 하기 (이미 끝남 — 새 fork 시 참고)

이 폴더는 이미 `pigeon9989/test1`에 push되어 운영 중입니다. 새로 시작하는 경우만:

```powershell
git init
git add .
git commit -m "feat: initial scaffold for notes remote"
git branch -M main
git remote add origin https://github.com/<owner>/<repo>.git
git push -u origin main
```

`.github/workflows/deploy.yml`의 `gh-pages` 모드를 쓰려면 저장소 Settings → Pages →
Source = **Deploy from a branch** → `gh-pages` / `(root)`로 한 번 설정.

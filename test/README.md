# PULTRIX 테스트

게임 사이트에는 영향 없는 개발용 폴더예요.

## logic/ — 규칙 계산 테스트 (브라우저 필요 없음)
`index.html`의 `// LOGIC START` ~ `// LOGIC END` 부분만 꺼내서 검사해요.

```
node logic/terr_test.js   # 땅따먹기
node logic/asn_test.js    # 암살전
```

## sim/ — 폰 여러 대 시뮬레이터
가짜 Firebase 서버 + 크롬 여러 창으로 실제 한 판을 자동으로 돌려요. GPS·나침반·시간도 조작해요.

준비 (처음 한 번):
```
cd test/sim
npm install
```
크롬이 `/usr/bin/google-chrome`이 아니면 `CHROME=크롬경로`를 앞에 붙여요.

실행:
```
node build.js            # index.html → game.html (CDN 대신 로컬 파일, Firebase는 가짜로)
node server.js &         # 가짜 Firebase 서버 (포트 8790)
node classic.js          # 기본 모드 한 판
node drive.js            # 암살전
node drive_terr.js       # 땅따먹기 4명
node dbg_track.js        # 추격자 즉시 추적
node dbg_skill.js        # 스태미나 멈춤 회복 · 자폭 · 리플레이 스킬
```
`index.html`을 고친 뒤에는 `node build.js`를 다시 실행하고, 테스트마다 서버를 새로 켜는 게 좋아요.

- `server.js`: 가짜 DB. `/offset?ms=` 로 게임 시계를 앞으로 돌리고, `/db` 로 DB 전체를 보고, `/dbset` 으로 값을 바꿔요.
- `fb-db.js`: 게임이 쓰는 Firebase 함수(ref, set, update, push, onValue, runTransaction 등)를 흉내 내요.

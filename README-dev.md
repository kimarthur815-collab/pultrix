# PULTRIX 개발 환경

**코드는 `src/`에서 고쳐요.** `node build.js`가 `src/`를 합쳐서 `index.html` 한 파일을 만들고, GitHub Pages는 그 `index.html`을 그대로 배포해요.
`index.html`을 직접 고치면 다음 빌드 때 덮어써지니까 꼭 `src/`에서 고치세요.

```
src/index.html        화면 뼈대 (HTML). '@@include 파일' 자리에 아래 파일들이 들어감
src/style.css         모든 디자인
src/config.js         Firebase 설정값
src/logic.js          규칙 계산 (RULES, 능력 목록, 땅따먹기·암살전 계산 등. 화면 없음)
src/game/ORDER        game 파일 합치는 순서 (하나의 스크립트라 순서 중요)
src/game/01-core.js … 21-replay.js   기능별 게임 코드
  01 core 기본·상태 / 02 sound 소리 / 03 ui 설정창·화면 / 04 gps / 05 map 지도
  06 room-lobby 방·로비 / 07 game-start / 08 augs 능력 목록·획득 / 09 mafia
  10 augs-use 능력 쓰기 / 11 modes-extra 좀비·경찰과도둑·가위바위보 / 12 play 게임 중 기능
  13 draw 지도 그리기 / 14 tick 1초마다 진행 / 15 mugung 무궁화 / 16 banners
  17 assassin 암살전 / 18 territory 땅따먹기 / 19 result 승패·결과 / 20 tutorial / 21 replay
build.js              src → index.html  (node build.js --check: 둘이 같은지 확인)
index.html            빌드 결과물 (배포용, 직접 고치지 않기)
database.rules.json   Firebase 보안 규칙 (콘솔에 직접 배포)
mugung.mp3            무궁화 스킬 노래
test/logic/           규칙 계산 테스트 (node만 있으면 됨)
test/sim/             폰 여러 대 시뮬레이터 (가짜 Firebase + 크롬) → test/README.md
dev/mugung/           무궁화 부엉이 애니메이션·노래 만드는 스크립트 + 미리보기 영상
dev/tools/            무궁화 화면 캡처 도구, 암살전·땅따먹기 코드 조각 원본
```

## 준비물
- Node.js 18+ , 크롬 (시뮬레이터용, 경로가 다르면 `CHROME=경로`)
- Python 3 + numpy (무궁화 소리 만들 때만)
- ffmpeg (영상 만들 때만)

## 자주 하는 일
게임 고치고 확인:
```
# src/ 에서 고친 뒤
node build.js
node test/logic/terr_test.js && node test/logic/asn_test.js
cd test/sim && npm install && node build.js && (node server.js &) && node classic.js
```

무궁화 미리보기 다시 만들기:
```
cd dev/mugung && npm install
node owl.js                 # timing.json + 프레임
python3 sound.py            # sound.wav (game 인자를 주면 게임용 game.wav)
```

무궁화 화면 캡처:
```
cd dev/tools && npm install && node build.js && node shot.js 1.2 4.5
```

## 배포
`node build.js` 후 `index.html`까지 같이 커밋해서 `main`에 push하면 1~2분 뒤 https://kimarthur815-collab.github.io/pultrix/ 에 반영돼요.

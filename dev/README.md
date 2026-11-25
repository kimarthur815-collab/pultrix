# PULTRIX 개발 환경

게임 자체는 루트의 `index.html` 한 파일이에요 (GitHub Pages로 그대로 배포). 이 폴더와 `test/`는 개발용이라 사이트에 영향 없어요.

```
index.html            게임 전체 (LOGIC START~END = 규칙 계산, 그 아래 = 화면·Firebase)
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
`main`에 push하면 1~2분 뒤 https://kimarthur815-collab.github.io/pultrix/ 에 반영돼요.

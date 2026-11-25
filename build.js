// src/ → index.html (GitHub Pages가 바로 쓰는 한 파일)
//   node build.js          만들기
//   node build.js --check  index.html이 src와 같은지만 확인 (다르면 실패)
// src/index.html의 '@@include 파일' 줄이 그 파일 내용으로 바뀌어요.
// '@@include game'은 src/game/ORDER에 적힌 순서대로 이어 붙인 것 (하나의 module 스크립트라 순서가 중요해요).
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, 'src'), OUT = path.join(__dirname, 'index.html');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const strip = s => s.replace(/\n$/, ''); // 파일 끝 줄바꿈 한 개는 빼고 붙임
const part = name => name === 'game'
  ? read('game/ORDER').split('\n').filter(Boolean).map(f => strip(read(f))).join('\n')
  : strip(read(name));
const html = read('index.html').split('\n').map(l => { const m = l.match(/^@@include (.+)$/); return m ? part(m[1].trim()) : l; }).join('\n');
if (process.argv.includes('--check')) {
  const same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === html;
  console.log(same ? 'index.html = src ✔' : 'index.html이 src와 달라요 → node build.js');
  process.exit(same ? 0 : 1);
}
fs.writeFileSync(OUT, html);
console.log('index.html 만들었어요', html.split('\n').length, '줄');

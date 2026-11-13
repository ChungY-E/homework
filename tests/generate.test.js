'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/generate.js');

const INPUT = { goal: '시험 공부를 시작하고 싶어', duration: 30, difficulty: 'NORMAL', energy: 'MEDIUM' };
const QUEST = {
  quest_title: '지식의 탑을 정복하라!',
  quest_story: '책을 펼치고 첫 관문을 시작해 보자!',
  difficulty: 'NORMAL',
  total_minutes: 30,
  missions: [
    { title: '책 펴기', description: '필기도구와 교재를 꺼낸다.', minutes: 3 },
    { title: '개념 정리', description: '핵심 개념을 세 개 적는다.', minutes: 10 },
    { title: '문제 풀이', description: '연습 문제를 두 개 푼다.', minutes: 12 },
    { title: '보스전', description: '오답을 복습한다.', minutes: 5 }
  ],
  completion_message: '오늘의 목표를 달성했어요!'
};

function request(body = INPUT, { method = 'POST', headers = {}, raw = false } = {}) {
  const content = raw ? body : JSON.stringify(body);
  return {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: content
  };
}
function response() {
  return {
    statusCode: 200, headers: {}, body: null,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
  };
}
function googleResponse(quest = QUEST) {
  return {
    ok: true,
    status: 200,
    async json() { return { candidates: [{ content: { parts: [{ text: JSON.stringify(quest) }] }, finishReason: 'STOP' }] }; }
  };
}
async function call(req) {
  const res = response();
  await handler(req, res);
  return res;
}

test('정상 요청: 응답 구조 검증, 서버 키 헤더, 모델 및 json 모드', async (t) => {
  process.env.GEMINI_API_KEY = 'not-a-real-key';
  delete process.env.ACCESS_CODE;
  let outbound;
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => { outbound = { url, options }; return googleResponse(); };
  t.after(() => { global.fetch = originalFetch; });

  const res = await call(request());
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, QUEST);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.match(outbound.url, /gemini-3\.5-flash-lite:generateContent$/);
  assert.equal(outbound.options.headers['x-goog-api-key'], 'not-a-real-key');
  const requestBody = JSON.parse(outbound.options.body);
  assert.equal(requestBody.generationConfig.responseMimeType, 'application/json');
  assert.equal(requestBody.contents[0].parts[0].text.includes(INPUT.goal), true);
});

test('POST 이외에는 405와 Allow 헤더', async () => {
  const res = await call(request(INPUT, { method: 'GET' }));
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'POST');
});

test('API 키가 없으면 서버 설정 오류', async () => {
  const backup = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const res = await call(request());
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.code, 'CONFIG_ERROR');
  if (backup) process.env.GEMINI_API_KEY = backup;
});

test('접속 코드가 없거나 틀리면 401, 맞으면 정상 응답', async (t) => {
  process.env.GEMINI_API_KEY = 'not-a-real-key';
  process.env.ACCESS_CODE = 'lecture-example';
  t.after(() => { delete process.env.ACCESS_CODE; });
  const missing = await call(request());
  assert.equal(missing.statusCode, 401);
  assert.equal(missing.body.code, 'ACCESS_CODE_REQUIRED');
  const bad = await call(request(INPUT, { headers: { 'x-access-code': 'wrong' } }));
  assert.equal(bad.statusCode, 401);
  const originalFetch = global.fetch;
  global.fetch = async () => googleResponse();
  t.after(() => { global.fetch = originalFetch; });
  const good = await call(request(INPUT, { headers: { 'x-access-code': 'lecture-example' } }));
  assert.equal(good.statusCode, 200);
});

test('잘못된 Content-Type, 너무 큰 본문, 잘못된 JSON을 각각 거절', async () => {
  process.env.GEMINI_API_KEY = 'not-a-real-key';
  delete process.env.ACCESS_CODE;
  assert.equal((await call(request(INPUT, { headers: { 'content-type': 'text/plain' } }))).statusCode, 415);
  assert.equal((await call(request(INPUT, { headers: { 'content-length': '9000' } }))).statusCode, 413);
  assert.equal((await call(request({ goal: 'a'.repeat(9000) }))).statusCode, 413);
  assert.equal((await call(request('{invalid-json}', { raw: true }))).statusCode, 400);
});

test('목표 길이와 옵션은 서버에서 독립적으로 검증', async () => {
  assert.equal((await call(request({ ...INPUT, goal: '시험' }))).statusCode, 400);
  assert.equal((await call(request({ ...INPUT, duration: 15 }))).statusCode, 400);
  assert.equal((await call(request({ ...INPUT, difficulty: 'SUPER' }))).statusCode, 400);
  assert.equal((await call(request({ ...INPUT, energy: 'UNKNOWN' }))).statusCode, 400);
});

test('Gemini 429와 안전 차단을 안전한 사용자 오류로 변환', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => ({ ok: false, status: 429 });
  assert.equal((await call(request())).statusCode, 429);
  global.fetch = async () => ({ ok: true, status: 200, async json() { return { promptFeedback: { blockReason: 'SAFETY' } }; } });
  assert.equal((await call(request())).statusCode, 422);
});

test('미션 개수, 시간 합계, 문자열 타입 이상 응답은 502', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  for (const badQuest of [
    { ...QUEST, missions: QUEST.missions.slice(0, 3) },
    { ...QUEST, missions: QUEST.missions.map((m) => ({ ...m, minutes: 10 })) },
    { ...QUEST, quest_title: 123 },
    { ...QUEST, difficulty: 'EASY' }
  ]) {
    global.fetch = async () => googleResponse(badQuest);
    const res = await call(request());
    assert.equal(res.statusCode, 502);
    assert.equal(res.body.code, 'INVALID_AI_RESPONSE');
  }
});

test('Gemini 시간 초과는 504, 기타 fetch 오류는 502', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => { const error = new Error('No network'); error.name = 'TimeoutError'; throw error; };
  assert.equal((await call(request())).statusCode, 504);
  global.fetch = async () => { throw new Error('Some sensitive error'); };
  const res = await call(request());
  assert.equal(res.statusCode, 502);
  assert.doesNotMatch(JSON.stringify(res.body), /sensitive/);
});

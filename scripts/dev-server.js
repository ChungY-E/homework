'use strict';

// npm 패키지 설치 없이 로컬에서 정적 페이지와 API를 모두 실행하는 개발 서버.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env.local');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envPath);
}

const handler = require(path.join(root, 'api/generate.js'));
const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml']
};
const port = Number(process.env.PORT || 3000);

http.createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://localhost:${port}`).pathname;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (pathname === '/api/generate') {
    res.status = function (status) { this.statusCode = status; return this; };
    res.json = function (data) {
      this.setHeader('Content-Type', 'application/json; charset=utf-8');
      this.end(JSON.stringify(data));
      return this;
    };
    await handler(req, res);
    return;
  }
  const file = files[pathname];
  if (!file || req.method !== 'GET') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }
  fs.readFile(path.join(root, 'public', file[0]), (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' });
    res.end(content);
  });
}).listen(port, () => {
  console.log(`QUEST MODE 로컬 서버: http://localhost:${port}`);
});

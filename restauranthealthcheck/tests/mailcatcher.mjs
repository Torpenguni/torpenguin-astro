import http from 'node:http';
import fs from 'node:fs';
const box = [];
http.createServer((req, res) => {
  let b = '';
  req.on('data', (c) => (b += c));
  req.on('end', () => {
    try { box.push(JSON.parse(b)); fs.writeFileSync(new URL('./mailbox.json', import.meta.url), JSON.stringify(box, null, 1)); } catch (e) {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 'test-' + box.length }));
  });
}).listen(8025, '127.0.0.1', () => console.log('mailcatcher on 8025'));

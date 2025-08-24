console.log('Starting server...');

const http = require('http');

const server = http.createServer((req, res) => {
  console.log('Received request for:', req.url);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'It works!', url: req.url }));
});

server.listen(5000, 'localhost', () => {
  console.log('✅ Server running at http://localhost:5000');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});
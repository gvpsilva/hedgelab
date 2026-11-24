const http = require('http');
const fs = require('fs');
const path = require('path');

const PASTA_PUBLICA = path.join(__dirname, '..', 'public');
const PORTA = Number(process.env.PORT) || 4173;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const servidor = http.createServer((requisicao, resposta) => {
  const caminhoUrl = decodeURIComponent(new URL(requisicao.url, 'http://localhost').pathname);
  const relativo = caminhoUrl === '/' ? 'index.html' : caminhoUrl.replace(/^\/+/, '');
  const arquivo = path.normalize(path.join(PASTA_PUBLICA, relativo));


  if (!arquivo.startsWith(PASTA_PUBLICA)) {
    resposta.writeHead(403).end('Acesso negado');
    return;
  }

  fs.readFile(arquivo, (erro, conteudo) => {
    if (erro) {
      resposta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Não encontrado');
      return;
    }
    const tipo = TIPOS[path.extname(arquivo)] || 'application/octet-stream';
    resposta.writeHead(200, { 'Content-Type': tipo }).end(conteudo);
  });
});

servidor.listen(PORTA, () => {
  console.log(`HedgeLab disponível em http://localhost:${PORTA}`);
});

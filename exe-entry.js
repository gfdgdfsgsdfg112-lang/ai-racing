const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 3000;

const isPackaged = typeof process.pkg !== 'undefined';
const baseDir = isPackaged ? path.dirname(process.execPath) : __dirname;
const srcDir = __dirname;

function findStaticDir() {
    if (fs.existsSync(path.join(baseDir, 'index.html'))) return baseDir;
    if (fs.existsSync(path.join(process.cwd(), 'index.html'))) return process.cwd();
    return srcDir;
}

const staticDir = findStaticDir();

const app = express();
app.use(express.static(staticDir));

app.get('/', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
});

function isPortFree(port) {
    return new Promise((r) => {
        const s = http.createServer();
        s.listen(port, '127.0.0.1', () => { s.close(() => r(true)); });
        s.on('error', () => r(false));
    });
}

async function findPort(start) {
    for (let i = 0; i < 10; i++) {
        if (await isPortFree(start + i)) return start + i;
    }
    return start;
}

async function main() {
    const port = await findPort(PORT);

    const server = app.listen(port, '127.0.0.1', () => {
        const url = 'http://localhost:' + port;
        console.log('');
        console.log('  AI Gonki');
        console.log('  --------');
        console.log('  Server: ' + url);
        console.log('  Press Ctrl+C to stop');
        console.log('');

        const cmd = process.platform === 'win32'
            ? 'start "" "' + url + '"'
            : process.platform === 'darwin'
                ? 'open "' + url + '"'
                : 'xdg-open "' + url + '"';

        setTimeout(() => exec(cmd), 300);
    });

    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.log('Port ' + port + ' busy, trying ' + (port + 1));
        }
    });

    process.on('SIGINT', () => { server.close(); process.exit(0); });
}

main();

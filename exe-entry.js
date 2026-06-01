/**
 * AI Гонки - Точка входа для EXE
 * Запускает HTTP сервер и открывает браузер
 */

const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 3000;

// Определяем базовую директорию
// В EXE (__dirname) указывает на виртуальную FS pkg
// При обычном запуске — на папку со скриптом
const isPackaged = typeof process.pkg !== 'undefined';
const baseDir = isPackaged ? path.dirname(process.execPath) : __dirname;
const srcDir = __dirname;

console.log('');
console.log('=================================');
console.log('   AI Gonki - Telegram Mini App');
console.log('=================================');
console.log('');

// Пытаемся найти index.html
function findIndexHtml() {
    // Попытка 1: рядом с exe (если статика скопирована)
    const localPath = path.join(baseDir, 'index.html');
    if (fs.existsSync(localPath)) return baseDir;

    // Попытка 2: в текущей директории
    const cwdPath = path.join(process.cwd(), 'index.html');
    if (fs.existsSync(cwdPath)) return process.cwd();

    // Попытка 3: в srcDir (pkg virtual fs)
    return srcDir;
}

const staticDir = findIndexHtml();

const app = express();
app.use(express.json());
app.use(express.static(staticDir));

app.get('/', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
});

function openBrowser(url) {
    const platform = process.platform;
    let cmd;

    if (platform === 'win32') {
        cmd = `start "" "${url}"`;
    } else if (platform === 'darwin') {
        cmd = `open "${url}"`;
    } else {
        cmd = `xdg-open "${url}"`;
    }

    exec(cmd, (err) => {
        if (err) {
            console.log('  Could not open browser automatically.');
            console.log('  Open manually: ' + url);
        }
    });
}

function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = http.createServer();
        server.listen(port, '127.0.0.1', () => {
            server.close(() => resolve(true));
        });
        server.on('error', () => resolve(false));
    });
}

async function findAvailablePort(startPort) {
    let port = startPort;
    for (let i = 0; i < 10; i++) {
        if (await isPortAvailable(port)) return port;
        port++;
    }
    return startPort;
}

async function main() {
    const availablePort = await findAvailablePort(PORT);

    const server = app.listen(availablePort, '127.0.0.1', () => {
        const url = `http://localhost:${availablePort}`;

        console.log('  Server started on port ' + availablePort);
        console.log('  Local address: ' + url);
        console.log('');
        console.log('  Opening browser...');
        console.log('');
        console.log('  Press Ctrl+C to stop.');
        console.log('');

        // Даём серверу 500мс стартовать, потом открываем браузер
        setTimeout(() => openBrowser(url), 500);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log('  Port ' + availablePort + ' is busy, trying ' + (availablePort + 1));
        } else {
            console.error('  Server error:', err.message);
        }
    });

    process.on('SIGINT', () => {
        console.log('\n  Stopping server...');
        server.close();
        process.exit(0);
    });

    // Для Windows: ловим закрытие окна консоли
    process.on('SIGHUP', () => {
        server.close();
        process.exit(0);
    });
}

main();

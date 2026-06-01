/**
 * AI Гонки - Локальный HTTPS сервер для Telegram Mini App
 * Использует самоподписанный сертификат или mkcert
 */

const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Конфигурация
const CONFIG = {
    PORT: process.env.PORT || 443,
    HTTP_PORT: process.env.HTTP_PORT || 80,
    BOT_TOKEN: process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE',
    WEBAPP_URL: process.env.WEBAPP_URL || '',
    HOST: process.env.HOST || '0.0.0.0'
};

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Импорт функций бота
const bot = require('./bot');

/**
 * Telegram API запрос
 */
function telegramAPI(method, params = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(params);
        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${CONFIG.BOT_TOKEN}/${method}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    if (result.ok) {
                        resolve(result.result);
                    } else {
                        reject(new Error(result.description));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

/**
 * Проверка подписи Telegram WebApp данных
 */
function validateWebAppData(initData) {
    try {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        params.delete('hash');
        
        const dataCheckString = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(CONFIG.BOT_TOKEN)
            .digest();
        
        const computedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        
        return computedHash === hash;
    } catch (e) {
        console.error('Ошибка валидации:', e);
        return false;
    }
}

// ==================== API ENDPOINTS ====================

app.get('/api/bot-info', (req, res) => {
    res.json({
        name: 'AI Гонки',
        description: 'Нейросети учатся проходить трассу',
        version: '1.0.0',
        webapp_url: CONFIG.WEBAPP_URL
    });
});

app.post(`/webhook/${CONFIG.BOT_TOKEN}`, async (req, res) => {
    try {
        const update = req.body;
        console.log('📩 Получено обновление');
        await bot.processUpdate(update);
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Ошибка обработки webhook:', error);
        res.sendStatus(500);
    }
});

app.post('/api/webapp-data', (req, res) => {
    const { initData, user, gameData } = req.body;
    
    if (initData && validateWebAppData(initData)) {
        console.log('✅ Валидные данные от:', user?.first_name);
        res.json({ success: true, user, message: 'Данные сохранены' });
    } else {
        res.status(400).json({ success: false, error: 'Невалидные данные' });
    }
});

app.post('/api/save-score', (req, res) => {
    const { initData, score, generation, trackName } = req.body;
    
    if (initData && validateWebAppData(initData)) {
        const params = new URLSearchParams(initData);
        const userStr = params.get('user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        console.log('🏆 Новый рекорд:', { user: user?.first_name, score, generation, trackName });
        res.json({ success: true, message: 'Рекорд сохранён!' });
    } else {
        res.status(400).json({ success: false, error: 'Ошибка валидации' });
    }
});

app.get('/api/leaderboard', (req, res) => {
    res.json({
        leaderboard: [
            { rank: 1, name: 'Чемпион', score: 35000, generation: 15 },
            { rank: 2, name: 'Профи', score: 32000, generation: 20 },
            { rank: 3, name: 'Новичок', score: 28000, generation: 30 }
        ]
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== ЗАПУСК СЕРВЕРА ====================

async function startServer() {
    // Проверяем наличие SSL сертификатов
    const keyPath = path.join(__dirname, 'ssl', 'key.pem');
    const certPath = path.join(__dirname, 'ssl', 'cert.pem');
    
    const hasSSL = fs.existsSync(keyPath) && fs.existsSync(certPath);
    
    if (hasSSL && CONFIG.BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
        // HTTPS сервер
        const sslOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
        
        https.createServer(sslOptions, app).listen(CONFIG.PORT, CONFIG.HOST, () => {
            console.log(`🔒 HTTPS сервер запущен на порту ${CONFIG.PORT}`);
            console.log(`📱 WebApp URL: ${CONFIG.WEBAPP_URL}`);
        });
        
        // HTTP -> HTTPS редирект
        http.createServer((req, res) => {
            res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
            res.end();
        }).listen(CONFIG.HTTP_PORT, CONFIG.HOST, () => {
            console.log(`🌐 HTTP редирект на порту ${CONFIG.HTTP_PORT}`);
        });
        
        // Инициализация бота
        try {
            await bot.initBot();
            const webhookUrl = `${CONFIG.WEBAPP_URL}/webhook/${CONFIG.BOT_TOKEN}`;
            await telegramAPI('setWebhook', { url: webhookUrl });
            console.log('🔗 Webhook установлен:', webhookUrl);
            
            await telegramAPI('setChatMenuButton', {
                menu_button: {
                    type: 'web_app',
                    text: '🏎️ Играть',
                    web_app: { url: CONFIG.WEBAPP_URL }
                }
            });
            console.log('✅ Menu Button установлен');
        } catch (error) {
            console.log('⚠️ Ошибка настройки бота:', error.message);
        }
        
    } else {
        // HTTP сервер (для локальной разработки)
        http.createServer(app).listen(3000, CONFIG.HOST, () => {
            console.log(`🌐 HTTP сервер запущен на порту 3000`);
            console.log(`📱 Локальный адрес: http://localhost:3000`);
            
            if (!hasSSL) {
                console.log('');
                console.log('📋 Для работы Telegram Mini App нужен HTTPS.');
                console.log('');
                console.log('🔧 Варианты настройки:');
                console.log('');
                console.log('1️⃣ Использовать localtunnel (рекомендуется):');
                console.log('   npm install -g localtunnel');
                console.log('   lt --port 3000');
                console.log('');
                console.log('2️⃣ Создать самоподписанный сертификат:');
                console.log('   node generate-cert.js');
                console.log('');
                console.log('3️⃣ Использовать mkcert:');
                console.log('   npm install -g mkcert');
                console.log('   mkcert create-ca');
                console.log('   mkcert create-cert --domains localhost');
            }
            
            if (CONFIG.BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
                console.log('');
                console.log('⚠️ BOT_TOKEN не установлен в .env файле');
                console.log('💡 Получите токен у @BotFather в Telegram');
            }
        });
    }
}

startServer();

module.exports = app;

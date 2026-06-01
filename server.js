/**
 * AI Гонки - Telegram Mini App Server
 * Полная интеграция с Telegram Bot API
 */

const express = require('express');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// Конфигурация
const CONFIG = {
    PORT: process.env.PORT || 3000,
    BOT_TOKEN: process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE',
    WEBAPP_URL: process.env.WEBAPP_URL || 'https://your-domain.com',
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

/**
 * Информация о боте
 */
app.get('/api/bot-info', (req, res) => {
    res.json({
        name: 'AI Гонки',
        description: 'Нейросети учатся проходить трассу',
        version: '1.0.0',
        webapp_url: CONFIG.WEBAPP_URL
    });
});

/**
 * Webhook для Telegram
 */
app.post(`/webhook/${CONFIG.BOT_TOKEN}`, async (req, res) => {
    try {
        const update = req.body;
        console.log('📩 Получено обновление:', JSON.stringify(update, null, 2));
        
        await bot.processUpdate(update);
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Ошибка обработки webhook:', error);
        res.sendStatus(500);
    }
});

/**
 * Данные от WebApp
 */
app.post('/api/webapp-data', (req, res) => {
    const { initData, user, gameData } = req.body;
    
    // Валидация данных
    if (initData && validateWebAppData(initData)) {
        console.log('✅ Валидные данные от:', user?.first_name);
        
        // Здесь можно сохранить в базу данных
        if (gameData) {
            console.log('📊 Игровые данные:', gameData);
        }
        
        res.json({ 
            success: true, 
            user,
            message: 'Данные сохранены'
        });
    } else {
        res.status(400).json({ 
            success: false, 
            error: 'Невалидные данные'
        });
    }
});

/**
 * Сохранение рекорда
 */
app.post('/api/save-score', (req, res) => {
    const { initData, score, generation, trackName } = req.body;
    
    if (initData && validateWebAppData(initData)) {
        // Парсим данные пользователя
        const params = new URLSearchParams(initData);
        const userStr = params.get('user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        console.log('🏆 Новый рекорд:', {
            user: user?.first_name,
            score,
            generation,
            trackName
        });
        
        res.json({ 
            success: true,
            message: 'Рекорд сохранён!'
        });
    } else {
        res.status(400).json({ 
            success: false, 
            error: 'Ошибка валидации'
        });
    }
});

/**
 * Таблица лидеров
 */
app.get('/api/leaderboard', (req, res) => {
    // В реальном проекте - из базы данных
    res.json({
        leaderboard: [
            { rank: 1, name: 'Чемпион', score: 35000, generation: 15 },
            { rank: 2, name: 'Профи', score: 32000, generation: 20 },
            { rank: 3, name: 'Новичок', score: 28000, generation: 30 }
        ]
    });
});

// ==================== СТАТИЧЕСКИЕ ФАЙЛЫ ====================

// Главная страница Mini App
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== ЗАПУСК СЕРВЕРА ====================

async function startServer() {
    // Запуск Express сервера
    app.listen(CONFIG.PORT, CONFIG.HOST, () => {
        console.log(`🏎️ AI Гонки Mini App запущен на порту ${CONFIG.PORT}`);
        console.log(`📱 Локальный адрес: http://localhost:${CONFIG.PORT}`);
        console.log(`🌐 WebApp URL: ${CONFIG.WEBAPP_URL}`);
    });

    // Инициализация бота
    if (CONFIG.BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
        try {
            await bot.initBot();
            console.log('✅ Бот инициализирован');
            
            // Установка webhook
            const webhookUrl = `${CONFIG.WEBAPP_URL}/webhook/${CONFIG.BOT_TOKEN}`;
            await telegramAPI('setWebhook', { url: webhookUrl });
            console.log('🔗 Webhook установлен:', webhookUrl);
            
            // Установка Menu Button
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
        console.log('⚠️ BOT_TOKEN не установлен. Работаем в локальном режиме.');
        console.log('💡 Установите BOT_TOKEN в .env файле для полной интеграции с Telegram');
    }
}

startServer();

module.exports = app;

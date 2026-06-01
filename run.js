/**
 * AI Гонки - Единый скрипт запуска
 * Запускает сервер и создаёт публичный HTTPS туннель
 */

const express = require('express');
const path = require('path');
const localtunnel = require('localtunnel');

// Конфигурация
const PORT = parseInt(process.env.PORT) || 3000;

console.log('🏎️ AI Гонки - Telegram Mini App');
console.log('================================\n');

// Создаём Express приложение
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API endpoints
app.get('/api/bot-info', (req, res) => {
    res.json({
        name: 'AI Гонки',
        description: 'Нейросети учатся проходить трассу',
        version: '1.0.0'
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`✅ HTTP сервер запущен на порту ${PORT}`);
    console.log(`📱 Локальный адрес: http://localhost:${PORT}\n`);
    
    // Создаём туннель
    console.log('🔗 Создание публичного HTTPS туннеля...\n');
    
    try {
        const tunnel = await localtunnel({ port: PORT });
        
        console.log('✅ Туннель создан!');
        console.log('📱 Ваш публичный URL:', tunnel.url);
        console.log('');
        console.log('📋 Инструкция для Telegram:');
        console.log('1. Откройте @BotFather в Telegram');
        console.log('2. Отправьте /newbot и создайте бота');
        console.log('3. Отправьте /newapp и создайте Mini App');
        console.log(`4. Укажите URL: ${tunnel.url}`);
        console.log('5. Сохраните токен бота и добавьте в .env');
        console.log('');
        console.log('⏳ Сервер работает. Нажмите Ctrl+C для остановки.');
        
        tunnel.on('close', () => {
            console.log('🔌 Туннель закрыт');
        });
        
        tunnel.on('error', (err) => {
            console.error('❌ Ошибка туннеля:', err.message);
        });
        
    } catch (error) {
        console.error('❌ Ошибка создания туннеля:', error.message);
        console.log('');
        console.log('💡 Сервер работает локально на http://localhost:' + PORT);
    }
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Порт ${PORT} занят. Попробуйте другой порт:`);
        console.error(`   set PORT=3003 && node run.js`);
    } else {
        console.error('❌ Ошибка сервера:', err.message);
    }
    process.exit(1);
});

// Обработка завершения
process.on('SIGINT', () => {
    console.log('\n👋 Остановка сервера...');
    server.close();
    process.exit(0);
});

/**
 * AI Гонки - Запуск с LocalTunnel
 * Публичный HTTPS доступ с вашего ПК
 */

const { spawn } = require('child_process');
const path = require('path');

const PORT = 3000;

console.log('🏎️ AI Гонки - Запуск Telegram Mini App');
console.log('========================================\n');

// Запуск HTTP сервера
console.log('🌐 Запуск HTTP сервера на порту', PORT);

const server = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: String(PORT) }
});

server.on('error', (err) => {
    console.error('❌ Ошибка запуска сервера:', err);
});

// Ждём запуска сервера
setTimeout(() => {
    console.log('\n🔗 Создание HTTPS туннеля...\n');
    
    // Запуск localtunnel
    const lt = spawn('npx', ['localtunnel', '--port', String(PORT)], {
        cwd: __dirname,
        shell: true
    });
    
    lt.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output);
        
        // Ищем URL в выводе
        const urlMatch = output.match(/https:\/\/[^\s]+/);
        if (urlMatch) {
            const tunnelUrl = urlMatch[0];
            console.log('\n✅ Туннель создан!');
            console.log('📱 Ваш WebApp URL:', tunnelUrl);
            console.log('');
            console.log('📋 Инструкция:');
            console.log('1. Создайте бота у @BotFather: /newbot');
            console.log('2. Создайте Mini App: /newapp');
            console.log(`3. Укажите URL: ${tunnelUrl}`);
            console.log('4. Добавьте токен в .env файл');
            console.log('5. Перезапустите сервер');
            console.log('');
            console.log('⏳ Туннель активен. Нажмите Ctrl+C для остановки.');
        }
    });
    
    lt.stderr.on('data', (data) => {
        const err = data.toString();
        if (err.includes('your url is')) {
            const urlMatch = err.match(/https:\/\/[^\s]+/);
            if (urlMatch) {
                const tunnelUrl = urlMatch[0];
                console.log('\n✅ Туннель создан!');
                console.log('📱 Ваш WebApp URL:', tunnelUrl);
                console.log('');
                console.log('📋 Инструкция:');
                console.log('1. Создайте бота у @BotFather: /newbot');
                console.log('2. Создайте Mini App: /newapp');
                console.log(`3. Укажите URL: ${tunnelUrl}`);
                console.log('');
                console.log('⏳ Туннель активен. Нажмите Ctrl+C для остановки.');
            }
        } else {
            console.error('⚠️ LocalTunnel:', err);
        }
    });
    
    lt.on('error', (err) => {
        console.error('❌ Ошибка localtunnel:', err.message);
    });
    
    lt.on('close', () => {
        console.log('🔌 Туннель закрыт');
    });
    
}, 3000);

// Обработка завершения
process.on('SIGINT', () => {
    console.log('\n👋 Остановка сервера...');
    server.kill();
    process.exit(0);
});

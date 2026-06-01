/**
 * AI Гонки - Telegram Bot
 * Обработка команд и управление Mini App
 */

const https = require('https');
const crypto = require('crypto');

// Конфигурация
const CONFIG = {
    BOT_TOKEN: process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE',
    WEBAPP_URL: process.env.WEBAPP_URL || 'https://your-domain.com'
};

/**
 * Отправка запроса к Telegram Bot API
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
function validateWebAppData(initData, botToken) {
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
            .update(botToken)
            .digest();
        
        const computedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        
        return computedHash === hash;
    } catch (e) {
        return false;
    }
}

/**
 * Инициализация бота
 */
async function initBot() {
    try {
        // Установка команд бота
        await telegramAPI('setMyCommands', {
            commands: [
                { command: 'start', description: '🚀 Запустить AI Гонки' },
                { command: 'play', description: '🏎️ Начать гонку' },
                { command: 'help', description: '📖 Помощь и инструкции' },
                { command: 'about', description: 'ℹ️ О проекте' },
                { command: 'stats', description: '📊 Моя статистика' }
            ]
        });
        console.log('✅ Команды бота установлены');

        // Установка описания бота
        await telegramAPI('setMyDescription', {
            description: '🏎️ AI Гонки - Наблюдай как нейросети учатся проходить трассу!\n\n' +
                        '🧠 Самописная нейронная сеть\n' +
                        '🧬 Генетический алгоритм обучения\n' +
                        '🗺️ 5 различных трасс\n' +
                        '🏆 Соревновательный режим'
        });
        console.log('✅ Описание бота установлено');

        // Установка короткого описания
        await telegramAPI('setMyShortDescription', {
            short_description: 'AI Гонки - Нейросети обучаются гонкам'
        });
        console.log('✅ Короткое описание установлено');

        return true;
    } catch (error) {
        console.error('❌ Ошибка инициализации бота:', error.message);
        return false;
    }
}

/**
 * Обработка команды /start
 */
async function handleStart(chatId, firstName) {
    const keyboard = {
        inline_keyboard: [
            [{
                text: '🏎️ Играть в AI Гонки',
                web_app: { url: CONFIG.WEBAPP_URL }
            }],
            [{
                text: '📖 Помощь',
                callback_data: 'help'
            }, {
                text: 'ℹ️ О проекте',
                callback_data: 'about'
            }]
        ]
    };

    const text = `🏎️ *Добро пожаловать в AI Гонки, ${firstName}!*

Нейросети учатся проходить трассу без столкновений!

🧠 *Как это работает:*
• Каждая машина управляется нейросетью
• Лучшие машины передают свои "гены"
• Каждое поколение становится умнее

🎯 *Цель:* Пройти 1 полный круг по трассе

Нажми кнопку ниже, чтобы начать!`;

    await telegramAPI('sendMessage', {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
}

/**
 * Обработка команды /play
 */
async function handlePlay(chatId) {
    const keyboard = {
        inline_keyboard: [
            [{
                text: '🏎️ Открыть AI Гонки',
                web_app: { url: CONFIG.WEBAPP_URL }
            }]
        ]
    };

    await telegramAPI('sendMessage', {
        chat_id: chatId,
        text: '🏎️ *Выбери трассу и начни гонку!*\n\nНейросети готовы к обучению.',
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
}

/**
 * Обработка команды /help
 */
async function handleHelp(chatId) {
    const text = `📖 *Справка по AI Гонкам*

🎮 *Управление:*
• ⏸ Пауза - остановить/продолжить симуляцию
• 🔄 Сброс - начать обучение заново
• Скорость 1x-10x - ускорение симуляции

🧬 *Настройки:*
• *Популяция* - количество машин (10-100)
• *Мутация* - уровень изменений (5-50%)
• *Метод обучения* - алгоритм эволюции

🗺️ *Трассы:*
• Овал - простая трасса для новичков
• Кольцо - классическая трасса
• Зигзаг - резкие повороты
• Восьмёрка - пересечение в центре
• Сложная - множество поворотов

🧠 *Нейросеть:*
• 8 входов (сенсоры расстояния)
• 2 скрытых слоя по 10 нейронов
• 2 выхода (газ и поворот)

⌨️ *Горячие клавиши:*
• Пробел - пауза/старт
• R - сброс`;

    await telegramAPI('sendMessage', {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
    });
}

/**
 * Обработка команды /about
 */
async function handleAbout(chatId) {
    const text = `ℹ️ *О проекте AI Гонки*

🧠 *Технологии:*
• Самописная нейронная сеть (без библиотек)
• Генетический алгоритм обучения
• 4 метода мутации и отбора

🧬 *Методы обучения:*
• Адаптивная мутация
• Видообразование (NEAT-like)
• CMA-ES
• Стандартный генетический алгоритм

📊 *Система оценки:*
• +2 очка за каждый кадр жизни
• +0.5 за единицу расстояния
• +50 × средняя скорость
• +30000 за финиш круга

👨‍💻 *Разработчик:* QWEN-DCM
📦 *Версия:* 1.0.0`;

    await telegramAPI('sendMessage', {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
    });
}

/**
 * Обработка команды /stats
 */
async function handleStats(chatId, userId) {
    // В реальном проекте здесь была бы база данных
    const text = `📊 *Твоя статистика*

👤 ID: \`${userId}\`

🏆 *Достижения:*
• Лучший результат: будет сохранён
• Пройденных кругов: 0
• Всего поколений: 0

💡 *Совет:* Чем больше играешь, тем умнее становятся нейросети!`;

    await telegramAPI('sendMessage', {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
    });
}

/**
 * Обработка callback queries
 */
async function handleCallback(callbackQuery) {
    const { id, data, message, from } = callbackQuery;
    
    try {
        if (data === 'help') {
            await handleHelp(message.chat.id);
        } else if (data === 'about') {
            await handleAbout(message.chat.id);
        } else if (data === 'play') {
            await handlePlay(message.chat.id);
        }
        
        await telegramAPI('answerCallbackQuery', {
            callback_query_id: id
        });
    } catch (error) {
        console.error('Ошибка обработки callback:', error);
    }
}

/**
 * Главная функция обработки обновлений
 */
async function processUpdate(update) {
    if (update.message) {
        const { chat, from, text } = update.message;
        
        if (text?.startsWith('/start')) {
            await handleStart(chat.id, from.first_name);
        } else if (text === '/play') {
            await handlePlay(chat.id);
        } else if (text === '/help') {
            await handleHelp(chat.id);
        } else if (text === '/about') {
            await handleAbout(chat.id);
        } else if (text === '/stats') {
            await handleStats(chat.id, from.id);
        }
    } else if (update.callback_query) {
        await handleCallback(update.callback_query);
    }
}

// Экспорт функций
module.exports = {
    initBot,
    telegramAPI,
    validateWebAppData,
    processUpdate,
    handleStart,
    handlePlay,
    handleHelp,
    handleAbout,
    handleStats
};

// Если запущен напрямую
if (require.main === module) {
    console.log('🤖 Инициализация Telegram бота...');
    initBot().then(success => {
        if (success) {
            console.log('✅ Бот готов к работе!');
            console.log('📱 Установите webhook для получения обновлений');
        }
    });
}

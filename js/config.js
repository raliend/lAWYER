// Конфигурация для работы с Telegram Bot

let TELEGRAM_CONFIG = {};

// Проверяем доступность переменных окружения
if (typeof process !== 'undefined' && process.env) {
  // Node.js окружение (для сборки)
  TELEGRAM_CONFIG = {
    BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    CHAT_IDS: [process.env.TELEGRAM_CHAT_ID_1, process.env.TELEGRAM_CHAT_ID_2].filter(Boolean)
  };
} 
}

// Экспортируем конфигурацию
window.TELEGRAM_CONFIG = TELEGRAM_CONFIG;

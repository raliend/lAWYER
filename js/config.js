// Production конфигурация для использования с Vercel прокси
window.TELEGRAM_CONFIG = {
  // URL Vercel прокси (замените на ваш реальный URL)
  PROXY_URL: 'https://vite-react-mocha-five-92.vercel.app',
  
  // Настройки безопасности
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/tiff'],
  
  // Rate limiting
  RATE_LIMIT: {
    requests: 5,
    window: 60000 // 1 минута
  }
};

// Rate limiting функционал
let requestHistory = [];

function checkRateLimit() {
  const now = Date.now();
  requestHistory = requestHistory.filter(time => now - time < window.TELEGRAM_CONFIG.RATE_LIMIT.window);
  
  if (requestHistory.length >= window.TELEGRAM_CONFIG.RATE_LIMIT.requests) {
    throw new Error('Превышен лимит запросов. Попробуйте позже.');
  }
  
  requestHistory.push(now);
  return true;
}

window.checkRateLimit = checkRateLimit;
Object.freeze(window.TELEGRAM_CONFIG);

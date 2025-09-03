// Получаем конфигурацию
const { PROXY_URL, MAX_FILE_SIZE, ALLOWED_TYPES } = window.TELEGRAM_CONFIG;

// Mobile menu toggle
function toggleMenu() {
  const nav = document.getElementById('nav-menu');
  nav.classList.toggle('active');
}

// FAQ Toggle
function toggleFaq(el) {
  const answer = el.nextElementSibling;
  const active = answer.classList.contains('show');
  
  document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('show'));
  
  if (!active) {
    answer.classList.add('show');
  }
}

// Contact Form submission
async function submitContactForm(event) {
  event.preventDefault();
  
  const form = event.target;
  const button = form.querySelector('button[type="submit"]');
  const originalText = button.innerHTML;
  
  if (!validateForm(form)) {
    return;
  }
  
  // Rate limiting check
  try {
    window.checkRateLimit();
  } catch (error) {
    showMessage(error.message, 'error');
    return;
  }
  
  button.innerHTML = '<span class="loading"></span> Отправка...';
  button.disabled = true;
  
  try {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    const message = formatContactMessage(data);
    
    // Отправляем через Vercel прокси
    await sendToTelegramProxy(message, 'contact');
    
    showMessage('Спасибо! Ваша заявка отправлена. Юрий свяжется с вами в ближайшее время.', 'success');
    form.reset();
    
  } catch (error) {
    console.error('Ошибка отправки:', error);
    showMessage('Произошла ошибка при отправке заявки. Попробуйте позже или свяжитесь по телефону.', 'error');
  }
  
  button.innerHTML = originalText;
  button.disabled = false;
}

// Отправка сообщений через Vercel прокси
async function sendToTelegramProxy(message, type = 'message') {
  const response = await fetch(`${PROXY_URL}/api/send-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Site-Origin': window.location.origin
    },
    body: JSON.stringify({
      message: message,
      type: type
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

// Отправка документов через Vercel прокси  
async function sendDocumentToTelegramProxy(file, metadata, caption) {
  // Конвертируем файл в base64
  const fileData = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const response = await fetch(`${PROXY_URL}/api/send-document`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Site-Origin': window.location.origin
    },
    body: JSON.stringify({
      fileData: fileData,
      fileName: file.name,
      fileType: file.type,
      caption: caption,
      metadata: metadata
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

// Валидация формы
function validateForm(form) {
  const name = form.name.value.trim();
  const phone = form.phone.value.trim();
  const comment = form.comment.value.trim();
  
  if (name.length < 2) {
    showMessage('Имя должно содержать минимум 2 символа.', 'error');
    return false;
  }
  
  if (phone.length < 10) {
    showMessage('Введите корректный номер телефона.', 'error');
    return false;
  }
  
  if (comment.length < 10) {
    showMessage('Описание ситуации должно содержать минимум 10 символов.', 'error');
    return false;
  }
  
  return true;
}

// Форматирование сообщения
function formatContactMessage(data) {
  const timestamp = new Date().toLocaleString('ru-RU');
  
  let message = `📝 <b>Новая заявка с сайта Intelektis</b>\n\n`;
  message += `👤 <b>Имя:</b> ${data.name}\n`;
  message += `📞 <b>Телефон:</b> ${data.phone}\n`;
  
  if (data.email) {
    message += `📧 <b>Email:</b> ${data.email}\n`;
  }
  
  message += `💬 <b>Сообщение:</b>\n${data.comment}\n\n`;
  message += `🕐 <b>Время:</b> ${timestamp}\n`;
  message += `🌐 <b>Источник:</b> Сайт Intelektis`;
  
  return message;
}

// EXIF Analyzer Functions
function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}

// Обработка файлов
function processFile(file) {
  // Проверка типа файла
  if (!ALLOWED_TYPES.includes(file.type)) {
    showMessage('Поддерживаются только JPEG и TIFF файлы.', 'error');
    return;
  }

  // Проверка размера файла
  if (file.size > MAX_FILE_SIZE) {
    showMessage('Размер файла не должен превышать 10 МБ.', 'error');
    return;
  }

  // Rate limiting check
  try {
    window.checkRateLimit();
  } catch (error) {
    showMessage(error.message, 'error');
    return;
  }

  showMessage('Анализируем метаданные...', 'warning');

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      displayImagePreview(this, file.name);
      extractAllMetadata(this, file);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function displayImagePreview(img, fileName) {
  const container = document.getElementById('image-container');
  container.innerHTML = `
    <h5 style="margin-bottom: 12px; color: var(--main-color);">
      <i class="fa-solid fa-image"></i> ${fileName}
    </h5>
    <img src="${img.src}" alt="Preview" class="image-preview">
  `;
}

// Извлечение всех метаданных
function extractAllMetadata(img, file) {
  EXIF.getData(img, function() {
    const allMetaData = EXIF.getAllTags(this);
    const exifContainer = document.getElementById('exif-data');
    const resultsContainer = document.getElementById('exif-results');
    
    const metadata = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: new Date(file.lastModified).toLocaleString('ru-RU'),
      ...allMetaData
    };

    // Создаем сообщение для Telegram
    let telegramMessage = `🔍 <b>Анализ метаданных фотографии</b>\n\n`;
    telegramMessage += `📁 <b>Файл:</b> ${file.name}\n`;
    telegramMessage += `📏 <b>Размер:</b> ${(file.size / 1024 / 1024).toFixed(2)} МБ\n`;
    telegramMessage += `🗂 <b>Тип:</b> ${file.type}\n`;
    telegramMessage += `⏰ <b>Изменён:</b> ${new Date(file.lastModified).toLocaleString('ru-RU')}\n\n`;

    if (Object.keys(allMetaData).length === 0) {
      telegramMessage += `⚠️ EXIF-данные отсутствуют или были удалены`;
      exifContainer.innerHTML = `
        <div class="message warning">
          <i class="fa-solid fa-exclamation-triangle"></i>
          EXIF-данные не найдены или были удалены из этого файла.
        </div>
      `;
    } else {
      let html = '';
      
      // Полный список метаданных
      const allFields = {
        'Make': 'Производитель камеры',
        'Model': 'Модель камеры',
        'DateTime': 'Дата создания',
        'DateTimeOriginal': 'Дата съёмки',
        'Artist': 'Автор',
        'Copyright': 'Авторские права',
        'FNumber': 'Диафрагма',
        'ExposureTime': 'Выдержка',
        'ISOSpeedRatings': 'ISO',
        'FocalLength': 'Фокусное расстояние',
        'GPSLatitude': 'GPS Широта',
        'GPSLongitude': 'GPS Долгота'
      };

      telegramMessage += `📋 <b>Извлеченные метаданные:</b>\n`;
      
      Object.entries(allFields).forEach(([key, label]) => {
        if (metadata[key] !== undefined && metadata[key] !== null) {
          let value = metadata[key];
          
          // Форматируем значения
          if (key === 'ExposureTime' && typeof value === 'number') {
            value = value < 1 ? `1/${Math.round(1/value)} сек` : `${value} сек`;
          } else if (key === 'FNumber' && typeof value === 'number') {
            value = `f/${value}`;
          } else if (key === 'FocalLength' && typeof value === 'number') {
            value = `${value}мм`;
          }
          
          telegramMessage += `• <b>${label}:</b> ${value}\n`;
          
          html += `
            <div class="exif-item">
              <div class="exif-label">${label}:</div>
              <div class="exif-value">${value}</div>
            </div>
          `;
        }
      });

      html += `
        <div class="exif-item">
          <div class="exif-label">Размер файла:</div>
          <div class="exif-value">${(file.size / 1024 / 1024).toFixed(2)} МБ</div>
        </div>
      `;

      if (html === '') {
        html = `
          <div class="message warning">
            <i class="fa-solid fa-info-circle"></i>
            Основные метаданные отсутствуют.
          </div>
        `;
        telegramMessage += '\n⚠️ Основные EXIF-данные отсутствуют';
      } else {
        html = `
          <div class="message success" style="margin-bottom: 16px;">
            <i class="fa-solid fa-check-circle"></i>
            Метаданные успешно извлечены и отправлены юристу для анализа!
          </div>
        ` + html;
      }

      exifContainer.innerHTML = html;
    }
    
    // Отправляем в Telegram через прокси
    Promise.all([
      sendToTelegramProxy(telegramMessage, 'exif'),
      sendDocumentToTelegramProxy(file, metadata, telegramMessage)
    ]).then(() => {
      console.log('EXIF data and file sent successfully');
    }).catch(error => {
      console.error('Error sending EXIF data:', error);
    });
    
    resultsContainer.style.display = 'block';
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    clearMessages();
  });
}

function showMessage(text, type) {
  clearMessages();
  
  const message = document.createElement('div');
  message.className = `message ${type}`;
  message.innerHTML = text;
  
  let targetElement = document.querySelector('.upload-area');
  if (!targetElement) {
    targetElement = document.querySelector('#contact-form');
  }
  
  if (targetElement) {
    targetElement.parentNode.insertBefore(message, targetElement.nextSibling);
  }
  
  if (type === 'success' || type === 'error') {
    setTimeout(clearMessages, 5000);
  }
}

function clearMessages() {
  const messages = document.querySelectorAll('.message');
  messages.forEach(msg => {
    if (!msg.closest('#exif-results')) {
      msg.remove();
    }
  });
}

// Остальной код (плавная прокрутка, анимации) остается таким же...
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      const nav = document.getElementById('nav-menu');
      nav.classList.remove('active');
    }
  });
});

document.addEventListener('click', function(e) {
  const nav = document.getElementById('nav-menu');
  const toggle = document.querySelector('.menu-toggle');
  
  if (!nav.contains(e.target) && !toggle.contains(e.target)) {
    nav.classList.remove('active');
  }
});

const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

document.querySelectorAll('.service-card, .benefit-item, .audience-item, .review-card, .step-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});

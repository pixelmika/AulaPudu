/**
 * ============================================================================
 * UTILS - FUNCIONES DE UTILIDAD
 * ============================================================================
 * Clase con funciones auxiliares y helpers para toda la aplicación.
 */

class Utils {
  /**
   * Escapa caracteres HTML peligrosos para prevenir XSS
   * @param {string} str - String a escapar
   * @returns {string} String escapado
   */
  escapeHtml(str) {
    if (!str) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };
    return String(str).replace(/[&<>"'`=\/]/g, s => map[s]);
  }

  /**
   * Genera un ID único aleatorio
   * @returns {string} ID único
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Formatea un timestamp a formato legible
   * @param {number} timestamp - Timestamp en milisegundos
   * @returns {string} Fecha formateada
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Valida un email
   * @param {string} email - Email a validar
   * @returns {boolean} True si es válido
   */
  isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Convierte bytes a formato legible
   * @param {number} bytes - Tamaño en bytes
   * @returns {string} Tamaño formateado
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Debounce function para optimizar eventos repetitivos
   * @param {Function} func - Función a ejecutar
   * @param {number} wait - Tiempo de espera en ms
   * @returns {Function} Función debounced
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Muestra una notificación toast
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo: 'success', 'error', 'info', 'warning'
   */
  showToast(message, type = 'info') {
    // Por ahora usamos alert, pero puedes implementar un toast más elegante
    const emoji = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };
    console.log(`${emoji[type]} ${message}`);
    // Aquí podrías implementar un sistema de notificaciones más sofisticado
  }

  /**
   * Copia texto al portapapeles
   * @param {string} text - Texto a copiar
   * @returns {Promise<boolean>} True si se copió exitosamente
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Error copiando al portapapeles:', err);
      return false;
    }
  }

  /**
   * Valida el tipo de archivo
   * @param {File} file - Archivo a validar
   * @param {Array<string>} allowedTypes - Tipos permitidos
   * @returns {boolean} True si es válido
   */
  isValidFileType(file, allowedTypes) {
    const extension = file.name.split('.').pop().toLowerCase();
    return allowedTypes.includes(extension);
  }

  /**
   * Valida el tamaño del archivo
   * @param {File} file - Archivo a validar
   * @param {number} maxSizeMB - Tamaño máximo en MB
   * @returns {boolean} True si es válido
   */
  isValidFileSize(file, maxSizeMB) {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxBytes;
  }

  /**
   * Genera un código de sesión aleatorio
   * @returns {string} Código de sesión
   */
  generateSessionCode() {
    const num = Math.floor(10000 + Math.random() * 90000);
    return `${CONFIG.SESSION_PREFIX}${num}`;
  }

  /**
   * Formatea segundos a HH:MM:SS
   * @param {number} seconds - Segundos
   * @returns {string} Tiempo formateado
   */
  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /**
   * Detecta si estamos en móvil
   * @returns {boolean} True si es móvil
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Logger mejorado con colores y contexto
   * @param {string} level - Nivel: 'info', 'warn', 'error', 'success'
   * @param {string} context - Contexto del log
   * @param {*} message - Mensaje a loggear
   */
  log(level, context, ...message) {
    const emoji = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅'
    };
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console[level === 'error' ? 'error' : 'log'](
      `[${timestamp}] ${emoji[level]} [${context}]`,
      ...message
    );
  }
}

// Crear instancia global
window.Utils = Utils;
console.log('✅ Utils.js cargado');
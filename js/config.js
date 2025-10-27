/**
 * ============================================================================
 * CONFIGURACIÓN GLOBAL - AULAPUDU
 * ============================================================================
 * Archivo de configuración centralizado para toda la aplicación.
 * IMPORTANTE: Reemplaza estos valores con tu configuración real de Supabase.
 */

const CONFIG = {
  // Configuración de Supabase
  SUPABASE_URL: "https://gxgbtnmqdghixfaamsad.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4Z2J0bm1xZGdoaXhmYWFtc2FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNzAzMjgsImV4cCI6MjA3NDg0NjMyOH0.0dMTZONs7EDqWPFOV9M3gCUJKjdMBt9xdlLuQk13Jao",
  
  // Nombre del bucket de Storage (debe ser público)
  STORAGE_BUCKET: 'presentations',
  
  // Configuración de la aplicación
  APP_NAME: 'AulaPudu',
  VERSION: '1.0.0',
  
  // Configuración de sesiones
  SESSION_PREFIX: 'AULAPUDU-',
  
  // Configuración de PDF
  PDF_SCALE_DEFAULT: 1.5,
  
  // Tipos de archivo soportados
  SUPPORTED_PRESENTATION_TYPES: ['pdf', 'ppt', 'pptx', 'docx'],
  SUPPORTED_MATERIAL_TYPES: ['pdf', 'docx', 'pptx', 'jpg', 'jpeg', 'png'],
  
  // Configuración de Realtime
  REALTIME_CHANNEL_PREFIX: 'realtime:',
  
  // Límites
  MAX_FILE_SIZE_MB: 50,
  MAX_SPECTATORS: 500,
  
  // Tipos de preguntas
  QUESTION_TYPES: {
    MULTIPLE_CHOICE: 'multiple-choice',
    TRUE_FALSE: 'true-false',
    OPEN_ENDED: 'open-ended'
  },
  
  // Tipos de reacciones
  REACTION_TYPES: ['love', 'clap', 'question', 'thumbsup', 'thumbsdown']
};

// Validar configuración al cargar
(function validateConfig() {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    console.error('❌ Error: Configuración de Supabase incompleta');
    console.warn('Por favor, edita js/config.js con tus credenciales de Supabase');
  } else {
    console.log('✅ Configuración cargada correctamente');
  }
})();
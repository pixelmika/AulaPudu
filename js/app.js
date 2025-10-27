/**
 * ============================================================================
 * APP.JS - PUNTO DE ENTRADA PRINCIPAL
 * ============================================================================
 * Orquestador principal de la aplicación AulaPudu.
 * Inicializa todos los managers y coordina la comunicación entre ellos.
 */

class App {
  constructor() {
    console.log('🚀 Inicializando AulaPudu...');

    // Validar dependencias
    if (!this.validateDependencies()) {
      return;
    }

    // Configuración de Supabase
    this.SUPABASE_URL = CONFIG.SUPABASE_URL;
    this.SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY;
    this.STORAGE_BUCKET = CONFIG.STORAGE_BUCKET;

    // Inicializar cliente Supabase
    try {
      this.supa = supabase.createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
      console.log('✅ Supabase inicializado');
    } catch (error) {
      console.error('❌ Error inicializando Supabase:', error);
      alert('Error crítico: No se pudo conectar con Supabase. Verifica tu configuración.');
      return;
    }

    // Estado global
    this.isPresenter = false;

    // Inicializar utilidades primero
    this.utils = new Utils();

    // Inicializar managers en orden
    this.auth = new AuthManager(this);
    this.session = new SessionManager(this);
    this.content = new ContentManager(this);
    this.questions = new QuestionManager(this);
    this.exams = new ExamManager(this); // Nuevo manager de exámenes
    this.examPlayer = new ExamPlayer(this); // Nuevo player de exámenes
    this.examResultsViewer = new ExamResultsViewer(this); // Nuevo visor de resultados
    this.creator = new PresentationCreator(this); // Nuevo creador de presentaciones
    this.ui = new UIManager(this);

    console.log('✅ Todos los managers inicializados');
  }

  /**
   * Valida que todas las dependencias necesarias estén disponibles
   * @returns {boolean}
   */
  validateDependencies() {
    const dependencies = [
      { name: 'Supabase', check: () => typeof supabase !== 'undefined' },
      { name: 'PDF.js', check: () => typeof pdfjsLib !== 'undefined' },
      { name: 'CONFIG', check: () => typeof CONFIG !== 'undefined' }
    ];

    let allValid = true;

    dependencies.forEach(dep => {
      if (!dep.check()) {
        console.error(`❌ Dependencia faltante: ${dep.name}`);
        allValid = false;
      }
    });

    if (!allValid) {
      alert('Error crítico: Faltan dependencias necesarias. Revisa la consola.');
    }

    return allValid;
  }

  /**
   * Inicializa la aplicación
   */
  async init() {
  try {
    console.log('🔄 Inicializando aplicación...');

    // Verificar sesión de autenticación existente
    const hasSession = await this.auth.checkSession();

    // Verificar si hay un sessionId en la URL (deep link)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');
    const examJoinCode = urlParams.get('exam_join');

    if (sessionId) {
      // Espectador de presentación llega desde QR
      document.getElementById('session-id-input').value = sessionId;
      this.ui.showPage('spectator-join');
      console.log('📱 Deep link de presentación detectado:', sessionId);
    } else if (examJoinCode) {
      // Alumno de examen llega desde enlace
      document.getElementById('exam-code-input').value = examJoinCode;
      this.ui.showPage('exam-join');
      console.log('📝 Deep link de examen detectado:', examJoinCode);
    } else if (hasSession) {
      // Usuario autenticado - ir al dashboard
      this.ui.showPage('presenter-dashboard');
      console.log('✅ Sesión de usuario restaurada');
    } else {
      // Sin sesión - mostrar SOLO el landing
      this.ui.showPage('landing');
      console.log('🏠 Mostrando página de inicio');
    }

    console.log('✅ Aplicación inicializada correctamente');

  } catch (error) {
    console.error('❌ Error inicializando app:', error);
    // En caso de error, mostrar el landing
    this.ui.showPage('landing');
  }
}

  /**
   * Maneja errores globales de la aplicación
   * @param {Error} error - Error capturado
   * @param {string} context - Contexto del error
   */
  handleGlobalError(error, context = 'App') {
    console.error(`[${context}] Error:`, error);
    this.utils.log('error', context, error);
    
    // Mostrar mensaje al usuario
    if (this.ui) {
      this.ui.handleError(error, context);
    } else {
      alert(`Error en ${context}: ${error.message}`);
    }
  }

  /**
   * Limpia y reinicia la aplicación
   */
  async reset() {
    console.log('🔄 Reiniciando aplicación...');
    
    try {
      await this.session.cleanup();
      await this.auth.logout();
      this.ui.resetAllForms();
      this.ui.showPage('landing');
      
      console.log('✅ Aplicación reiniciada');
    } catch (error) {
      this.handleGlobalError(error, 'Reset');
    }
  }

  /**
   * Obtiene información del estado de la aplicación (debug)
   * @returns {Object}
   */
  getAppState() {
    return {
      version: CONFIG.VERSION,
      currentPage: this.ui.getCurrentPage(),
      isPresenter: this.isPresenter,
      isAuthenticated: this.auth.isAuthenticated(),
      currentUser: this.auth.currentUser?.email || null,
      activeSession: this.session.currentSessionCode || null,
      activePresentation: this.content.currentPresentation || null,
      realtimeConnected: !!this.session.rt.chan,
      spectatorCount: Object.keys(this.session.rt.liveSpectators).length
    };
  }

  /**
   * Muestra información de debug en consola
   */
  debug() {
    const state = this.getAppState();
    console.table(state);
    return state;
  }
}

// ============================================================================
// INICIALIZACIÓN GLOBAL
// ============================================================================

let app;

/**
 * Inicializa la aplicación cuando el DOM está listo
 */
window.addEventListener('DOMContentLoaded', () => {
  console.log('🌟 DOM cargado');
  
  try {
    // Crear instancia global de la aplicación
    app = new App();
    
    // Exponer globalmente para acceso desde onclick
    window.app = app;
    
    // Inicializar
    app.init();
    
    // Exponer función de debug
    window.debugApp = () => app.debug();
    
    console.log('✅ AulaPudu listo para usar');
    console.log('💡 Tip: Usa debugApp() en consola para ver el estado de la app');
    
  } catch (error) {
    console.error('❌ Error crítico al inicializar:', error);
    alert('Error crítico al iniciar la aplicación. Revisa la consola para más detalles.');
  }
});

/**
 * Maneja errores globales no capturados
 */
window.addEventListener('error', (event) => {
  console.error('❌ Error global no capturado:', event.error);
  if (app) {
    app.handleGlobalError(event.error, 'Global');
  }
});

/**
 * Maneja promesas rechazadas no capturadas
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promise rechazada no capturada:', event.reason);
  if (app) {
    app.handleGlobalError(new Error(event.reason), 'Promise');
  }
});

/**
 * Limpia recursos antes de cerrar/recargar la página
 */
window.addEventListener('beforeunload', () => {
  if (app && app.session) {
    app.session.cleanup();
  }
});

document.addEventListener('keydown', (e) => {
  // Solo en la interfaz de espectador
  const spectatorInterface = document.getElementById('spectator-interface');
  if (!spectatorInterface || spectatorInterface.style.display === 'none') return;
  
  // H: Ocultar/Mostrar controles
  if (e.key === 'h' || e.key === 'H') {
    if (app && app.session) {
      app.session.toggleSpectatorControls();
    }
  }
  
  // F: Pantalla completa
  if (e.key === 'f' || e.key === 'F') {
    if (app && app.session) {
      app.session.toggleFullscreen();
    }
  }
});

console.log('✅ app.js cargado');
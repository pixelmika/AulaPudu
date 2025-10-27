/**
 * ============================================================================
 * UI MANAGER - GESTIÓN DE INTERFAZ Y NAVEGACIÓN
 * ============================================================================
 * Maneja todo lo relacionado con la interfaz de usuario:
 * - Navegación entre páginas
 * - Toggle de formularios
 * - Actualización de contenido del dashboard
 * - Gestión de estados visuales
 */

class UIManager {
  constructor(app) {
    this.app = app;
    this.pageIds = [
      'landing',
      'presenter-login',
      'presenter-dashboard',
      'spectator-join',
      'spectator-interface',
      'exam-join',
      'exam-player',
      'exam-results' // Nueva página
    ];
      this.currentPage = 'landing';
      this.app.utils.log('info', 'UIManager', 'Inicializado');
      }
    
      toggleExamCreator(forceHide = false) {
        const creatorCard = document.getElementById('exam-creator-card');
        const toggleBtn = document.getElementById('show-exam-creator-btn');
        if (!creatorCard || !toggleBtn) return;
    
        const isVisible = creatorCard.style.display !== 'none';
        if (forceHide || isVisible) {
          creatorCard.style.display = 'none';
          toggleBtn.textContent = '+ Crear Nuevo Examen';
        } else {
          creatorCard.style.display = 'block';
          toggleBtn.textContent = 'Cerrar Creador de Examen';
        }
      }
  /**
   * Muestra una página específica y oculta las demás
   * @param {string} pageId - ID de la página a mostrar
   */
 /**
 * Muestra una página específica y oculta las demás
 * @param {string} pageId - ID de la página a mostrar
 */
showPage(pageId) {
    this.app.utils.log('info', 'UIManager', 'Navegando a:', pageId);

    const landingPage = document.getElementById('landing');
    const appShell = document.getElementById('app');
    const header = document.querySelector('.site-header');

    // Limpiar clases de página anteriores del body
    this.pageIds.forEach(id => {
        document.body.classList.remove('page-' + id);
    });

    // Ocultar todas las páginas internas primero
    this.pageIds.forEach(id => {
        if (id !== 'landing') {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        }
    });

    if (pageId === 'landing') {
        if (landingPage) landingPage.style.display = 'flex';
        if (appShell) appShell.style.display = 'none';
        
        document.body.classList.add('app-landing');
        document.body.classList.remove('app-internal');

        this.app.isPresenter = false;
        this.app.session.cleanup();

    } else {
        if (landingPage) landingPage.style.display = 'none';
        if (appShell) appShell.style.display = 'block';
        
        document.body.classList.remove('app-landing');
        document.body.classList.add('app-internal');

        let finalPageId = pageId;
        if (pageId === 'presenter-dashboard' && !this.app.auth.currentUser) {
            finalPageId = 'presenter-login';
            this.app.utils.log('warn', 'UIManager', 'Usuario no autenticado, redirigiendo a login');
        }

        document.body.classList.add('page-' + finalPageId);

        const targetPage = document.getElementById(finalPageId);
        if (targetPage) {
            let displayStyle = 'block';
            if (['presenter-dashboard', 'presenter-login', 'spectator-join'].includes(finalPageId)) {
                displayStyle = 'flex';
            }
            targetPage.style.display = displayStyle;
        }

        if (finalPageId === 'presenter-dashboard') {
            this.app.isPresenter = true;
            this.initPresenterDashboard();
        } else {
            this.app.isPresenter = false;
        }
        this.currentPage = finalPageId;
    }

    if (pageId === 'landing') {
        this.currentPage = 'landing';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

  /**
 * Inicializa el dashboard del presentador
 */
initPresenterDashboard() {
  // Cargar contenido inicial
  this.app.questions.loadSavedQuestions();
  this.app.content.loadPresentationsListUI();
  this.showPresenterContent('overview');

  // Inicializar estado del sidebar
  this.initSidebarState();

  // Restaurar QR si hay sesión activa
  if (this.app.session.currentSessionCode) {
    this.app.session.generateQrCode(this.app.session.currentSessionCode);
  }

  this.app.utils.log('info', 'UIManager', 'Dashboard inicializado');
}

// En UIManager.js - Añadir después de initPresenterDashboard()
initTimerUI() {
  const timerSection = document.querySelector('.timer-section');
  if (!timerSection) return;

  // Crear elementos del timer si no existen
  if (!document.getElementById('timer-progress-bar')) {
    const timerDisplay = document.getElementById('timer-display');
    const progressBar = document.createElement('div');
    progressBar.id = 'timer-progress-bar';
    progressBar.style.cssText = `
      width: 100%; height: 8px; background: #eee; 
      border-radius: 4px; margin-top: 10px; overflow: hidden;
    `;
    
    const progressFill = document.createElement('div');
    progressFill.id = 'timer-progress-fill';
    progressFill.style.cssText = `
      height: 100%; background: linear-gradient(90deg, #88c1b2, #f5cf66);
      width: 100%; transition: width 0.3s ease;
    `;
    
    progressBar.appendChild(progressFill);
    timerDisplay.parentElement.appendChild(progressBar);
  }
}

  /**
   * Alterna entre formulario de login y registro
   */
  toggleAuthForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authTitle = document.getElementById('auth-title');
    
    const isLogin = loginForm.style.display !== 'none';

    loginForm.style.display = isLogin ? 'none' : 'block';
    registerForm.style.display = isLogin ? 'block' : 'none';
    authTitle.textContent = isLogin ? 'Registro de Presentador' : 'Inicio de Presentador';

    // Limpiar mensajes de error
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
    document.getElementById('register-success').textContent = '';

    this.app.utils.log('info', 'UIManager', 'Formulario alternado:', isLogin ? 'Registro' : 'Login');
  }

  /**
   * Muestra una sección específica del dashboard del presentador
   * @param {string} contentId - ID del contenido a mostrar
   */
  showPresenterContent(contentId) {
    const mainContentDiv = document.querySelector('#presenter-dashboard .main-content');
    if (!mainContentDiv) return;

    // Ocultar todo el contenido
    mainContentDiv.querySelectorAll(':scope > div').forEach(div => {
      div.style.display = 'none';
    });

    // Mostrar contenido seleccionado
    const target = document.getElementById('presenter-' + contentId + '-content');
    if (target) {
      target.style.display = 'block';
    } else {
      console.error(`Contenido no encontrado: presenter-${contentId}-content`);
      return;
    }

    // Actualizar sidebar activo
    document.querySelectorAll('.sidebar ul li a').forEach(a => {
      a.classList.remove('active');
    });
    
    const match = document.querySelector(`.sidebar ul li a[onclick*="${contentId}"]`);
    if (match) {
      match.classList.add('active');
    }

    // Inicializar contenido específico
    this.initPresenterContentSection(contentId);

    this.app.utils.log('info', 'UIManager', 'Contenido mostrado:', contentId);
  }

  /**
   * Inicializa una sección específica del dashboard
   * @param {string} contentId - ID del contenido
   */
  initPresenterContentSection(contentId) {
    switch (contentId) {
      case 'live-session':
        this.app.content.updateLiveUI();
        break;
      
      case 'spectator-management':
        this.app.session.updateSpectatorList();
        break;
      
      case 'presentations':
        this.app.content.loadPresentationsListUI();
        break;
      
      case 'questions':
        this.app.questions.loadSavedQuestions();
        break;

      case 'exams':
        this.app.exams.loadExams();
        break;

      case 'creator':
        this.app.creator.init();
        break;
    }
  }

  /**
   * Muestra el sistema de modales con un título y contenido HTML.
   * @param {string} title - El título a mostrar en el modal.
   * @param {string} htmlContent - El contenido HTML para el cuerpo del modal.
   */
  showModal(title, htmlContent) {
    const modalContainer = document.getElementById('modal-container');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    if (!modalContainer || !modalTitle || !modalBody) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = htmlContent;
    modalContainer.style.display = 'flex';
  }

  /**
   * Oculta el sistema de modales.
   */
  hideModal() {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
      modalContainer.style.display = 'none';
    }
  }

  /**
   * Muestra una notificación toast
   * @param {string} message - Mensaje
   * @param {string} type - Tipo: 'success', 'error', 'info', 'warning'
   */
  showNotification(message, type = 'info') {
    this.app.utils.showToast(message, type);
  }

  /**
   * Actualiza el estado de carga de un elemento
   * @param {string} elementId - ID del elemento
   * @param {boolean} isLoading - Estado de carga
   * @param {string} message - Mensaje opcional
   */
  setLoading(elementId, isLoading, message = 'Cargando...') {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (isLoading) {
      element.disabled = true;
      element.dataset.originalText = element.textContent;
      element.textContent = message;
    } else {
      element.disabled = false;
      element.textContent = element.dataset.originalText || element.textContent;
    }
  }

  /**
   * Actualiza el indicador de conexión Realtime
   * @param {boolean} isConnected - Estado de conexión
   */
  updateRealtimeStatus(isConnected) {
    // Implementación futura de indicador visual de Realtime
    this.app.utils.log('info', 'UIManager', 'Realtime status:', isConnected ? 'Conectado' : 'Desconectado');
  }

  /**
   * Actualiza el título de la página
   * @param {string} title - Nuevo título
   */
  updatePageTitle(title) {
    document.title = title ? `${title} - ${CONFIG.APP_NAME}` : CONFIG.APP_NAME;
  }

  /**
   * Maneja errores de UI de forma centralizada
   * @param {Error} error - Error a manejar
   * @param {string} context - Contexto del error
   */
  handleError(error, context = 'UI') {
    console.error(`[${context}]`, error);
    this.showNotification(
      `Error en ${context}: ${error.message || 'Error desconocido'}`,
      'error'
    );
    this.app.utils.log('error', context, error);
  }

  /**
   * Resetea todos los formularios de la página
   */
  resetAllForms() {
    document.querySelectorAll('form').forEach(form => {
      form.reset();
    });
    this.app.utils.log('info', 'UIManager', 'Formularios reseteados');
  }

  /**
   * Habilita/deshabilita modo oscuro (función futura)
   */
  toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    this.app.utils.log('info', 'UIManager', 'Dark mode:', isDark ? 'ON' : 'OFF');
  }

  /**
   * Obtiene la página actual
   * @returns {string} ID de la página actual
   */
  getCurrentPage() {
    return this.currentPage;
  }

  /**
   * Verifica si estamos en móvil y ajusta la UI
   */
  checkMobileView() {
    if (this.app.utils.isMobile()) {
      document.body.classList.add('mobile-view');
      this.app.utils.log('info', 'UIManager', 'Vista móvil detectada');
    } else {
      document.body.classList.remove('mobile-view');
    }
  }

  /**
   * Añade animaciones suaves a elementos
   * @param {string} elementId - ID del elemento
   * @param {string} animation - Clase de animación CSS
   */
  animateElement(elementId, animation = 'fade-in') {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.classList.add(animation);
    
    // Remover clase después de la animación
    setTimeout(() => {
      element.classList.remove(animation);
    }, 500);
  }

  /**
   * Copia texto al portapapeles y muestra feedback
   * @param {string} text - Texto a copiar
   */
  async copyToClipboardWithFeedback(text) {
    const success = await this.app.utils.copyToClipboard(text);
    
    if (success) {
      this.showNotification('Copiado al portapapeles', 'success');
    } else {
      this.showNotification('No se pudo copiar', 'error');
    }
  }
  /**
 * Alterna la barra lateral
 */
toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const toggleBtn = document.querySelector('.sidebar-toggle');
  
  if (sidebar) {
    sidebar.classList.toggle('collapsed');
    
    if (toggleBtn) {
      toggleBtn.textContent = sidebar.classList.contains('collapsed') ? '→' : '←';
    }
  }
}

/**
 * Inicializa el estado del sidebar
 */
initSidebarState() {
  const savedState = localStorage.getItem('sidebarCollapsed');
  const sidebar = document.querySelector('.sidebar');
  const toggleBtn = document.querySelector('.sidebar-toggle');
  
  if (sidebar && savedState === 'true') {
    sidebar.classList.add('collapsed');
    if (toggleBtn) toggleBtn.textContent = '→';
  }
}
}
  this.app.utils.log('info', 'UIManager', 'Sidebar state initialized');

console.log('✅ UIManager.js cargado');
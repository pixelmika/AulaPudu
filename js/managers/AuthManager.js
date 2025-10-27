/**
 * ============================================================================
 * AUTH MANAGER - GESTIÓN DE AUTENTICACIÓN
 * ============================================================================
 * Maneja todo lo relacionado con autenticación de usuarios:
 * - Login y registro
 * - Sesión persistente
 * - Logout
 * - Listeners de cambio de estado
 */

class AuthManager {
  constructor(app) {
    this.app = app;
    this.currentUser = null;
    this.setupAuthListener();
    this.app.utils.log('info', 'AuthManager', 'Inicializado');
  }

  /**
   * Configura el listener de cambios de autenticación
   */
  setupAuthListener() {
    this.app.supa.auth.onAuthStateChange(async (_event, session) => {
      this.currentUser = session?.user || null;
      
      // Si el usuario se desautentica y está en el dashboard
      if (!this.currentUser && this.app.isPresenter) {
        await this.app.session.cleanup();
        this.app.ui.showPage('landing');
        this.app.utils.log('info', 'AuthManager', 'Usuario desautenticado, redirigiendo a landing');
      }
    });
  }

  /**
   * Inicia sesión con email y contraseña
   */
  async login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorBox = document.getElementById('login-error');
    errorBox.textContent = '';

    // Validaciones básicas
    if (!email || !password) {
      errorBox.textContent = 'Por favor completa todos los campos.';
      return;
    }

    if (!this.app.utils.isValidEmail(email)) {
      errorBox.textContent = 'Por favor ingresa un email válido.';
      return;
    }

    try {
      this.app.utils.log('info', 'AuthManager', 'Intentando login para:', email);

      const { data, error } = await this.app.supa.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error) {
        errorBox.textContent = error.message || 'No se pudo iniciar sesión.';
        this.app.utils.log('error', 'AuthManager', 'Error login:', error);
        return;
      }

      this.currentUser = data.user || (await this.app.supa.auth.getUser()).data.user;
      
      if (!this.currentUser) {
        errorBox.textContent = 'No se pudo obtener el usuario.';
        return;
      }

      this.app.utils.log('success', 'AuthManager', 'Login exitoso:', this.currentUser.email);
      this.app.ui.showPage('presenter-dashboard');

      } catch (err) {
    console.error('Error crítico en login:', err);
    errorBox.textContent = 'Error de conexión. Intenta nuevamente.';
    this.app.utils.log('error', 'AuthManager', 'Error crítico:', err);
  }
}

  /**
   * Registra un nuevo usuario
   */
  async register() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errBox = document.getElementById('register-error');
    const okBox = document.getElementById('register-success');
    
    // Limpiar mensajes previos
    errBox.textContent = '';
    okBox.textContent = '';

    // Validaciones
    if (!name || !email || !password) {
      errBox.textContent = 'Por favor completa todos los campos.';
      return;
    }

    if (!this.app.utils.isValidEmail(email)) {
      errBox.textContent = 'Por favor ingresa un email válido.';
      return;
    }

    if (password.length < 6) {
      errBox.textContent = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    try {
      this.app.utils.log('info', 'AuthManager', 'Registrando usuario:', email);

      const { data, error } = await this.app.supa.auth.signUp({
        email,
        password,
        options: { 
          data: { name } 
        }
      });

      if (error) {
        errBox.textContent = error.message || 'No se pudo registrar.';
        this.app.utils.log('error', 'AuthManager', 'Error registro:', error);
        return;
      }

      // Mensaje de éxito
      if (data.user?.confirmed_at) {
        okBox.textContent = '✅ Registro exitoso. Ya puedes iniciar sesión.';
      } else {
        okBox.textContent = '✅ Registro exitoso. Revisa tu correo para confirmar la cuenta.';
      }

      this.app.utils.log('success', 'AuthManager', 'Usuario registrado:', email);

      // Limpiar formulario después de 3 segundos
      setTimeout(() => {
        document.getElementById('reg-name').value = '';
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-password').value = '';
      }, 3000);

    } catch (err) {
      errBox.textContent = err?.message || 'Error al registrar.';
      this.app.utils.log('error', 'AuthManager', 'Error crítico en registro:', err);
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  async logout() {
    try {
      await this.app.supa.auth.signOut();
      this.app.utils.log('success', 'AuthManager', 'Sesión cerrada');
    } catch (e) {
      this.app.utils.log('error', 'AuthManager', 'Error al cerrar sesión:', e);
    }

    this.currentUser = null;
    await this.app.session.cleanup();
    this.app.ui.showPage('landing');
  }

  /**
   * Verifica si hay un usuario autenticado
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.currentUser;
  }

  /**
   * Obtiene el nombre del usuario actual
   * @returns {string}
   */
  getCurrentUserName() {
    if (!this.currentUser) return 'Usuario';
    return this.currentUser.user_metadata?.name || this.currentUser.email?.split('@')[0] || 'Usuario';
  }

  /**
   * Verifica la sesión actual al iniciar la app
   */
  async checkSession() {
    try {
      const { data: { session } } = await this.app.supa.auth.getSession();
      if (session?.user) {
        this.currentUser = session.user;
        this.app.utils.log('success', 'AuthManager', 'Sesión recuperada:', this.currentUser.email);
        return true;
      }
      return false;
    } catch (e) {
      this.app.utils.log('error', 'AuthManager', 'Error verificando sesión:', e);
      return false;
    }
  }
}

console.log('✅ AuthManager.js cargado');
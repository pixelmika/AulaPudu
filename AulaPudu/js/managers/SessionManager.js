/**
 * ============================================================================
 * SESSION MANAGER - VERSIÓN MEJORADA
 * ============================================================================
 * Incluye: Timer mejorado, videos por enlace, modo presentación
 */

class SessionManager {
  constructor(app) {
    this.app = app;
    this.currentSessionCode = null;
    this.reactionCounts = { love: 0, clap: 0, question: 0, thumbsup: 0, thumbsdown: 0 };
    this.rt = { chan: null, sessionId: null, presenceKey: null, liveSpectators: {} };
    this.spectatorPdfDoc = null;
    
    // Timer mejorado
    this.timer = {
      interval: null,
      totalSeconds: 0,
      remainingSeconds: 0,
      isRunning: false,
      isPaused: false
    };
    
    this.app.utils.log('info', 'SessionManager', 'Inicializado');
    
  }

  // ========================================================================
  // TIMER MEJORADO
  // ========================================================================

  /**
   * Inicia el cronómetro con los valores de input
   */
  startTimer() {
    const hours = parseInt(document.getElementById('timer-hours').value) || 0;
    const minutes = parseInt(document.getElementById('timer-minutes').value) || 0;
    const seconds = parseInt(document.getElementById('timer-seconds').value) || 0;

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    if (totalSeconds <= 0) {
      alert('Por favor, ingresa un tiempo válido.');
      return;
    }

    // Si ya está corriendo, pausar
    if (this.timer.isRunning) {
      this.pauseTimer();
      return;
    }

    // Si está pausado, reanudar
    if (this.timer.isPaused) {
      this.resumeTimer();
      return;
    }

    // Iniciar nuevo timer
    this.timer.totalSeconds = totalSeconds;
    this.timer.remainingSeconds = totalSeconds;
    this.timer.isRunning = true;
    this.timer.isPaused = false;

    this.updateTimerButton('Pausar');
    this.updateTimerDisplay();
    this.updateTimerProgressBar();

    // Broadcast a espectadores
    this.broadcastTimer('start', totalSeconds);

    this.timer.interval = setInterval(() => {
      this.timer.remainingSeconds--;
      this.updateTimerDisplay();
      this.updateTimerProgressBar();

      // Broadcast cada 5 segundos
      if (this.timer.remainingSeconds % 5 === 0) {
        this.broadcastTimer('update', this.timer.remainingSeconds);
      }

      if (this.timer.remainingSeconds <= 0) {
        this.timerFinished();
      }
    }, 1000);

    this.app.utils.log('success', 'SessionManager', 'Timer iniciado:', totalSeconds, 'segundos');
  }

  /**
   * Pausa el timer
   */
  pauseTimer() {
    if (this.timer.interval) {
      clearInterval(this.timer.interval);
      this.timer.interval = null;
      this.timer.isRunning = false;
      this.timer.isPaused = true;
      this.updateTimerButton('Reanudar');
      this.broadcastTimer('pause', this.timer.remainingSeconds);
      this.app.utils.log('info', 'SessionManager', 'Timer pausado');
    }
  }

  /**
   * Reanuda el timer
   */
  resumeTimer() {
    this.timer.isRunning = true;
    this.timer.isPaused = false;
    this.updateTimerButton('Pausar');
    this.broadcastTimer('resume', this.timer.remainingSeconds);

    this.timer.interval = setInterval(() => {
      this.timer.remainingSeconds--;
      this.updateTimerDisplay();
      this.updateTimerProgressBar();

      if (this.timer.remainingSeconds % 5 === 0) {
        this.broadcastTimer('update', this.timer.remainingSeconds);
      }

      if (this.timer.remainingSeconds <= 0) {
        this.timerFinished();
      }
    }, 1000);

    this.app.utils.log('info', 'SessionManager', 'Timer reanudado');
  }

  /**
   * Reinicia el timer
   */
  resetTimer() {
    if (this.timer.interval) {
      clearInterval(this.timer.interval);
      this.timer.interval = null;
    }

    this.timer.totalSeconds = 0;
    this.timer.remainingSeconds = 0;
    this.timer.isRunning = false;
    this.timer.isPaused = false;

    document.getElementById('timer-hours').value = 0;
    document.getElementById('timer-minutes').value = 0;
    document.getElementById('timer-seconds').value = 0;
    document.getElementById('timer-display').textContent = '00:00:00';
    
    this.updateTimerButton('Iniciar');
    this.updateTimerProgressBar(0);
    this.broadcastTimer('reset', 0);

    // Reiniciar reacciones también
    this.reactionCounts = { love: 0, clap: 0, question: 0, thumbsup: 0, thumbsdown: 0 };
    this.updateReactionCounts();

    this.app.utils.log('info', 'SessionManager', 'Timer reiniciado');
  }

  /**
   * Se ejecuta cuando el timer termina
   */
  timerFinished() {
    clearInterval(this.timer.interval);
    this.timer.interval = null;
    this.timer.isRunning = false;
    this.timer.isPaused = false;

    document.getElementById('timer-display').textContent = '¡TIEMPO FINALIZADO!';
    document.getElementById('timer-display').style.animation = 'pulse 1s infinite';
    this.updateTimerButton('Iniciar');
    this.updateTimerProgressBar(0);

    this.broadcastTimer('finished', 0);

    // Sonido de alarma (opcional)
    this.playTimerAlarm();

    alert('⏰ ¡El tiempo ha terminado!');
    this.app.utils.log('success', 'SessionManager', 'Timer finalizado');
  }

  /**
   * Actualiza el display del timer
   */
  updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    const time = this.app.utils.formatTime(this.timer.remainingSeconds);
    display.textContent = time;
    display.style.animation = '';

    // Cambiar color en los últimos 10 segundos
    if (this.timer.remainingSeconds <= 10 && this.timer.remainingSeconds > 0) {
      display.style.color = '#e74c3c';
      display.style.animation = 'pulse 1s infinite';
    } else {
      display.style.color = '#d9534f';
    }
  }

  /**
   * Actualiza el botón del timer
   */
  updateTimerButton(text) {
    const btn = document.querySelector('.timer-section button:first-of-type');
    if (btn) btn.textContent = text;
  }

  /**
   * Actualiza la barra de progreso del timer
   */
  updateTimerProgressBar(percentage) {
    let progressBar = document.getElementById('timer-progress-bar');
    
    if (!progressBar) {
      // Crear barra de progreso si no existe
      const timerDisplay = document.getElementById('timer-display');
      progressBar = document.createElement('div');
      progressBar.id = 'timer-progress-bar';
      progressBar.style.cssText = `
        width: 100%;
        height: 8px;
        background: #eee;
        border-radius: 4px;
        margin-top: 10px;
        overflow: hidden;
      `;
      
      const progressFill = document.createElement('div');
      progressFill.id = 'timer-progress-fill';
      progressFill.style.cssText = `
        height: 100%;
        background: linear-gradient(90deg, #88c1b2, #f5cf66);
        width: 100%;
        transition: width 0.3s ease, background 0.3s ease;
      `;
      
      progressBar.appendChild(progressFill);
      timerDisplay.parentElement.appendChild(progressBar);
    }

    const fill = document.getElementById('timer-progress-fill');
    
    if (percentage !== undefined) {
      fill.style.width = percentage + '%';
    } else if (this.timer.totalSeconds > 0) {
      const percent = (this.timer.remainingSeconds / this.timer.totalSeconds) * 100;
      fill.style.width = percent + '%';
      
      // Cambiar color en los últimos segundos
      if (percent < 20) {
        fill.style.background = '#e74c3c';
      } else if (percent < 50) {
        fill.style.background = '#f39c12';
      } else {
        fill.style.background = 'linear-gradient(90deg, #88c1b2, #f5cf66)';
      }
    }
  }

  /**
   * Reproduce alarma cuando termina el timer
   */
  playTimerAlarm() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.warn('No se pudo reproducir alarma:', e);
    }
  }

  /**
   * Broadcast del estado del timer a espectadores
   */
  broadcastTimer(action, seconds) {
    if (this.rt.chan && this.rt.chan.send) {
      try {
        this.rt.chan.send({
          type: 'broadcast',
          event: 'timer',
          payload: { action, seconds, totalSeconds: this.timer.totalSeconds }
        });
        this.app.utils.log('info', 'SessionManager', 'Timer broadcast:', action);
      } catch (e) {
        console.warn('Error broadcast timer:', e);
      }
    }
  }

  // ========================================================================
  // VIDEOS POR ENLACE
  // ========================================================================

  /**
   * Solicita un enlace de video y lo presenta
   */
  // En SessionManager.js - Mejorar promptForVideo()
promptForVideo() {
  try {
    const videoUrl = prompt('Ingresa el enlace de YouTube o Vimeo:');
    if (!videoUrl?.trim()) return;

    // Validación más robusta
    if (!this.isValidVideoUrl(videoUrl)) {
      this.app.ui.showNotification('Enlace no válido. Usa YouTube o Vimeo.', 'error');
      return;
    }

    const embedUrl = this.getVideoEmbedUrl(videoUrl);
    if (!embedUrl) {
      this.app.ui.showNotification('No se pudo procesar el enlace.', 'error');
      return;
    }

    this.startVideoPresentation(embedUrl);
    this.app.ui.showNotification('Video cargado correctamente', 'success');
    
  } catch (error) {
    this.app.ui.handleError(error, 'Video');
  }
}

isValidVideoUrl(url) {
  const patterns = [
    /youtube\.com\/watch\?v=/,
    /youtu\.be\//,
    /vimeo\.com\//,
    /youtube\.com\/embed\//
  ];
  return patterns.some(pattern => pattern.test(url));
}
  // ========================================================================
  // MODO PRESENTACIÓN
  // ========================================================================

  /**
   * Abre la presentación en una nueva ventana (modo presentación)
   */
  openPresentationMode() {
    if (!this.currentSessionCode) {
      alert('Primero genera una sesión en vivo.');
      return;
    }

    const url = `${window.location.origin}${window.location.pathname}?session=${this.currentSessionCode}&mode=presentation`;
    const features = 'width=1280,height=720,toolbar=0,menubar=0,location=0';
    
    window.open(url, 'AulaPudu_Presentation', features);
    
    this.app.utils.log('info', 'SessionManager', 'Modo presentación abierto');
  }

  /**
   * Detecta si estamos en modo presentación
   */
  isPresentationMode() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('mode') === 'presentation';
  }

  // ========================================================================
  // RESTO DE MÉTODOS (igual que antes)
  // ========================================================================

  generateQrCode(code) {
    const qrImg = document.getElementById('qr-code-img');
    const joinUrl = `${window.location.origin}${window.location.pathname}?session=${code}`;
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}`;
    qrImg.style.display = 'block';
    this.app.utils.log('info', 'SessionManager', 'QR generado para:', code);
  }

  async generateNewSession() {
    const { data: { user }, error: userError } = await this.app.supa.auth.getUser();
    const userId = user?.id;

    if (userError || !userId) {
      alert('Error de autenticación. Inicia sesión nuevamente.');
      return;
    }

    const code = this.app.utils.generateSessionCode();
    this.currentSessionCode = code;

    try {
      this.generateQrCode(code);
      document.getElementById('session-id-display').textContent = code;

      const { error: insertError } = await this.app.supa
        .from('sessions')
        .insert([{ session_code: code, presenter_id: userId }]);

      if (insertError) {
        console.error('Error insertando sesión:', insertError);
        alert('Error: ' + insertError.message);
        this.currentSessionCode = null;
        return;
      }

      await this.initRealtime(this.currentSessionCode, { asPresenter: true });
      alert(`Sesión creada: ${code}`);
      this.app.utils.log('success', 'SessionManager', 'Sesión creada');
    } catch (err) {
      alert('Error: ' + (err?.message || err));
      this.app.utils.log('error', 'SessionManager', 'Error:', err);
    }
  }

  async deleteSessionGlobally() {
    if (!this.currentSessionCode) return alert('No hay sesión activa.');
    if (!this.app.auth.currentUser) return alert('Debes iniciar sesión.');

    if (!confirm(`¿Finalizar "${this.currentSessionCode}"?`)) return;

    try {
      if (this.rt.chan?.send) {
        this.rt.chan.send({ type: 'broadcast', event: 'session_delete', payload: { message: 'Sesión terminada.' } });
      }

      const { error } = await this.app.supa
        .from('sessions')
        .delete()
        .eq('session_code', this.currentSessionCode)
        .eq('presentor_uid', this.app.auth.currentUser.id);

      if (error) return alert('Error: ' + error.message);

      await this.cleanup();
      this.currentSessionCode = null;
      this.app.ui.showPage('presenter-dashboard');
      document.getElementById('session-id-display').textContent = '--';
      document.getElementById('qr-code-img').style.display = 'none';
      
      alert('Sesión finalizada.');
      this.app.utils.log('success', 'SessionManager', 'Sesión eliminada');
    } catch (err) {
      alert('Error crítico.');
      this.app.utils.log('error', 'SessionManager', err);
    }
  }

  endPresentation() {
    if (!this.app.content.currentPresentation) return alert('No hay presentación activa.');
    if (!confirm(`¿Finalizar "${this.app.content.currentPresentation}"?`)) return;

    this.app.content.currentPresentation = null;
    this.app.content.currentSlide = 1;
    this.app.content.totalSlides = 1;
    this.app.content.pdfDoc = null;
    this.app.content.currentFileUrl = null;
    this.app.content.fileType = null;
    this.spectatorPdfDoc = null;

    document.getElementById('current-presentation-text').textContent = 'No hay presentación activa.';
    document.getElementById('pdf-canvas').style.display = 'none';
    document.getElementById('current-slide-content').innerHTML = '<h3>Diapositiva 1</h3><p>Carga una presentación.</p>';
    document.getElementById('current-slide-content').style.display = 'block';
    this.app.content.updateLiveUI();

    if (this.rt.chan?.send) {
      try {
        this.rt.chan.send({ type: 'broadcast', event: 'presentation_end', payload: { title: '--' } });
      } catch (e) { }
    }

    alert('Presentación finalizada.');
  }

  async joinSession() {
    const sessionCode = document.getElementById('session-id-input').value.trim();
    const spectatorName = document.getElementById('spectator-name').value.trim();

    if (!sessionCode || !spectatorName) return alert('Ingresa ID y nombre.');
    if (!sessionCode.startsWith(CONFIG.SESSION_PREFIX)) return alert('ID no válido.');

    try {
      const { data, error } = await this.app.supa
        .from('sessions')
        .select('session_code')
        .eq('session_code', sessionCode)
        .maybeSingle();

      if (error || !data) return alert('Sesión no existe.');

      this.currentSessionCode = sessionCode;
      await this.initRealtime(sessionCode, { asSpectator: true, name: spectatorName });

      document.getElementById('spectator-presentation-title').textContent = "Sesión: " + sessionCode;
      this.app.ui.showPage('spectator-interface');
      this.app.utils.log('success', 'SessionManager', 'Espectador unido');
    } catch (err) {
      alert('Error: ' + (err?.message || err));
    }
  }

  leaveSession() {
    if (this.rt.chan) {
      alert("Has abandonado la sesión.");
      this.cleanup();
      this.app.ui.showPage('spectator-join');
    } else {
      this.app.ui.showPage('spectator-join');
    }
  }

  async initRealtime(sessionCode, opts = {}) {
    await this.cleanup();
    this.rt.sessionId = sessionCode;

    try {
      const topic = `${CONFIG.REALTIME_CHANNEL_PREFIX}${sessionCode}`;
      const name = opts.name || this.app.auth.getCurrentUserName();
      
      const chan = this.app.supa.channel(topic, {
        config: {
          broadcast: { ack: false },
          presence: { key: name }
        }
      });

      this.rt.chan = chan;

      if (opts.asPresenter) this.setupPresenterListeners(chan);
      if (opts.asSpectator) this.setupSpectatorListeners(chan);
      this.setupPresenceListeners(chan, opts);

      await chan.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this.rt.presenceKey = name;
          await chan.track({ name, type: opts.asPresenter ? 'presenter' : 'spectator' });
          
          if (opts.asSpectator) {
            chan.send({ type: 'broadcast', event: 'request_slide_sync', payload: { requestingSpectator: name } });
          }
        }
      });
    } catch (err) {
      console.warn('Realtime no disponible');
      this.rt.chan = { send: () => {}, untrack: () => Promise.resolve(), unsubscribe: () => Promise.resolve() };
    }
  }

  setupPresenterListeners(chan) {
    chan.on('broadcast', { event: 'reaction' }, (payload) => {
      const k = payload.payload.kind;
      this.reactionCounts[k] = (this.reactionCounts[k] || 0) + 1;
      this.updateReactionCounts();
    });

    chan.on('broadcast', { event: 'request_slide_sync' }, () => {
      if (this.app.content.currentPresentation) this.broadcastSlide();
    });
  }

  setupSpectatorListeners(chan) {
    chan.on('broadcast', { event: 'slide' }, this.handleSlideBroadcast.bind(this));
    chan.on('broadcast', { event: 'presentation_end' }, this.handlePresentationEnd.bind(this));
    chan.on('broadcast', { event: 'session_delete' }, this.handleSessionDelete.bind(this));
    chan.on('broadcast', { event: 'timer' }, this.handleTimerBroadcast.bind(this));
  }

  setupPresenceListeners(chan, opts) {
    chan.on('presence', { event: 'sync' }, () => {
      const state = chan.presenceState();
      this.rt.liveSpectators = {};
      Object.entries(state).forEach(([key, presences]) => {
        presences.forEach(p => {
          this.rt.liveSpectators[key] = { name: p.name, id: key, type: p.type || 'spectator' };
        });
      });
      if (opts.asPresenter) this.updateSpectatorList();
    });

    chan.on('presence', { event: 'join' }, ({ newPresences }) => {
      newPresences.forEach(p => {
        this.rt.liveSpectators[p.name] = { name: p.name, id: p.name, type: p.type || 'spectator' };
      });
      if (opts.asPresenter) this.updateSpectatorList();
    });

    chan.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      leftPresences.forEach(p => delete this.rt.liveSpectators[p.name]);
      if (opts.asPresenter) this.updateSpectatorList();
    });
  }

  async cleanup() {
    // Limpiar timer
    if (this.timer.interval) {
      clearInterval(this.timer.interval);
      this.timer.interval = null;
    }

    if (this.rt.chan?.unsubscribe) {
      try { this.rt.chan.untrack && await this.rt.chan.untrack(); } catch (e) { }
      try { await this.rt.chan.unsubscribe(); } catch (e) { }
    }
    
    this.rt = { chan: null, sessionId: null, presenceKey: null, liveSpectators: {} };
    this.spectatorPdfDoc = null;
    
    const el = document.getElementById('connected-spectators');
    if (el) el.textContent = '0 espectadores activos';
    
    this.updateSpectatorList();
  }

  broadcastSlide() {
    if (!this.rt.chan?.send) return;

    let payload = {};
    const content = this.app.content;

    if (content.activePresentationType === 'interactive' && content.interactivePresentationData) {
      const slideData = content.interactivePresentationData.slides[content.currentSlide - 1];
      payload = {
        type: 'interactive',
        slideContent: slideData ? slideData.content : [],
        currentSlide: content.currentSlide,
        totalSlides: content.totalSlides,
        presentationTitle: content.currentPresentation
      };
    } else if (content.activePresentationType === 'pdf') {
      payload = {
        type: 'pdf',
        currentSlide: content.currentSlide,
        totalSlides: content.totalSlides,
        presentationTitle: content.currentPresentation,
        fileUrl: content.currentFileUrl
      };
    } else {
      return; // No hay presentación activa para transmitir
    }

    try {
      this.rt.chan.send({ type: 'broadcast', event: 'slide', payload });
    } catch (e) {
      console.warn('Error al transmitir diapositiva:', e);
    }
  }

  async handleSlideBroadcast(payload) {
    const data = payload.payload;

    document.getElementById('spectator-presentation-title').textContent = data.presentationTitle;
    document.getElementById('spectator-slide-number').textContent = data.currentSlide;
    document.getElementById('spectator-total-slides').textContent = data.totalSlides;

    const placeholder = document.getElementById('spectator-current-slide-content');
    const canvas = document.getElementById('spectator-pdf-canvas');
    const interactiveContent = document.getElementById('spectator-non-pdf-content');

    // Ocultar todo por defecto
    canvas.style.display = 'none';
    placeholder.style.display = 'none';
    interactiveContent.style.display = 'none';

    switch (data.type) {
      case 'pdf':
        try {
          if (!this.spectatorPdfDoc || this.spectatorPdfDoc.loadingParams.url !== data.fileUrl) {
            this.spectatorPdfDoc = await pdfjsLib.getDocument(data.fileUrl).promise;
          }
          await this.app.content.renderPDFPage(data.currentSlide, 'spectator-pdf-canvas', this.spectatorPdfDoc);
        } catch (e) {
          interactiveContent.innerHTML = `<h3>⚠️ Error al cargar PDF</h3>`;
          interactiveContent.style.display = 'block';
        }
        break;

      case 'interactive':
        interactiveContent.innerHTML = ''; // Limpiar contenido anterior
        interactiveContent.style.position = 'relative'; // Necesario para los elementos absolutos
        interactiveContent.style.height = '100%';
        interactiveContent.style.width = '100%';

        if (data.slideContent && data.slideContent.length > 0) {
          data.slideContent.forEach(element => {
            const el = document.createElement('div');
            el.style.position = 'absolute';
            el.style.left = `${element.x}px`;
            el.style.top = `${element.y}px`;
            el.style.width = `${element.width}px`;
            el.style.height = `${element.height}px`;

            if (element.type === 'text') {
              el.style.fontSize = `${element.fontSize}px`;
              el.textContent = element.value;
            } else if (element.type === 'image') {
              el.innerHTML = `<img src="${element.src}" style="width:100%; height:100%; object-fit: cover;">`;
            }
            interactiveContent.appendChild(el);
          });
        }
        interactiveContent.style.display = 'block';
        break;

      default:
        placeholder.innerHTML = '<h3>Esperando contenido...</h3>';
        placeholder.style.display = 'block';
        break;
    }
  }

  handlePresentationEnd() {
    this.spectatorPdfDoc = null;
    document.getElementById('spectator-presentation-title').textContent = "Finalizada";
    document.getElementById('spectator-current-slide-content').innerHTML = '<h3>Finalizada</h3>';
    document.getElementById('spectator-current-slide-content').style.display = 'block';
    document.getElementById('spectator-pdf-canvas').style.display = 'none';
    document.getElementById('spectator-non-pdf-content').style.display = 'none';
  }

  handleSessionDelete() {
    alert('Sesión finalizada.');
    this.cleanup();
    this.app.ui.showPage('spectator-join');
  }

  /**
   * Maneja actualizaciones del timer para espectadores
   */
  handleTimerBroadcast(payload) {
    const { action, seconds, totalSeconds } = payload.payload;
    
    // Aquí podrías mostrar el timer en la vista del espectador
    // Por ahora solo lo loggeamos
    this.app.utils.log('info', 'SessionManager', 'Timer update:', action, seconds);
  }

  updateReactionCounts() {
    Object.keys(this.reactionCounts).forEach(k => {
      const el = document.getElementById(`count-${k}`);
      if (el) el.textContent = this.reactionCounts[k];
    });
  }

  sendReaction(kind) {
    if (!this.rt.chan) return alert('Únete a una sesión.');
    if (this.rt.chan?.send) {
      try {
        this.rt.chan.send({ type: 'broadcast', event: 'reaction', payload: { kind } });
      } catch (e) { }
    }
  }

  updateSpectatorList() {
    const list = document.getElementById('spectators-list');
    const countDisplay = document.getElementById('active-spectators');
    const connectedDisplay = document.getElementById('connected-spectators');
    
    if (!list || !countDisplay || !connectedDisplay) return;

    if (!this.currentSessionCode) {
      list.innerHTML = '<li>Inicia una sesión.</li>';
      countDisplay.textContent = '0';
      connectedDisplay.textContent = '0 espectadores';
      return;
    }

    const spectators = Object.values(this.rt.liveSpectators).filter(s => s.type !== 'presenter');
    list.innerHTML = '';
    const count = spectators.length;
    countDisplay.textContent = count;
    connectedDisplay.textContent = `${count} espectadores activos`;

    if (count === 0) {
      list.innerHTML = '<li>No hay espectadores.</li>';
      return;
    }

    spectators.forEach(s => {
      const item = document.createElement('li');
      item.style.cssText = 'display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eee;';
      item.innerHTML = `<span>👤 ${this.app.utils.escapeHtml(s.name)}</span>`;
      list.appendChild(item);
    });
  }

    /**
   * Toggle de controles del espectador
   */
  toggleSpectatorControls() {
    const controls = document.querySelector('.spectator-interactions-section');
    const button = document.getElementById('toggle-spectator-controls');
    const spectatorInterface = document.querySelector('.spectator-interface');
    
    if (!controls || !button) {
      this.app.utils.log('warn', 'SessionManager', 'Elementos de control no encontrados');
      return;
    }

    const isHidden = controls.classList.contains('hidden');
    
    if (isHidden) {
      // Mostrar controles
      this.showSpectatorControls(controls, button, spectatorInterface);
    } else {
      // Ocultar controles
      this.hideSpectatorControls(controls, button, spectatorInterface);
    }
    
    this.app.utils.log('info', 'SessionManager', 'Controles del espectador:', isHidden ? 'Mostrados' : 'Ocultados');
  }

  /**
   * Muestra los controles del espectador
   */
  showSpectatorControls(controls, button, spectatorInterface) {
    controls.classList.remove('hidden');
    spectatorInterface.classList.remove('theater-mode');
    button.textContent = '👁️ Ocultar Controles';
    button.title = 'Ocultar controles';
    
    // Remover indicador flotante
    const indicator = document.querySelector('.controls-hidden-indicator');
    if (indicator) indicator.remove();
  }

  /**
   * Oculta los controles del espectador
   */
  hideSpectatorControls(controls, button, spectatorInterface) {
    controls.classList.add('hidden');
    spectatorInterface.classList.add('theater-mode');
    button.textContent = '👁️ Mostrar Controles';
    button.title = 'Mostrar controles';
    
    // Agregar indicador flotante
    this.createFloatingIndicator();
  }

  /**
   * Crea un indicador flotante cuando los controles están ocultos
   */
  createFloatingIndicator() {
    // Verificar si ya existe
    if (document.querySelector('.controls-hidden-indicator')) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'controls-hidden-indicator';
    indicator.textContent = '👁️ Mostrar Controles';
    indicator.onclick = () => this.toggleSpectatorControls();
    
    document.body.appendChild(indicator);
    
    this.app.utils.log('info', 'SessionManager', 'Indicador flotante creado');
  }

  /**
   * Modo pantalla completa para espectadores
   */
  toggleFullscreen() {
    const spectatorInterface = document.querySelector('.spectator-interface');
    
    if (!spectatorInterface) return;
    
    if (!document.fullscreenElement) {
      spectatorInterface.requestFullscreen().catch(err => {
        console.error('Error al entrar en pantalla completa:', err);
        this.app.utils.log('error', 'SessionManager', 'Error fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

}

console.log('✅ SessionManager.js (Mejorado) cargado');
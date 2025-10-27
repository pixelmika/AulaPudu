/**
 * ============================================================================
 * EXAM PLAYER - UI Y LÓGICA PARA REALIZAR UN EXAMEN
 * ============================================================================
 * Se encarga de renderizar las preguntas, el temporizador y la navegación
 * durante un intento de examen por parte de un alumno.
 */

class ExamPlayer {
  constructor(app) {
    this.app = app;
    this.attempt = null;
    this.exam = null;
    this.currentQuestionIndex = 0;
    this.timer = {
      interval: null,
      remainingSeconds: 0,
    };
    this.answers = new Map(); // Para guardar las respuestas en memoria
    this.container = null;
    this.app.utils.log('info', 'ExamPlayer', 'Inicializado');
  }

  /**
   * Inicia la interfaz del examen para un intento específico.
   * @param {object} attemptData - El registro de la tabla 'exam_attempts'.
   * @param {object} examData - La información del examen, incluyendo las preguntas.
   */
  async start(attemptData, examData) {
    this.attempt = attemptData;
    this.exam = examData;
    this.currentQuestionIndex = 0;
    this.answers.clear();

    this.container = document.getElementById('exam-player');
    if (!this.container) {
      return console.error('Contenedor del examen no encontrado');
    }

    this.app.utils.log('success', 'ExamPlayer', `Iniciando examen "${this.exam.title}"`);
    this.app.ui.showPage('exam-player');
    
    this.renderLayout();
    this.renderQuestion();
    this.startTimer();
  }

  /**
   * Renderiza la estructura principal (layout) del reproductor de examen.
   */
  renderLayout() {
    this.container.innerHTML = `
      <div class="exam-player-header" style="padding: 15px; background: #333; color: white; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0;">${this.app.utils.escapeHtml(this.exam.title)}</h3>
        <div id="exam-timer" style="font-size: 1.2em; font-weight: bold;">--:--</div>
      </div>
      <div id="exam-question-area" style="padding: 20px;">
        <!-- La pregunta actual se renderizará aquí -->
      </div>
      <div class="exam-player-footer" style="padding: 15px; border-top: 1px solid #eee; display: flex; justify-content: space-between;">
        <button id="exam-prev-btn" onclick="app.examPlayer.prevQuestion()">Anterior</button>
        <span id="exam-progress-indicator"></span>
        <button id="exam-next-btn" onclick="app.examPlayer.nextQuestion()">Siguiente</button>
      </div>
    `;
  }

  /**
   * Renderiza la pregunta actual en el área de preguntas.
   */
  renderQuestion() {
    const questionArea = document.getElementById('exam-question-area');
    const progressIndicator = document.getElementById('exam-progress-indicator');
    if (!questionArea || !progressIndicator) return;

    const question = this.exam.questions[this.currentQuestionIndex];
    if (!question) return;

    progressIndicator.textContent = `Pregunta ${this.currentQuestionIndex + 1} de ${this.exam.questions.length}`;

    let optionsHtml = '';
    const savedAnswer = this.answers.get(question.id);

    switch (question.question_type) {
      case 'multiple-choice':
        optionsHtml = '<div class="options-group">' + question.options.choices.map((choice, index) => `
          <div class="option">
            <input type="radio" name="q_${question.id}" id="q_${question.id}_${index}" value="${this.app.utils.escapeHtml(choice)}" ${savedAnswer === choice ? 'checked' : ''}>
            <label for="q_${question.id}_${index}">${this.app.utils.escapeHtml(choice)}</label>
          </div>
        `).join('') + '</div>';
        break;
      case 'true-false':
        optionsHtml = '<div class="options-group">' + ['Verdadero', 'Falso'].map((choice, index) => `
          <div class="option">
            <input type="radio" name="q_${question.id}" id="q_${question.id}_${index}" value="${choice}" ${savedAnswer === choice ? 'checked' : ''}>
            <label for="q_${question.id}_${index}">${choice}</label>
          </div>
        `).join('') + '</div>';
        break;
      case 'open-ended':
        optionsHtml = `
          <div>
            <textarea name="q_${question.id}" style="width: 100%; min-height: 100px; padding: 8px;">${savedAnswer || ''}</textarea>
          </div>
        `;
        break;
    }

    questionArea.innerHTML = `
      <h4>${this.app.utils.escapeHtml(question.question_text)}</h4>
      ${optionsHtml}
    `;

    // Actualizar visibilidad de botones de navegación
    document.getElementById('exam-prev-btn').disabled = this.currentQuestionIndex === 0;
    document.getElementById('exam-next-btn').textContent = (this.currentQuestionIndex === this.exam.questions.length - 1) ? 'Finalizar Examen' : 'Siguiente';
  }

  /**
   * Inicia el temporizador del examen.
   */
  startTimer() {
    if (this.timer.interval) clearInterval(this.timer.interval);

    this.timer.remainingSeconds = this.exam.time_limit_minutes * 60;
    const timerElement = document.getElementById('exam-timer');

    const updateDisplay = () => {
      const minutes = Math.floor(this.timer.remainingSeconds / 60);
      const seconds = this.timer.remainingSeconds % 60;
      if (timerElement) {
        timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
    };

    updateDisplay(); // Mostrar tiempo inicial

    this.timer.interval = setInterval(() => {
      this.timer.remainingSeconds--;
      updateDisplay();
      if (this.timer.remainingSeconds <= 0) {
        clearInterval(this.timer.interval);
        alert('¡El tiempo ha terminado!');
        this.submit(); 
      }
    }, 1000);
  }

  /**
   * Guarda la respuesta de la pregunta actual.
   */
  saveCurrentAnswer() {
    const question = this.exam.questions[this.currentQuestionIndex];
    if (!question) return;

    let answer = null;
    if (question.question_type === 'open-ended') {
      const textarea = this.container.querySelector(`textarea[name="q_${question.id}"]`);
      answer = textarea ? textarea.value : null;
    } else {
      const radio = this.container.querySelector(`input[name="q_${question.id}"]:checked`);
      answer = radio ? radio.value : null;
    }

    if (answer !== null) {
      this.answers.set(question.id, answer);
      // Guardado en tiempo real en la BD
      this.app.exams.saveProgress(this.attempt.id, question.id, answer);
    }
  }

  /**
   * Navega a la siguiente pregunta o finaliza el examen.
   */
  nextQuestion() {
    this.saveCurrentAnswer();
    if (this.currentQuestionIndex < this.exam.questions.length - 1) {
      this.currentQuestionIndex++;
      this.renderQuestion();
    } else {
      // Es la última pregunta, el botón ahora dice "Finalizar Examen"
      this.submit();
    }
  }

  /**
   * Navega a la pregunta anterior.
   */
  prevQuestion() {
    this.saveCurrentAnswer();
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.renderQuestion();
    }
  }

  /**
   * Finaliza el examen.
   */
  submit() {
    if (!confirm('¿Estás seguro de que quieres finalizar el examen?')) {
      return;
    }
    
    this.saveCurrentAnswer(); // Guardar la última respuesta
    clearInterval(this.timer.interval); // Detener el temporizador

    this.app.utils.log('info', 'ExamPlayer', 'Finalizando examen...');
    
    // Deshabilitar la UI
    this.container.innerHTML = `<h1>Calculando resultados...</h1>`;

    // Llamar al ExamManager para que procese y guarde el resultado final
    this.app.exams.submitExam(this.attempt.id, this.answers);
  }
}

console.log('✅ ExamPlayer.js cargado');

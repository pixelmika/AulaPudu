/**
 * ============================================================================
 * EXAM RESULTS VIEWER - Muestra los resultados de un intento de examen
 * ============================================================================
 */

class ExamResultsViewer {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.app.utils.log('info', 'ExamResultsViewer', 'Inicializado');
  }

  /**
   * Muestra la página de resultados para un intento específico.
   * @param {number} attemptId - El ID del intento de examen a mostrar.
   */
  async show(attemptId) {
    this.container = document.getElementById('exam-results');
    if (!this.container) {
      return console.error('Contenedor de resultados no encontrado');
    }

    this.container.innerHTML = `<h1>Cargando resultados...</h1>`;
    this.app.ui.showPage('exam-results');

    const resultsData = await this.app.exams.getAttemptDetails(attemptId);

    if (!resultsData) {
      this.container.innerHTML = `<h1>Error al cargar los resultados.</h1>`;
      return;
    }

    this.render(resultsData);
  }

  /**
   * Renderiza la vista de resultados.
   * @param {object} resultsData - Los datos del intento, examen, preguntas y respuestas.
   */
  render(resultsData) {
    const { attempt, exam, questions, answers } = resultsData;

    let questionsHtml = '';
    questions.forEach((question, index) => {
      const studentAnswerObj = answers.find(a => a.question_id === question.id);
      const studentAnswer = studentAnswerObj ? studentAnswerObj.answer.value : 'No respondida';
      const correctAnswer = question.options.correct_answer;
      const isCorrect = studentAnswer === correctAnswer;

      questionsHtml += `
        <div style="border: 1px solid ${isCorrect ? 'var(--success)' : 'var(--error)'}; border-left-width: 5px; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
          <p><strong>${index + 1}. ${this.app.utils.escapeHtml(question.question_text)}</strong></p>
          <p>Tu respuesta: <span style="color: ${isCorrect ? 'var(--success)' : 'var(--error)'}">${this.app.utils.escapeHtml(studentAnswer)}</span></p>
          ${!isCorrect ? `<p>Respuesta correcta: <span style="color: var(--success)">${this.app.utils.escapeHtml(correctAnswer)}</span></p>` : ''}
        </div>
      `;
    });

    this.container.innerHTML = `
      <div style="max-width: 800px; margin: 20px auto; padding: 20px;">
        <div class="content-card">
          <h2>Resultados de "${this.app.utils.escapeHtml(exam.title)}"</h2>
          <p style="font-size: 1.5em; text-align: center;">Tu puntaje: <strong style="color: var(--primary-600);">${attempt.score.toFixed(2)}%</strong></p>
          <hr style="margin: 20px 0;">
          ${questionsHtml}
          <div style="text-align: center; margin-top: 30px;">
            <button onclick="app.ui.showPage('landing')">Volver al Inicio</button>
          </div>
        </div>
      </div>
    `;
  }
}

console.log('✅ ExamResultsViewer.js cargado');

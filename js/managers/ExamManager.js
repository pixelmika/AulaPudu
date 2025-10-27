/**
 * ============================================================================
 * EXAM MANAGER - GESTIÓN DE EXÁMENES Y EVALUACIONES
 * ============================================================================
 * Maneja la lógica para crear, iniciar, y calificar exámenes.
 */

class ExamManager {
  constructor(app) {
    this.app = app;
    this.currentExam = null;
    this.currentAttempt = null;
    this.timerInterval = null;
    this.app.utils.log('info', 'ExamManager', 'Inicializado');
  }

  /**
   * Añade un bloque de UI para una nueva pregunta en el creador de exámenes.
   * @param {string} type - El tipo de pregunta ('multiple-choice', 'true-false', 'open-ended').
   */
  addQuestionToCreator(type) {
    const container = document.getElementById('exam-questions-container');
    if (!container) return;

    const questionId = this.app.utils.generateId();
    const questionBlock = document.createElement('div');
    questionBlock.className = 'exam-question-block';
    questionBlock.id = `question-${questionId}`;
    questionBlock.style.cssText = 'border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; background: #f9f9f9;';

    let optionsHtml = '';
    switch (type) {
      case 'multiple-choice':
        optionsHtml = `
          <div class="options-wrapper">
            <div class="option-item" style="display: flex; align-items: center; margin-bottom: 5px;">
              <input type="radio" name="correct-answer-${questionId}" value="0" style="margin-right: 5px;">
              <input type="text" placeholder="Opción 1" style="flex: 1; padding: 5px;">
            </div>
            <div class="option-item" style="display: flex; align-items: center; margin-bottom: 5px;">
              <input type="radio" name="correct-answer-${questionId}" value="1" style="margin-right: 5px;">
              <input type="text" placeholder="Opción 2" style="flex: 1; padding: 5px;">
            </div>
          </div>
          <button type="button" onclick="app.exams.addOptionToQuestion('${questionId}')" style="margin-top: 5px; font-size: 12px; padding: 4px 8px;">+ Añadir Opción</button>
        `;
        break;
      case 'true-false':
        optionsHtml = `
          <div class="options-wrapper">
            <div class="option-item" style="display: flex; align-items: center; margin-bottom: 5px;">
              <input type="radio" name="correct-answer-${questionId}" value="Verdadero" checked style="margin-right: 5px;">
              <label>Verdadero</label>
            </div>
            <div class="option-item" style="display: flex; align-items: center; margin-bottom: 5px;">
              <input type="radio" name="correct-answer-${questionId}" value="Falso" style="margin-right: 5px;">
              <label>Falso</label>
            </div>
          </div>
        `;
        break;
      case 'open-ended':
        optionsHtml = `<p style="font-size: 14px; color: #666;">El alumno deberá escribir la respuesta. Opcionalmente, puedes proveer una respuesta correcta de referencia.</p><input type="text" placeholder="Respuesta correcta de referencia (opcional)" style="width: 100%; padding: 5px; margin-top: 5px;">`;
        break;
    }

    questionBlock.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <label style="font-weight: bold;">Pregunta (Tipo: ${type})</label>
        <button type="button" class="red" onclick="document.getElementById('question-${questionId}').remove()" style="font-size: 12px; padding: 4px 8px;">Eliminar</button>
      </div>
      <input type="text" class="question-text" placeholder="Escribe el enunciado de la pregunta" style="width: 100%; padding: 8px; margin-bottom: 10px;">
      <div class="question-options" data-type="${type}">${optionsHtml}</div>
    `;

    container.appendChild(questionBlock);
  }

  /**
   * Añade un campo de opción extra a una pregunta de opción múltiple en el creador.
   * @param {string} questionId - El ID del bloque de pregunta.
   */
  addOptionToQuestion(questionId) {
    const questionBlock = document.getElementById(`question-${questionId}`);
    if (!questionBlock) return;

    const optionsWrapper = questionBlock.querySelector('.options-wrapper');
    if (!optionsWrapper) return;

    const optionIndex = optionsWrapper.children.length;
    const newOption = document.createElement('div');
    newOption.className = 'option-item';
    newOption.style.cssText = 'display: flex; align-items: center; margin-bottom: 5px;';
    newOption.innerHTML = `
      <input type="radio" name="correct-answer-${questionId}" value="${optionIndex}" style="margin-right: 5px;">
      <input type="text" placeholder="Opción ${optionIndex + 1}" style="flex: 1; padding: 5px;">
    `;
    optionsWrapper.appendChild(newOption);
  }

  /**
   * Recopila los datos del formulario del creador de exámenes y los guarda.
   */
  async collectAndSaveExam() {
    const title = document.getElementById('exam-title').value.trim();
    const timeLimit = parseInt(document.getElementById('exam-time-limit').value, 10);

    if (!title || isNaN(timeLimit) || timeLimit <= 0) {
      this.app.ui.showNotification('Por favor, completa el título y un límite de tiempo válido.', 'error');
      return;
    }

    const questions = [];
    const questionBlocks = document.querySelectorAll('.exam-question-block');

    if (questionBlocks.length === 0) {
      this.app.ui.showNotification('Debes añadir al menos una pregunta al examen.', 'error');
      return;
    }

    let allQuestionsValid = true;
    questionBlocks.forEach(block => {
      const questionText = block.querySelector('.question-text').value.trim();
      if (!questionText) {
        allQuestionsValid = false;
      }

      const optionsNode = block.querySelector('.question-options');
      const type = optionsNode.dataset.type;
      
      const questionData = {
        text: questionText,
        type: type,
        options: {},
      };

      switch (type) {
        case 'multiple-choice': {
          const choices = [];
          const optionInputs = block.querySelectorAll('.option-item input[type="text"]');
          optionInputs.forEach(input => choices.push(input.value.trim()));
          
          const correctAnswerNode = block.querySelector(`input[name^="correct-answer-"]:checked`);
          if (!correctAnswerNode || choices.some(c => c === '')) {
            allQuestionsValid = false;
          }
          questionData.options.choices = choices;
          questionData.options.correct_answer = correctAnswerNode ? choices[correctAnswerNode.value] : null;
          break;
        }
        case 'true-false': {
          const correctAnswerNode = block.querySelector(`input[name^="correct-answer-"]:checked`);
          if (!correctAnswerNode) {
            allQuestionsValid = false;
          }
          questionData.options.choices = ['Verdadero', 'Falso'];
          questionData.options.correct_answer = correctAnswerNode ? correctAnswerNode.value : null;
          break;
        }
        case 'open-ended': {
          const referenceAnswer = block.querySelector('input[type="text"]:not(.question-text)').value.trim();
          questionData.options.correct_answer = referenceAnswer || null;
          break;
        }
      }
      questions.push(questionData);
    });

    if (!allQuestionsValid) {
      this.app.ui.showNotification('Por favor, completa todos los campos de las preguntas y selecciona una respuesta correcta.', 'error');
      return;
    }

    // Deshabilitar botón para prevenir envíos múltiples
    this.app.ui.setLoading('exam-creator-card button', true, 'Guardando...');

    const newExam = await this.createExam(title, timeLimit, questions);

    // Volver a habilitar el botón
    this.app.ui.setLoading('exam-creator-card button', false);

    if (newExam) {
      // Limpiar y ocultar el creador
      document.getElementById('exam-title').value = '';
      document.getElementById('exam-time-limit').value = '';
      document.getElementById('exam-questions-container').innerHTML = '';
      this.app.ui.toggleExamCreator(true); // Forzar ocultar
      // Aquí se podría actualizar la lista de exámenes existentes
      this.loadExams();
    }
  }

  /**
   * Carga y muestra la lista de exámenes creados por el usuario.
   */
  async loadExams() {
    const listElement = document.getElementById('exams-list');
    if (!listElement) return;

    if (!this.app.auth.currentUser) {
      listElement.innerHTML = '<li>Debes iniciar sesión para ver tus exámenes.</li>';
      return;
    }

    listElement.innerHTML = '<li>Cargando exámenes...</li>';

    try {
      const { data: exams, error } = await this.app.supa
        .from('exams')
        .select('id, title, time_limit_minutes')
        .eq('creator_id', this.app.auth.currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (exams.length === 0) {
        listElement.innerHTML = '<li>No has creado ningún examen todavía.</li>';
        return;
      }

      let html = '';
      exams.forEach(exam => {
        html += `
          <li style="display:flex; justify-content:space-between; align-items:center; padding: 10px; border-bottom: 1px solid #eee;">
            <span>
              <strong>${this.app.utils.escapeHtml(exam.title)}</strong>
              <small>(${exam.time_limit_minutes} min)</small>
            </span>
            <div>
              <button class="secondary" onclick="app.exams.showResultsForExam(${exam.id}, '${this.app.utils.escapeHtml(exam.title)}')">Ver Resultados</button>
              <button onclick="app.exams.startLiveExam(${exam.id}, '${this.app.utils.escapeHtml(exam.title)}')">Iniciar en Vivo</button>
              <button class="red" onclick="app.exams.deleteExam(${exam.id})">Eliminar</button>
            </div>
          </li>
        `;
      });

      listElement.innerHTML = html;

    } catch (error) {
      listElement.innerHTML = '<li>Error al cargar los exámenes.</li>';
      this.app.ui.handleError(error, 'Cargar Exámenes');
    }
  }

  /**
   * Elimina un examen y todas sus preguntas asociadas.
   * @param {number} examId - El ID del examen a eliminar.
   */
// En ExamManager.js - Corregir la consulta:
async deleteExam(examId) {
  if (!confirm('¿Estás seguro de que quieres eliminar este examen? Se borrarán todas sus preguntas y los intentos asociados de forma permanente.')) {
    return;
  }

  try {
    const { error } = await this.app.supa
      .from('exams')
      .delete()
      .eq('id', examId)
      .eq('creator_id', this.app.auth.currentUser.id); // CORREGIDO: era 'presentor_uid'

    if (error) throw error;

    this.app.ui.showNotification('Examen eliminado correctamente.', 'success');
    this.loadExams();

  } catch (error) {
    this.app.ui.handleError(error, 'Eliminar Examen');
  }
}

  /**
   * Inicia una sesión de examen en vivo, generando un código para compartir.
   * @param {number} examId - El ID del examen a iniciar.
   * @param {string} examTitle - El título del examen.
   */
  async startLiveExam(examId, examTitle) {
    if (!this.app.auth.currentUser) {
      return this.app.ui.showNotification('Debes iniciar sesión', 'error');
    }

    this.app.utils.log('info', 'ExamManager', `Iniciando sesión en vivo para el examen: ${examTitle}`);

    const joinCode = this.app.utils.generateSessionCode(); // Reutilizamos el generador de códigos

    try {
      const { error } = await this.app.supa
        .from('exams')
        .update({ 
          join_code: joinCode,
          is_active: true
        })
        .eq('id', examId)
        .eq('creator_id', this.app.auth.currentUser.id);

      if (error) throw error;

      const joinUrl = `${window.location.origin}${window.location.pathname}?exam_join=${joinCode}`;
      
      prompt(
        `Sesión de examen iniciada para "${examTitle}". Comparte este código o enlace con tus alumnos:`,
        joinCode
      );
      alert(`URL para unirse: ${joinUrl}`);

      this.app.utils.log('success', 'ExamManager', `Examen activado con código: ${joinCode}`);

    } catch (error) {
      this.app.ui.handleError(error, 'Activar Examen');
    }
  }

  /**
   * Permite a un alumno unirse a una sesión de examen en vivo.
   */
  async joinExam() {
    const examCode = document.getElementById('exam-code-input').value.trim();
    const studentName = document.getElementById('student-name-input').value.trim();
    const errorBox = document.getElementById('exam-join-error');

    if (!examCode || !studentName) {
      errorBox.textContent = 'Por favor, introduce el código y tu nombre.';
      return;
    }

    errorBox.textContent = '';
    this.app.utils.log('info', 'ExamManager', `Alumno '${studentName}' intentando unirse al examen con código: ${examCode}`);

    try {
      // 1. Validar que el examen existe y está activo, usando el join_code
      const { data: examData, error: examError } = await this.app.supa
        .from('exams')
        .select('id')
        .eq('join_code', examCode)
        .eq('is_active', true)
        .single();

      if (examError || !examData) {
        throw new Error('El código del examen no es válido o la sesión ha expirado.');
      }

      // 2. Crear el registro del intento de examen
      const { data: attemptData, error: attemptError } = await this.app.supa
        .from('exam_attempts')
        .insert({
          exam_id: examData.id,
          student_name: studentName,
          start_time: new Date().toISOString()
        })
        .select()
        .single();

      if (attemptError) throw attemptError;

      // Iniciar la interfaz del examen
      const fullExamData = await this.getExamWithQuestions(examData.id);
      if (fullExamData) {
        this.app.examPlayer.start(attemptData, fullExamData);
      }

    } catch (error) {
      errorBox.textContent = error.message;
      this.app.ui.handleError(error, 'Unirse a Examen');
    }
  }

  /**
   * Obtiene un examen y todas sus preguntas asociadas.
   * @param {number} examId - El ID del examen a obtener.
   */
  async getExamWithQuestions(examId) {
    try {
      const { data, error } = await this.app.supa
        .from('exams')
        .select(`
          *,
          questions (*)
        `)
        .eq('id', examId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      this.app.ui.handleError(error, 'Obtener Examen Completo');
      return null;
    }
  }

  /**
   * Crea un nuevo examen en la base de datos.
   * @param {string} title - Título del examen.
   * @param {number} timeLimit - Límite de tiempo en minutos.
   * @param {Array} questions - Un array de objetos de pregunta.
   */
  async createExam(title, timeLimit, questions) {
    if (!this.app.auth.currentUser) {
      this.app.ui.showNotification('Debes iniciar sesión para crear un examen', 'error');
      return null;
    }

    try {
      // 1. Insertar el examen para obtener su ID
      const { data: examData, error: examError } = await this.app.supa
        .from('exams')
        .insert({
          title: title,
          time_limit_minutes: timeLimit,
          creator_id: this.app.auth.currentUser.id
        })
        .select()
        .single();

      if (examError) throw examError;

      this.app.utils.log('success', 'ExamManager', `Examen creado con ID: ${examData.id}`);

      // 2. Preparar las preguntas asociadas a ese examen
      const questionsToInsert = questions.map(q => ({
        exam_id: examData.id,
        question_text: q.text,
        question_type: q.type,
        options: q.options, // Formato: { choices: ['A', 'B', 'C'], correct_answer: 'A' }
      }));

      // 3. Insertar todas las preguntas
      const { error: questionsError } = await this.app.supa
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      this.app.utils.log('success', 'ExamManager', `${questions.length} preguntas insertadas para el examen ${examData.id}`);
      this.app.ui.showNotification('Examen creado con éxito', 'success');

      return examData;
    } catch (error) {
      this.app.ui.handleError(error, 'Crear Examen');
      return null;
    }
  }

  /**
   * Inicia un intento de examen para un usuario.
   * @param {number} examId - El ID del examen a iniciar.
   */
  async startAttempt(examId) {
    // Lógica para registrar el inicio de un intento en la tabla 'exam_attempts'
    // y cargar las preguntas del examen.
    console.log(`Iniciando intento para el examen ${examId}`);
    // ...
  }

  /**
   * Guarda el progreso de un intento de examen (una respuesta).
   * @param {number} attemptId - El ID del intento.
   * @param {number} questionId - El ID de la pregunta respondida.
   * @param {string} answer - La respuesta del usuario.
   */
  async saveProgress(attemptId, questionId, answer) {
    try {
      const { error } = await this.app.supa
        .from('attempt_answers')
        .upsert(
          {
            attempt_id: attemptId,
            question_id: questionId,
            answer: { value: answer } // Guardar la respuesta dentro de un objeto JSON
          },
          { onConflict: 'attempt_id, question_id' } // Clave para el upsert
        );

      if (error) throw error;

      this.app.utils.log('info', 'ExamManager', `Respuesta guardada para la pregunta ${questionId}`);

    } catch (error) {
      // No notificamos al usuario para no ser intrusivos, pero sí lo loggeamos
      console.error('[Guardar Progreso]', error);
    }
  }

  /**
   * Finaliza un intento de examen y calcula el resultado.
   * @param {number} attemptId - El ID del intento a finalizar.
   * @param {Map} answers - Un mapa con las respuestas del alumno (questionId => answer).
   */
  async submitExam(attemptId, answers) {
    this.app.utils.log('info', 'ExamManager', `Enviando examen para el intento ${attemptId}`);
    try {
      // 1. Obtener el intento y el examen con las preguntas y respuestas correctas
      const { data: attempt, error: attemptError } = await this.app.supa
        .from('exam_attempts')
        .select(`exam_id`)
        .eq('id', attemptId)
        .single();

      if (attemptError) throw attemptError;

      const exam = await this.getExamWithQuestions(attempt.exam_id);
      if (!exam) throw new Error('No se pudo cargar la información del examen para la calificación.');

      // 2. Calcular el puntaje
      let correctCount = 0;
      exam.questions.forEach(question => {
        const studentAnswer = answers.get(question.id);
        const correctAnswer = question.options.correct_answer;
        if (studentAnswer && studentAnswer === correctAnswer) {
          correctCount++;
        }
      });

      const totalQuestions = exam.questions.length;
      const finalScore = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

      this.app.utils.log('success', 'ExamManager', `Calificación calculada: ${finalScore.toFixed(2)}%`);

      // 3. Actualizar el intento en la base de datos con el puntaje y la fecha de finalización
      const { error: updateError } = await this.app.supa
        .from('exam_attempts')
        .update({
          score: finalScore,
          end_time: new Date().toISOString()
        })
        .eq('id', attemptId);

      if (updateError) throw updateError;

      // 4. Mostrar la página de resultados
      this.app.examResultsViewer.show(attemptId);

    } catch (error) {
      this.app.ui.handleError(error, 'Finalizar Examen');
    }
  }

  /**
   * Obtiene todos los detalles de un intento de examen para la página de resultados.
   * @param {number} attemptId - El ID del intento.
   */
  async getAttemptDetails(attemptId) {
    this.app.utils.log('info', 'ExamManager', `Cargando detalles para el intento ${attemptId}`);
    try {
      // 1. Obtener el intento
      const { data: attempt, error: attemptError } = await this.app.supa
        .from('exam_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();
      if (attemptError) throw attemptError;

      // 2. Obtener el examen y sus preguntas
      const exam = await this.getExamWithQuestions(attempt.exam_id);
      if (!exam) throw new Error('No se pudo cargar el examen asociado.');

      // 3. Obtener las respuestas de este intento
      const { data: answers, error: answersError } = await this.app.supa
        .from('attempt_answers')
        .select('*')
        .eq('attempt_id', attemptId);
      if (answersError) throw answersError;

      return { attempt, exam, questions: exam.questions, answers };

    } catch (error) {
      this.app.ui.handleError(error, 'Cargar Resultados');
      return null;
    }
  }

  /**
   * Muestra los resultados de todos los intentos para un examen específico.
   * @param {number} examId - El ID del examen.
   * @param {string} examTitle - El título del examen.
   */
  async showResultsForExam(examId, examTitle) {
    const attempts = await this.getAttemptsForExam(examId);
    if (!attempts) return; // El error ya fue manejado

    let modalContent = '';
    if (attempts.length === 0) {
      modalContent = '<p>Aún no hay resultados para este examen.</p>';
    } else {
      modalContent = `
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; border-bottom: 2px solid #333;">
              <th style="padding: 8px;">Nombre del Alumno</th>
              <th style="padding: 8px;">Puntaje</th>
              <th style="padding: 8px;">Fecha</th>
            </tr>
          </thead>
          <tbody>
            ${attempts.map(attempt => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px;">${this.app.utils.escapeHtml(attempt.student_name)}</td>
                <td style="padding: 8px;">${attempt.score !== null ? attempt.score.toFixed(2) + '%' : 'Pendiente'}</td>
                <td style="padding: 8px;">${new Date(attempt.end_time || attempt.created_at).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    this.app.ui.showModal(`Resultados para: "${examTitle}"`, modalContent);
  }

  /**
   * Obtiene todos los intentos para un examen específico.
   * @param {number} examId - El ID del examen.
   */
  async getAttemptsForExam(examId) {
    try {
      const { data, error } = await this.app.supa
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;

    } catch (error) {
      this.app.ui.handleError(error, 'Obtener Intentos de Examen');
      return null;
    }
  }

  /**
   * Carga los resultados de un intento de examen finalizado.
   * @param {number} attemptId - El ID del intento.
   */
  async getResults(attemptId) {
    // Lógica para obtener el puntaje y las respuestas (correctas e incorrectas)
    // de un intento ya completado.
    console.log(`Obteniendo resultados para el intento ${attemptId}`);
    // ...
  }

  async getExamCount() {
    if (!this.app.auth.currentUser) return 0;
    try {
      const { count, error } = await this.app.supa
        .from('exams')
        .select('id', { count: 'exact' })
        .eq('creator_id', this.app.auth.currentUser.id);

      if (error) throw error;
      return count;
    } catch (error) {
      this.app.ui.handleError(error, 'getExamCount');
      return 0; // Fallback
    }
  }
}

console.log('✅ ExamManager.js cargado');

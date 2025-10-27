/**
 * ============================================================================
 * QUESTION MANAGER - GESTIÓN DE PREGUNTAS Y QUIZZES
 * ============================================================================
 * Maneja todo lo relacionado con preguntas:
 * - Creación de preguntas (múltiple opción, verdadero/falso, abierta)
 * - Guardar y listar preguntas
 * - Enviar preguntas a espectadores
 */

class QuestionManager {
  constructor(app) {
    this.app = app;
    this.savedQuestions = [];
    this.questionType = CONFIG.QUESTION_TYPES.MULTIPLE_CHOICE;
    this.app.utils.log('info', 'QuestionManager', 'Inicializado');
  }

  /**
   * Cambia el tipo de pregunta
   */
  setQuestionType(type, event) {
    this.questionType = type;
    
    // Actualizar botones activos
    document.querySelectorAll('.question-type-selector button').forEach(b => {
      b.classList.remove('active');
    });
    if (event && event.target) {
      event.target.classList.add('active');
    }

    const container = document.getElementById('options-container');

    if (type === CONFIG.QUESTION_TYPES.OPEN_ENDED) {
      // Pregunta abierta: sin opciones
      container.innerHTML = '<p>Se permite cualquier respuesta de texto.</p>';
      container.style.display = 'block';
    } else {
      container.style.display = 'flex';
      
      if (type === CONFIG.QUESTION_TYPES.TRUE_FALSE) {
        // Verdadero/Falso: opciones fijas
        container.innerHTML = `
          <div class="option-input">
            <input type="text" value="Verdadero" readonly>
          </div>
          <div class="option-input">
            <input type="text" value="Falso" readonly>
          </div>
        `;
      } else {
        // Múltiple opción: opciones editables
        container.innerHTML = `
          <div class="option-input">
            <input type="text" placeholder="Opción 1">
            <button class="red" onclick="app.questions.removeOption(this)">✕</button>
          </div>
          <div class="option-input">
            <input type="text" placeholder="Opción 2">
            <button class="red" onclick="app.questions.removeOption(this)">✕</button>
          </div>
        `;
      }
    }

    // Mostrar/ocultar botón de añadir opción
    const addBtn = document.querySelector('.add-option');
    if (addBtn) {
      addBtn.style.display = (type === CONFIG.QUESTION_TYPES.MULTIPLE_CHOICE) ? 'block' : 'none';
    }

    this.app.utils.log('info', 'QuestionManager', 'Tipo cambiado a:', type);
  }

  /**
   * Añade una nueva opción a pregunta múltiple
   */
  addOption() {
    const container = document.getElementById('options-container');
    const n = container.children.length + 1;
    
    const div = document.createElement('div');
    div.className = 'option-input';
    div.innerHTML = `
      <input type="text" placeholder="Opción ${n}">
      <button class="red" onclick="app.questions.removeOption(this)">✕</button>
    `;
    container.appendChild(div);
    
    this.app.utils.log('info', 'QuestionManager', 'Opción añadida');
  }

  /**
   * Elimina una opción de pregunta múltiple
   */
  removeOption(btn) {
    const container = document.getElementById('options-container');
    
    if (container.children.length > 2) {
      btn.parentElement.remove();
      this.app.utils.log('info', 'QuestionManager', 'Opción eliminada');
    } else {
      alert('Debe haber al menos dos opciones.');
    }
  }

  /**
   * Guarda una nueva pregunta
   */
  async saveQuestion() {
    const title = document.getElementById('question-title').value.trim();
    
    if (!title) {
      alert('Ingresa una pregunta.');
      return;
    }

    let options = null;
    
    // Recopilar opciones si no es pregunta abierta
    if (this.questionType !== CONFIG.QUESTION_TYPES.OPEN_ENDED) {
      options = [];
      document.querySelectorAll('#options-container input').forEach(input => {
        const value = input.value.trim();
        if (value) options.push(value);
      });
      
      if (options.length < 2) {
        alert('Se requieren al menos dos opciones.');
        return;
      }
    }

    const { data: { user } } = await this.app.supa.auth.getUser(); // Get current user
    if (!user) {
      alert('Debes iniciar sesión para guardar preguntas.');
      return;
    }

    // Create new question object for Supabase
    const questionToSave = {
      creator_id: user.id,
      title: title,
      qtype: this.questionType,
      options: options, // Supabase JSONB will store this
    };

    try {
      const { data, error } = await this.app.supa
        .from('saved_questions') // Assuming this table exists
        .insert([questionToSave])
        .select()
        .single();

      if (error) throw error;

      // Update in-memory array (optional, but good for immediate UI consistency)
      this.savedQuestions.push(data); // Push the data returned from Supabase (with its ID)
      
      alert('Pregunta guardada.');
      this.app.utils.log('success', 'QuestionManager', 'Pregunta guardada:', title);

      // Limpiar formulario
      document.getElementById('question-title').value = '';
      this.setQuestionType(CONFIG.QUESTION_TYPES.MULTIPLE_CHOICE);
      this.loadSavedQuestions(); // Reload from DB to ensure consistency

    } catch (err) {
      this.app.ui.handleError(err, 'Guardar Pregunta');
      alert('Error al guardar la pregunta: ' + err.message);
    }
  }

  /**
   * Carga la lista de preguntas guardadas en el UI
   */
  async loadSavedQuestions() { // Make it async
    const list = document.getElementById('saved-questions');
    if (!list) return;
    list.innerHTML = '<li>Cargando preguntas...</li>'; // Indicate loading

    const { data: { user } } = await this.app.supa.auth.getUser();
    if (!user) {
      list.innerHTML = '<li>Debes iniciar sesión para ver tus preguntas.</li>';
      return;
    }

    try {
      const { data: questions, error } = await this.app.supa
        .from('saved_questions') // Assuming this table exists
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false }); // Order by creation date

      if (error) throw error;

      this.savedQuestions = questions; // Update the in-memory array with fetched data

      if (this.savedQuestions.length === 0) {
        list.innerHTML = '<li>No hay preguntas guardadas</li>';
        return;
      }

      let html = '';
      this.savedQuestions.forEach(q => {
        html += `
          <li style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #eee;">
            <div>
              <strong>${this.app.utils.escapeHtml(q.title)}</strong><br>
              <small>Tipo: ${this.getQuestionTypeName(q.qtype)}</small>
            </div>
            <div>
              <button onclick="app.questions.useQuestion('${q.id}')">Usar</button>
              <button class="red" onclick="app.questions.deleteQuestion(event, '${q.id}')">Eliminar</button>
            </div>
          </li>
        `;
      });
      list.innerHTML = html;

    } catch (err) {
      this.app.ui.handleError(err, 'Cargar Preguntas');
      list.innerHTML = '<li>Error al cargar las preguntas.</li>';
    }
  }

  /**
   * Obtiene el nombre legible del tipo de pregunta
   */
  getQuestionTypeName(type) {
    const types = {
      [CONFIG.QUESTION_TYPES.MULTIPLE_CHOICE]: 'Opción múltiple',
      [CONFIG.QUESTION_TYPES.TRUE_FALSE]: 'Verdadero/Falso',
      [CONFIG.QUESTION_TYPES.OPEN_ENDED]: 'Respuesta abierta'
    };
    return types[type] || type;
  }

  /**
   * Elimina una pregunta guardada
   */
  async deleteQuestion(event, questionId) { // Make it async
    event.preventDefault();
    
    if (!confirm('¿Eliminar esta pregunta?')) return;

    const { data: { user } } = await this.app.supa.auth.getUser();
    if (!user) {
      alert('Debes iniciar sesión para eliminar preguntas.');
      return;
    }

    try {
      const { error } = await this.app.supa
        .from('saved_questions')
        .delete()
        .eq('id', questionId)
        .eq('creator_id', user.id); // Ensure only the creator can delete

      if (error) throw error;

      // Update in-memory array
      this.savedQuestions = this.savedQuestions.filter(q => q.id !== questionId);
      
      alert('Pregunta eliminada.');
      this.app.utils.log('success', 'QuestionManager', 'Pregunta eliminada');
      this.loadSavedQuestions(); // Reload from DB to ensure consistency

    } catch (err) {
      this.app.ui.handleError(err, 'Eliminar Pregunta');
      alert('Error al eliminar la pregunta: ' + err.message);
    }
  }

  /**
   * Usa una pregunta (la envía a los espectadores)
   */
  useQuestion(questionId) {
    const q = this.savedQuestions.find(q => q.id === questionId);
    
    if (!q) return;

    if (!this.app.session.rt.chan) {
      alert('Debes iniciar una sesión en vivo primero.');
      return;
    }

    alert(`Mostrando pregunta: ${q.title}`);

    if (this.app.session.rt.chan && this.app.session.rt.chan.send) {
      try {
        this.app.session.rt.chan.send({
          type: 'broadcast',
          event: 'question',
          payload: {
            questionId: q.id,
            title: q.title,
            qtype: q.qtype,
            options: q.options
          }
        });
        this.app.utils.log('success', 'QuestionManager', 'Pregunta enviada:', q.title);
      } catch (e) {
        console.warn('Error RT question', e);
        this.app.utils.log('error', 'QuestionManager', 'Error enviando:', e);
      }
    }
  }

  /**
   * Exporta las preguntas a JSON (para backup)
   */
  exportQuestions() {
    const dataStr = JSON.stringify(this.savedQuestions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `aulapudu_questions_${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    this.app.utils.log('success', 'QuestionManager', 'Preguntas exportadas');
  }

  /**
   * Importa preguntas desde JSON
   */
  async importQuestions(file) {
    try {
      const text = await file.text();
      const questions = JSON.parse(text);
      
      if (Array.isArray(questions)) {
        this.savedQuestions = [...this.savedQuestions, ...questions];
        this.loadSavedQuestions();
        alert(`${questions.length} preguntas importadas.`);
        this.app.utils.log('success', 'QuestionManager', 'Preguntas importadas:', questions.length);
      } else {
        alert('Formato de archivo inválido.');
      }
    } catch (e) {
      alert('Error al importar preguntas.');
      this.app.utils.log('error', 'QuestionManager', 'Error importando:', e);
    }
  }
}

console.log('✅ QuestionManager.js cargado');
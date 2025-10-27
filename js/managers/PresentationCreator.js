/**
 * ============================================================================
 * PRESENTATION CREATOR - Herramienta para crear presentaciones interactivas
 * ============================================================================
 */

class PresentationCreator {
  constructor(app) {
    this.app = app;
    this.currentPresentation = null;
    this.slides = [];
    this.activeSlideIndex = 0;
    this.selectedElementId = null;
    this.container = null;

    // Propiedades para el drag & drop
    this.isDragging = false;
    this.draggedElement = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this.app.utils.log('info', 'PresentationCreator', 'Inicializado');
  }

  async init() {
    this.currentPresentation = { id: null, title: 'Presentación sin título' };
    this.slides = [{ id: `slide-${this.app.utils.generateId()}`, content: [] }];
    this.activeSlideIndex = 0;
    this.selectedElementId = null;

    this.container = document.getElementById('presenter-creator-content');
    await this.showPresentationList();
    this.initEventListeners();
  }

  // Añadir un listener global para la tecla Supr
  initEventListeners() {
    document.addEventListener('keydown', (e) => {
      // Solo actuar si estamos en la página del creador
      if (this.app.ui.getCurrentPage() === 'presenter-dashboard' && this.container.style.display !== 'none') {
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedElementId) {
          // No borrar si se está editando texto
          if (e.target.getAttribute('contenteditable') === 'true') return;
          e.preventDefault();
          this.deleteSelectedElement();
        }
      }
    });
  }

  async showPresentationList() {
    if (!this.container) return;
    this.container.innerHTML = `<h2>Cargando presentaciones...</h2>`;

    try {
      const { data, error } = await this.app.supa
        .from('interactive_presentations')
        .select('id, title, created_at')
        .eq('creator_id', this.app.auth.currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let presentationsHtml = '';
      if (data.length > 0) {
        presentationsHtml = data.map(p => `
          <li style="display:flex; justify-content:space-between; align-items:center; padding: 10px; border-bottom: 1px solid #eee;">
            <span><strong>${this.app.utils.escapeHtml(p.title)}</strong> <br> <small>Creada: ${new Date(p.created_at).toLocaleDateString()}</small></span>
            <button onclick="app.creator.loadPresentation(${p.id})">Editar</button>
          </li>
        `).join('');
      }

      this.container.innerHTML = `
        <div class="content-card">
          <h3>Mis Presentaciones Interactivas</h3>
          <ul style="list-style:none; padding:0; margin-bottom: 20px;">
            ${presentationsHtml || '<li>No has creado ninguna presentación.</li>'}
          </ul>
          <button onclick="app.creator.startNew()">+ Crear Nueva Presentación</button>
        </div>
      `;

    } catch (error) {
      this.app.ui.handleError(error, 'Cargar Presentaciones Guardadas');
      this.container.innerHTML = `<h2>Error al cargar presentaciones.</h2>`;
    }
  }

  async loadPresentation(presentationId) {
    this.container.innerHTML = `<h2>Cargando editor...</h2>`;
    try {
      const { data, error } = await this.app.supa
        .from('interactive_presentations')
        .select(`* , slides (*)`)
        .eq('id', presentationId)
        .single();

      if (error) throw error;

      this.currentPresentation = data;
      this.slides = data.slides.sort((a, b) => a.slide_number - b.slide_number);
      this.activeSlideIndex = 0;
      this.selectedElementId = null;
      this.renderEditor();

    } catch (error) {
      this.app.ui.handleError(error, 'Cargar Presentación');
    }
  }

  startNew() {
    this.currentPresentation = { id: null, title: 'Presentación sin título' };
    this.slides = [{ id: `slide-${this.app.utils.generateId()}`, content: [] }];
    this.activeSlideIndex = 0;
    this.selectedElementId = null;
    this.renderEditor();
  }

renderEditor() {
  if (!this.container) return;

  // Generar slidesHtml dinámicamente
  const slidesHtml = this.slides.map((slide, index) => `
    <div class="slide-thumbnail ${index === this.activeSlideIndex ? 'active' : ''}" 
         onclick="app.creator.selectSlide(${index})">
      <span class="slide-number">${index + 1}</span>
      <div class="slide-preview">
        ${slide.content.length > 0 ? '📝' : '➕'}
      </div>
    </div>
  `).join('');

  this.container.innerHTML = `
    <div class="creator-toolbar">
      <button onclick="app.creator.showPresentationList()">← Volver</button>
      <input type="text" id="presentation-title-input" 
             value="${this.app.utils.escapeHtml(this.currentPresentation.title)}" 
             style="font-weight: bold; font-size: 1.2em; border: none; flex: 1; padding: 5px;"/>
      <button onclick="app.creator.addTextElement()">📝 Texto</button>
      <button onclick="app.creator.addImageElement()">🖼️ Imagen</button>
      <button id="save-presentation-btn" onclick="app.creator.save()">💾 Guardar</button>
    </div>
    <div class="creator-layout">
      <div class="slides-sidebar">
        ${slidesHtml}
        <button onclick="app.creator.addSlide()" style="width: 100%; margin-top: 10px;">
          ➕ Nueva Diapositiva
        </button>
      </div>
      <div class="main-canvas">
        <div class="slide-editor"></div>
      </div>
    </div>
  `;

  this.renderActiveSlide();
  this.initDragAndDrop();
}

  renderActiveSlide() {
    const editor = this.container.querySelector('.slide-editor');
    if (!editor) return;

    const activeSlide = this.slides[this.activeSlideIndex];
    if (!activeSlide) {
      editor.innerHTML = '';
      return;
    }

    editor.innerHTML = '';
    activeSlide.content.forEach(element => {
      const el = document.createElement('div');
      el.className = 'slide-element';
      if (element.id === this.selectedElementId) {
        el.classList.add('selected');
      }
      el.dataset.elementId = element.id;
      el.style.left = `${element.x}px`;
      el.style.top = `${element.y}px`;
      el.style.width = `${element.width}px`;
      el.style.height = `${element.height}px`;

      if (element.type === 'text') {
        const textDiv = document.createElement('div');
        textDiv.setAttribute('contenteditable', 'true');
        textDiv.style.fontSize = `${element.fontSize}px`;
        textDiv.textContent = element.value;
        textDiv.addEventListener('blur', (e) => {
          element.value = e.target.textContent;
        });
        el.appendChild(textDiv);
      } else if (element.type === 'image') {
        const img = document.createElement('img');
        img.src = element.src;
        el.appendChild(img);
      }
      
      editor.appendChild(el);
    });
  }

  initDragAndDrop() {
    const editor = this.container.querySelector('.slide-editor');
    if (!editor) return;

    editor.addEventListener('mousedown', this.onDragStart.bind(this));
    document.addEventListener('mousemove', this.onDrag.bind(this));
    document.addEventListener('mouseup', this.onDragEnd.bind(this));
  }

  onDragStart(e) {
    const target = e.target.closest('.slide-element');
    this.selectElement(target ? target.dataset.elementId : null);

    if (target && e.target.getAttribute('contenteditable') !== 'true') {
      this.isDragging = true;
      this.draggedElement = target;
      const rect = target.getBoundingClientRect();
      this.dragOffsetX = e.clientX - rect.left;
      this.dragOffsetY = e.clientY - rect.top;
      e.preventDefault();
    }
  }

  onDrag(e) {
    if (this.isDragging && this.draggedElement) {
      const parentRect = this.draggedElement.parentElement.getBoundingClientRect();
      let newX = e.clientX - parentRect.left - this.dragOffsetX;
      let newY = e.clientY - parentRect.top - this.dragOffsetY;

      newX = Math.max(0, Math.min(newX, parentRect.width - this.draggedElement.offsetWidth));
      newY = Math.max(0, Math.min(newY, parentRect.height - this.draggedElement.offsetHeight));

      this.draggedElement.style.left = `${newX}px`;
      this.draggedElement.style.top = `${newY}px`;
    }
  }

  onDragEnd(e) {
    if (this.isDragging && this.draggedElement) {
      const elementId = this.draggedElement.dataset.elementId;
      const activeSlide = this.slides[this.activeSlideIndex];
      const elementData = activeSlide.content.find(el => el.id === elementId);

      if (elementData) {
        elementData.x = parseInt(this.draggedElement.style.left, 10);
        elementData.y = parseInt(this.draggedElement.style.top, 10);
      }
    }
    this.isDragging = false;
    this.draggedElement = null;
  }

  selectElement(elementId) {
    this.selectedElementId = elementId;
    // Re-render para mostrar el borde de selección
    this.renderActiveSlide();
  }

  deleteSelectedElement() {
    if (!this.selectedElementId) return;

    const activeSlide = this.slides[this.activeSlideIndex];
    if (!activeSlide) return;

    activeSlide.content = activeSlide.content.filter(el => el.id !== this.selectedElementId);
    this.selectedElementId = null;
    this.renderActiveSlide();
    this.app.utils.log('info', 'PresentationCreator', 'Elemento eliminado');
  }

  async save() {
    const saveBtn = document.getElementById('save-presentation-btn');
    this.app.ui.setLoading(saveBtn, true, 'Guardando...');

    try {
      const title = document.getElementById('presentation-title-input').value;
      const user = this.app.auth.currentUser;
      if (!user) throw new Error('Usuario no autenticado.');

      let presentationId = this.currentPresentation.id;

      if (!presentationId) {
        const { data, error } = await this.app.supa
          .from('interactive_presentations')
          .insert({ title: title, creator_id: user.id })
          .select()
          .single();
        
        if (error) throw error;
        presentationId = data.id;
        this.currentPresentation.id = presentationId;
      } else {
        const { error } = await this.app.supa
          .from('interactive_presentations')
          .update({ title: title })
          .eq('id', presentationId);
        if (error) throw error;
      }

      const slidesToSave = this.slides.map((slide, index) => ({
        presentation_id: presentationId,
        slide_number: index + 1,
        content: slide.content
      }));

      const { error: deleteError } = await this.app.supa
        .from('slides')
        .delete()
        .eq('presentation_id', presentationId);

      if (deleteError) throw deleteError;

      const { error: insertError } = await this.app.supa
        .from('slides')
        .insert(slidesToSave);

      if (insertError) throw insertError;

      this.app.ui.showNotification('¡Presentación guardada con éxito!', 'success');
    } catch (error) {
      this.app.ui.handleError(error, 'Guardar Presentación');
    } finally {
      this.app.ui.setLoading(saveBtn, false, 'Guardar');
    }
  }

  addSlide() {
    const newSlide = { id: `slide-${this.app.utils.generateId()}`, content: [] };
    this.slides.push(newSlide);
    this.activeSlideIndex = this.slides.length - 1;
    this.renderEditor();
  }

  selectSlide(slideIndex) {
    if (slideIndex >= 0 && slideIndex < this.slides.length) {
      this.activeSlideIndex = slideIndex;
      this.selectedElementId = null; // Deseleccionar elemento al cambiar de diapositiva
      this.renderEditor();
    }
  }

  addTextElement() {
    const activeSlide = this.slides[this.activeSlideIndex];
    if (!activeSlide) return;

    const newTextElement = {
      id: `el-${this.app.utils.generateId()}`,
      type: 'text',
      value: 'Doble clic para editar',
      x: 50,
      y: 50,
      width: 200,
      height: 50,
      fontSize: 20
    };

    activeSlide.content.push(newTextElement);
    this.renderActiveSlide();
  }

  addImageElement() {
    const imageUrl = prompt('Por favor, introduce la URL de la imagen:');
    if (!imageUrl) return;

    const activeSlide = this.slides[this.activeSlideIndex];
    if (!activeSlide) return;

    const newImageElement = {
      id: `el-${this.app.utils.generateId()}`,
      type: 'image',
      src: imageUrl,
      x: 70,
      y: 70,
      width: 250,
      height: 150
    };

    activeSlide.content.push(newImageElement);
    this.renderActiveSlide();
  }

  /**
   * Carga una presentación interactiva en el modo de "Sesión en Vivo".
   * @param {number} presentationId - El ID de la presentación a cargar.
   */
  async loadIntoPresenter(presentationId) {
    try {
      const { data, error } = await this.app.supa
        .from('interactive_presentations')
        .select(`* , slides (*)`)
        .eq('id', presentationId)
        .single();

      if (error) throw error;

      const presentationData = {
        ...data,
        slides: data.slides.sort((a, b) => a.slide_number - b.slide_number)
      };

      // Notificar al ContentManager sobre la nueva presentación activa
      this.app.content.setActiveInteractivePresentation(presentationData);

      // Navegar a la vista de sesión en vivo
      this.app.ui.showPresenterContent('live-session');

    } catch (error) {
      this.app.ui.handleError(error, 'Cargar Presentación Interactiva');
    }
  }
}

console.log('✅ PresentationCreator.js cargado');
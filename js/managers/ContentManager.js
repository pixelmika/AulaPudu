/**
 * ============================================================================ 
 * CONTENT MANAGER - GESTIÓN DE PRESENTACIONES Y PDF
 * ============================================================================ 
 */

class ContentManager {
  constructor(app) {
    this.app = app;
    this.uploadedFiles = { presentations: [], materials: [] };
    this.currentPresentation = null;
    this.currentSlide = 1;
    this.totalSlides = 1;
    this.pdfDoc = null;

    this.activePresentationType = null; // 'pdf', 'interactive'
    this.interactivePresentationData = null;
    this.videoEmbedUrl = null; // NEW: Property to store video embed URL

    this.app.utils.log('info', 'ContentManager', 'Inicializado');
  }

  /**
   * Establece una presentación interactiva como la activa.
   */
  setActiveInteractivePresentation(data) {
    this.activePresentationType = 'interactive';
    this.interactivePresentationData = data;
    this.currentPresentation = data.title;
    this.currentSlide = 1;
    this.totalSlides = data.slides.length;
    this.pdfDoc = null;

    this.renderCurrentSlideView();
    this.app.session.broadcastSlide();
  }

  /**
   * Carga la lista de AMBOS tipos de presentaciones en el UI.
   */
  async loadPresentationsListUI() {
    const ul = document.getElementById('presentations-list');
    if (!ul) return;
    ul.innerHTML = '<li>Cargando...</li>';

    try {
      // Fetch interactive presentations
      const { data: interactivePresentations, error: interactiveError } = await this.app.supa
        .from('interactive_presentations')
        .select('id, title')
        .eq('creator_id', this.app.auth.currentUser.id);

      if (interactiveError) throw interactiveError;

      // NEW: Fetch uploaded file metadata from the database
      const { data: uploadedFilesMetadata, error: uploadedError } = await this.app.supa
        .from('uploaded_files_metadata') // Assuming this table exists
        .select('id, file_name, file_type, supabase_url')
        .eq('creator_id', this.app.auth.currentUser.id);

      if (uploadedError) throw uploadedError;

      if (uploadedFilesMetadata.length === 0 && interactivePresentations.length === 0) {
        ul.innerHTML = '<li>No hay presentaciones. Sube un archivo o crea una nueva.</li>';
        return;
      }

      let html = '';
      // Iterate over fetched uploaded files metadata
      uploadedFilesMetadata.forEach(p => {
        const nameEscaped = p.file_name.replace(/'/g, "\'");
        const urlEscaped = p.supabase_url.replace(/'/g, "\'");
        html += `
          <li style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eee;">
            <span>${this.app.utils.escapeHtml(p.file_name)} <small>[Archivo]</small></span>
            <div>
              <button onclick="app.content.loadPresentation('${nameEscaped}', '${p.file_type}', '${urlEscaped}')">Cargar</button>
              <button class="red" onclick="app.content.deleteFile(event, '${p.id}', 'uploaded_file')">Eliminar</button>
            </div>
          </li>
        `;
      });

      interactivePresentations.forEach(p => {
        html += `
          <li style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eee;">
            <span>${this.app.utils.escapeHtml(p.title)} <small>[Interactiva]</small></span>
            <div>
              <button onclick="app.creator.loadIntoPresenter(${p.id})">Cargar</button>
              <button class="red" onclick="alert('Próximamente: Eliminar presentación interactiva')">Eliminar</button>
            </div>
          </li>
        `;
      });

      ul.innerHTML = html;

    } catch (error) {
      this.app.ui.handleError(error, 'Cargar Presentaciones');
      ul.innerHTML = '<li>Error al cargar la lista de presentaciones.</li>';
    }
  }

  /**
   * Carga una presentación de tipo archivo (PDF, etc.)
   */
  async loadPresentation(title, type, fileUrl) {
    this.app.utils.log('info', 'ContentManager', `Cargando archivo: ${title}`);
    this.activePresentationType = 'pdf';
    this.interactivePresentationData = null;
    this.currentPresentation = title;
    this.currentSlide = 1;
    this.totalSlides = 1;
    this.pdfDoc = null;
    this.currentFileUrl = fileUrl; // NEW: Store the fileUrl

    if (type === 'pdf' && window.pdfjsLib) {
      try {
        this.pdfDoc = await pdfjsLib.getDocument(fileUrl).promise;
        this.totalSlides = this.pdfDoc.numPages;
      } catch (e) {
        this.app.ui.handleError(e, 'Cargar PDF');
      }
    } else {
      this.totalSlides = 10; // Simulación para otros archivos
    }

    this.renderCurrentSlideView();
    this.app.session.broadcastSlide();
    this.app.ui.showPresenterContent('live-session');
  }

  /**
   * Avanza a la siguiente diapositiva.
   */
  nextSlide() {
    if (this.currentSlide < this.totalSlides) {
      this.currentSlide++;
      this.renderCurrentSlideView();
      this.app.session.broadcastSlide();
    }
  }

  /**
   * Retrocede a la diapositiva anterior.
   */
  prevSlide() {
    if (this.currentSlide > 1) {
      this.currentSlide--;
      this.renderCurrentSlideView();
      this.app.session.broadcastSlide();
    }
  }

  /**
   * Renderiza la diapositiva/página actual según el tipo de presentación.
   */
  renderCurrentSlideView() {
    const pdfContainer = document.getElementById('pdf-viewer-container');
    const interactiveContainer = document.getElementById('interactive-viewer-container');
    if (!pdfContainer || !interactiveContainer) return;

    // Ocultar ambos contenedores primero
    pdfContainer.style.display = 'none';
    interactiveContainer.style.display = 'none';

    if (this.activePresentationType === 'pdf') {
      pdfContainer.style.display = 'block';
      this.renderPDFPage(this.currentSlide, 'pdf-canvas');
    } else if (this.activePresentationType === 'interactive') {
      interactiveContainer.style.display = 'block';
      this.renderInteractiveSlide(this.currentSlide);
    } else if (this.activePresentationType === 'video') { // NEW: Handle video type
      pdfContainer.style.display = 'block'; // Use pdfContainer for video as well
      pdfContainer.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <h3>🎬 Reproduciendo Video</h3>
          <div class="video-container" style="
            position: relative;
            width: 100%;
            max-width: 800px;
            height: 0;
            padding-bottom: 56.25%;
            margin: 20px auto;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          ">
            <iframe
              src="${this.videoEmbedUrl}"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
              style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border: none;
              "
            ></iframe>
          </div>
          <p style="color: #666; margin-top: 15px;">
            El video se está reproduciendo. Los espectadores pueden verlo en tiempo real.
          </p>
        </div>
      `;
    }

    this.updateLiveUI();
  }

  /**
   * Renderiza una diapositiva interactiva específica.
   * @param {number} slideNumber - El número de diapositiva (1-based).
   */
  renderInteractiveSlide(slideNumber) {
    const container = document.getElementById('interactive-viewer-container');
    if (!container || !this.interactivePresentationData) return;

    const slide = this.interactivePresentationData.slides[slideNumber - 1];
    if (!slide) return;

    container.innerHTML = ''; // Limpiar
    slide.content.forEach(element => {
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
      container.appendChild(el);
    });
  }

  /**
   * Renderiza una página específica de un PDF.
   */
  async renderPDFPage(pageNumber, canvasId) {
    if (!this.pdfDoc) return;

    try {
      const page = await this.pdfDoc.getPage(pageNumber);
      const canvas = document.getElementById(canvasId);
      const context = canvas.getContext('2d');
      const containerWidth = canvas.parentElement.clientWidth;
      const viewport = page.getViewport({ scale: containerWidth / page.getViewport({ scale: 1 }).width });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      canvas.style.display = 'block';
    } catch (e) {
      this.app.ui.handleError(e, 'Render PDF');
    }
  }

  /**
   * Actualiza los indicadores de UI (título, número de diapositiva, etc.).
   */
  updateLiveUI() {
    document.getElementById('total-slides').textContent = this.totalSlides;
    document.getElementById('current-slide').textContent = this.currentSlide;
    document.getElementById('current-presentation-title').textContent = this.currentPresentation || '--';
  }

  async uploadPresentation() {
    const input = document.getElementById('presentation-upload');
    const file = input.files[0];
    if (!file) return alert('Selecciona un archivo.');

    const { data: { user } } = await this.app.supa.auth.getUser();
    if (!user) return alert('Debes iniciar sesión.');

    const uploadBtn = document.getElementById('upload-presentation-btn');
    const uploadStatus = document.getElementById('upload-presentation-status');
    if (!uploadBtn) return console.error('Botón de subida no encontrado');

    uploadBtn.disabled = true;
    const fileExt = file.name.split('.').pop().toLowerCase();

    if (!CONFIG.SUPPORTED_PRESENTATION_TYPES.includes(fileExt)) {
      this.showUploadStatus(uploadStatus, 'error', `Formato no soportado. Válidos: ${CONFIG.SUPPORTED_PRESENTATION_TYPES.join(', ')}`);
      uploadBtn.disabled = false;
      return;
    }

    if (!this.app.utils.isValidFileSize(file, CONFIG.MAX_FILE_SIZE_MB)) {
      this.showUploadStatus(uploadStatus, 'error', `Archivo muy grande (máx ${CONFIG.MAX_FILE_SIZE_MB}MB)`);
      uploadBtn.disabled = false;
      return;
    }

    const filePath = `${user.id}/${file.name}-${Date.now()}.${fileExt}`;

    try {
      this.showUploadStatus(uploadStatus, 'loading', 'Subiendo...', 0);
      const { error: uploadError } = await this.app.supa.storage
        .from(CONFIG.STORAGE_BUCKET)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = this.app.supa.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(filePath);
      
      // NEW: Save metadata to database
      const { data: metadata, error: metadataError } = await this.app.supa
        .from('uploaded_files_metadata') // Assuming this table exists
        .insert({
          creator_id: user.id,
          file_name: file.name,
          file_type: fileExt,
          supabase_url: urlData.publicUrl
        })
        .select()
        .single();

      if (metadataError) throw metadataError;

      this.loadPresentationsListUI(); // This will now fetch from DB
      input.value = '';
      this.showUploadStatus(uploadStatus, 'success', `✅ "${file.name}" subido.`);
      setTimeout(() => { uploadStatus.innerHTML = ''; uploadBtn.disabled = false; }, 3000);

    } catch (err) {
      this.showUploadStatus(uploadStatus, 'error', `❌ Error: ${err.message}`);
      uploadBtn.disabled = false;
    }
  }

  async deleteFile(event, id, type) { // Changed 'name' to 'id'
    event.preventDefault();
    if (!confirm(`¿Estás seguro de que quieres eliminar este archivo?`)) return;

    try {
      if (type === 'uploaded_file') { // New case for files from uploaded_files_metadata
        const { data: fileMetadata, error: fetchError } = await this.app.supa
          .from('uploaded_files_metadata')
          .select('file_name, supabase_url')
          .eq('id', id)
          .single();

        if (fetchError || !fileMetadata) throw new Error('Metadatos del archivo no encontrados.');

        const filePathInStorage = fileMetadata.supabase_url.split('/').slice(-2).join('/');
        const { error: storageError } = await this.app.supa.storage
          .from(CONFIG.STORAGE_BUCKET)
          .remove([filePathInStorage]);

        if (storageError) throw storageError;

        const { error: dbError } = await this.app.supa
          .from('uploaded_files_metadata')
          .delete()
          .eq('id', id);

        if (dbError) throw dbError;

        this.app.ui.showNotification(`Archivo "${fileMetadata.file_name}" eliminado.`, 'success');

      } else if (type === 'presentations') { // Old logic for in-memory files (should be removed or adapted)
        // This block is likely obsolete now that files are managed via DB metadata
        // However, if there's a scenario where in-memory files are still used,
        // this would need to be adapted. For now, I'll assume it's for the old in-memory array.
        const fileRecord = this.uploadedFiles[type].find(f => f.name === id); // 'id' is actually 'name' here
        if (fileRecord && fileRecord.supabaseUrl) {
          const filePath = fileRecord.supabaseUrl.split('/').slice(-2).join('/');
          await this.app.supa.storage.from(CONFIG.STORAGE_BUCKET).remove([filePath]);
        }
        this.uploadedFiles[type] = this.uploadedFiles[type].filter(f => f.name !== id);
        this.app.ui.showNotification(`Archivo "${id}" eliminado. (In-memory)`, 'success');
      }
      // Add case for interactive presentations if needed
      // else if (type === 'interactive_presentation') { ... }

      this.loadPresentationsListUI(); // Refresh the UI
    } catch (error) {
      this.app.ui.handleError(error, 'Eliminar Archivo');
      this.app.ui.showNotification(`Error al eliminar archivo: ${error.message}`, 'error');
    }
  }

/**
 * Muestra el estado de la subida
 */
showUploadStatus(container, type, message, progress = 0) {
  const classMap = {
    loading: 'upload-status loading',
    success: 'upload-status success', 
    error: 'upload-status error'
  };
  
  container.innerHTML = `
    <div class="${classMap[type] || 'upload-status'}">
      <span class="loading-spinner" style="${type !== 'loading' ? 'display:none' : ''}"></span>
      ${message}
      ${progress > 0 ? `<div class="progress-bar">
        <div class="progress-bar-fill" style="width: ${progress}%"></div>
      </div>` : ''}
    </div>
  `;
}

  async getPresentationCount() {
    if (!this.app.auth.currentUser) return 0;
    try {
      const { count: interactiveCount, error: interactiveError } = await this.app.supa
        .from('interactive_presentations')
        .select('id', { count: 'exact' })
        .eq('creator_id', this.app.auth.currentUser.id);

      if (interactiveError) throw interactiveError;

      // NEW: Fetch count from uploaded_files_metadata table
      const { count: uploadedCount, error: uploadedError } = await this.app.supa
        .from('uploaded_files_metadata')
        .select('id', { count: 'exact' })
        .eq('creator_id', this.app.auth.currentUser.id);

      if (uploadedError) throw uploadedError;

      return uploadedCount + interactiveCount; // Sum both counts
    } catch (error) {
      this.app.ui.handleError(error, 'getPresentationCount');
      // Fallback should now also try to get count from DB if possible, or return 0
      // For simplicity, let's return 0 on error for now, as the DB is the source of truth.
      return 0;
    }
  }
}

console.log('✅ ContentManager.js refactorizado cargado');

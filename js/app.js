// ========== CHARGEMENT DES COMPOSANTS ==========
async function loadComponents() {
    try {
        const headerContainer = document.getElementById('header-container');
        const footerContainer = document.getElementById('footer-container');
        
        // AJOUT DE '?v=' + Date.now() POUR FORCER LE RECHARGEMENT SANS CACHE
        const headerUrl = new URL('./components/header.html', window.location.href).href + '?v=' + Date.now();
        const footerUrl = new URL('./components/footer.html', window.location.href).href + '?v=' + Date.now();

        if (headerContainer) {
            const headerRes = await fetch(headerUrl);
            if (!headerRes.ok) throw new Error(`Failed to load header: ${headerRes.status}`);
            const headerHtml = await headerRes.text();
            insertHTMLSafe(headerContainer, headerHtml);
        }

        if (footerContainer) {
            const footerRes = await fetch(footerUrl);
            if (!footerRes.ok) throw new Error(`Failed to load footer: ${footerRes.status}`);
            const footerHtml = await footerRes.text();
            insertHTMLSafe(footerContainer, footerHtml);
        }

        initMobileMenu();
        initMegaMenu();
        setActiveLink();
        initIframeLinks();
    } catch (error) {
        console.error('Erreur chargement des composants:', error);
    }
}

// ========== UTILITAIRES ==========
function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
}

// Insert HTML into a container safely by parsing and importing nodes (avoids direct innerHTML assignment)
function insertHTMLSafe(container, html) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        // Remove existing children
        while (container.firstChild) container.removeChild(container.firstChild);
        // Move all body children
        Array.from(doc.body.childNodes).forEach(node => {
            container.appendChild(document.importNode(node, true));
        });
    } catch (err) {
        // Fallback to safe text if parsing fails
        container.textContent = html;
        console.error('insertHTMLSafe failed:', err);
    }
}

// Helper to set button content safely (with optional loading spinner)
function setButtonLoading(btn, text) {
    if (!btn) return;
    while (btn.firstChild) btn.removeChild(btn.firstChild);
    const spinner = document.createElement('span'); spinner.className = 'loading';
    btn.appendChild(spinner);
    btn.appendChild(document.createTextNode(' ' + text));
}

function setButtonText(btn, icon, text) {
    if (!btn) return;
    while (btn.firstChild) btn.removeChild(btn.firstChild);
    if (icon) {
        const span = document.createElement('span'); span.textContent = icon; btn.appendChild(span);
        btn.appendChild(document.createTextNode(' '));
    }
    btn.appendChild(document.createTextNode(text));
}

function createToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'assertive');
        container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, type = 'error', duration = 4500) {
    const container = createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));

    const hide = () => {
        toast.classList.remove('visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    };

    setTimeout(hide, duration);
}

function formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ========== MENU MOBILE ==========
function initMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('navMenu');
    if (btn && menu) {
        btn.addEventListener('click', () => {
            menu.classList.toggle('show');
            btn.setAttribute('aria-expanded', menu.classList.contains('show'));
        });
    }
}

// ========== MÉGA-MENU (AU CLIC) ==========
function initMegaMenu() {
    const dropdowns = document.querySelectorAll('.nav-item-dropdown');

    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');

        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();

                const isOpen = dropdown.classList.contains('is-open') || dropdown.classList.contains('active');

                // Ferme les autres dropdowns ouverts
                dropdowns.forEach(other => {
                    if (other !== dropdown) {
                        other.classList.remove('active', 'is-open');
                        other.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
                    }
                });

                // Toggle le dropdown actuel (ajoute à la fois .active et .is-open pour compatibilité)
                if (!isOpen) {
                    dropdown.classList.add('active', 'is-open');
                    trigger.setAttribute('aria-expanded', 'true');
                    // focuser le premier lien du mega-menu pour accessibilité
                    dropdown.querySelector('.mega-menu-item')?.focus();
                } else {
                    dropdown.classList.remove('active', 'is-open');
                    trigger.setAttribute('aria-expanded', 'false');
                }
            });
        }

        // Ferme le menu quand on clique sur un lien à l'intérieur
        const menuItems = dropdown.querySelectorAll('.mega-menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                dropdown.classList.remove('active', 'is-open');
                dropdown.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
            });
        });
    });

    // Ferme tous les menus quand on clique à l'extérieur
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-item-dropdown')) {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('active', 'is-open');
                dropdown.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
            });
        }
    });

    // Fermer avec la touche Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('active', 'is-open');
                dropdown.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
            });
        }
    });
}

// ========== IFRAME-LINKS (modal) ==========
function initIframeLinks() {
    document.querySelectorAll('[data-open-iframe]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.href;
            openIframeModal(href);
        });
    });
}

function openIframeModal(url) {
    // Prevent duplicates
    if (document.querySelector('.iframe-modal')) return;

    const modal = document.createElement('div');
    modal.className = 'iframe-modal';

    const wrap = document.createElement('div');
    wrap.className = 'iframe-wrap';

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.setAttribute('aria-label', 'Outil WebM');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'iframe-close';
    closeBtn.innerText = '✕';

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', onKeyDown);

    wrap.appendChild(closeBtn);
    wrap.appendChild(iframe);
    modal.appendChild(wrap);
    document.body.appendChild(modal);

    function closeModal() {
        document.removeEventListener('keydown', onKeyDown);
        modal.remove();
    }

    function onKeyDown(e) {
        if (e.key === 'Escape') closeModal();
    }
}

// ========== LIEN ACTIF ==========
function setActiveLink() {
    const path = window.location.pathname;
    let currentPage = 'home'; 
    
    if (path.includes('compression')) currentPage = 'compression';
    else if (path.includes('webp')) currentPage = 'webp';
    else if (path.includes('avif')) currentPage = 'avif';
    else if (path.includes('webm')) currentPage = 'webm';
    else if (path.includes('alt-checker')) currentPage = 'alt-checker';
    else if (path.includes('faq')) currentPage = 'faq';
    else if (path.includes('contact')) currentPage = 'contact';
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === currentPage);
    });
}

// ========== ÉTAT GLOBAL ==========
let files = [];
let compressed = [];
const MAX_FILES = 10;
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function invalidFile(reason) {
    return { valid: false, reason, detectedType: null };
}

async function validateImageFile(file) {
    if (!file || file.size === 0) {
        return invalidFile('Le fichier est vide ou illisible.');
    }

    if (file.size > MAX_SIZE) {
        return invalidFile('Le fichier dépasse 5 MB.');
    }

    const extension = getExtension(file.name);
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return invalidFile('Extension non autorisée. Formats acceptés : JPG, JPEG, PNG, WEBP.');
    }

    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
        return invalidFile('Type MIME non autorisé.');
    }

    let bytes;
    try {
        bytes = await readFileHeader(file, 16);
    } catch {
        return invalidFile('Impossible de lire le fichier.');
    }

    const detectedType = detectImageType(bytes);
    if (!detectedType) {
        return invalidFile('Le fichier ne correspond pas à une vraie image JPG, PNG ou WEBP.');
    }

    if (!matchesExtension(detectedType, extension)) {
        return invalidFile(`Incohérence détectée : le contenu du fichier semble être ${detectedType.toUpperCase()}, mais l'extension est .${extension}.`);
    }

    if (!matchesMime(detectedType, file.type)) {
        return invalidFile(`Incohérence détectée : le contenu semble être ${detectedType.toUpperCase()}, mais le type MIME déclaré est ${file.type || 'inconnu'}.`);
    }

    return { valid: true, reason: '', detectedType };
}

function getExtension(filename) {
    const name = String(filename || '');
    const parts = name.toLowerCase().split('.');
    return parts.length > 1 ? parts.pop().trim() : '';
}

function readFileHeader(file, length = 16) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const blob = file.slice(0, length);

        reader.onload = () => resolve(new Uint8Array(reader.result));
        reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
        reader.readAsArrayBuffer(blob);
    });
}

function detectImageType(bytes) {
    if (isJpeg(bytes)) return 'jpeg';
    if (isPng(bytes)) return 'png';
    if (isWebp(bytes)) return 'webp';
    return null;
}

function isJpeg(bytes) {
    return bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
}

function isPng(bytes) {
    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    return bytes.length >= pngSignature.length && pngSignature.every((byte, index) => bytes[index] === byte);
}

function isWebp(bytes) {
    return bytes.length >= 12 &&
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
}

function matchesExtension(detectedType, extension) {
    const map = {
        jpeg: ['jpg', 'jpeg'],
        png: ['png'],
        webp: ['webp']
    };
    return map[detectedType]?.includes(extension) ?? false;
}

function matchesMime(detectedType, mime) {
    const map = {
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp'
    };
    return !mime || map[detectedType] === mime;
}

// ========== DRAG & DROP ==========
function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
function setupDragAndDrop(zone, handleDrop) {
    if (!zone) return;
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        zone.addEventListener(eventName, preventDefaults, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        zone.addEventListener(eventName, () => zone.classList.add('dragover'), false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        zone.addEventListener(eventName, () => zone.classList.remove('dragover'), false);
    });
    zone.addEventListener('drop', (e) => handleDrop(e.dataTransfer.files), false);
}

// ========== LOGIQUE MÉTIER ==========
function detectPage() {
    const path = window.location.pathname;
    if (path.includes('webp')) return 'webp';
    if (path.includes('avif')) return 'avif';
    if (path.includes('compression')) return 'compression';
    return 'home';
}

function createImageCard(file, index) {
    const card = document.createElement('div');
    card.className = 'image-card';

    const url = URL.createObjectURL(file);

    const preview = document.createElement('div');
    preview.className = 'image-preview';
    const previewBox = document.createElement('div');
    previewBox.className = 'preview-box';
    const previewLabel = document.createElement('div');
    previewLabel.className = 'preview-label';
    previewLabel.textContent = 'Original';
    const img = document.createElement('img');
    img.src = url;
    img.className = 'preview-image';
    img.alt = `Aperçu de ${file.name}`;
    img.decoding = 'async';
    img.loading = 'lazy';
    img.width = 300; img.height = 150;

    previewBox.appendChild(previewLabel);
    previewBox.appendChild(img);
    preview.appendChild(previewBox);

    const info = document.createElement('div');
    info.className = 'image-info';
    const nameEl = document.createElement('div');
    nameEl.className = 'image-name';
    nameEl.textContent = file.name;
    const sizeComp = document.createElement('div');
    sizeComp.className = 'size-comparison';
    const origSize = document.createElement('span');
    origSize.className = 'size-box size-original';
    origSize.textContent = formatSize(file.size);
    const compSize = document.createElement('span');
    compSize.className = 'size-box size-compressed';
    compSize.id = `compressed-${index}`;
    compSize.style.display = 'none';
    const savings = document.createElement('span');
    savings.className = 'savings';
    savings.id = `savings-${index}`;
    savings.style.display = 'none';

    sizeComp.appendChild(origSize);
    sizeComp.appendChild(compSize);
    sizeComp.appendChild(savings);
    info.appendChild(nameEl);
    info.appendChild(sizeComp);

    const actions = document.createElement('div');
    actions.className = 'action-buttons';
    const dlBtn = document.createElement('button');
    dlBtn.className = 'btn btn-small btn-success';
    dlBtn.id = `download-${index}`;
    dlBtn.style.display = 'none';
    dlBtn.textContent = '💾 Télécharger';
    actions.appendChild(dlBtn);

    card.appendChild(preview);
    card.appendChild(info);
    card.appendChild(actions);

    return card;
}

async function convertImage(file, index, quality, mimeType, extension) {
    try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width; canvas.height = bitmap.height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
        const newName = file.name.replace(/\.[^.]+$/, '') + extension;
        
        compressed[index] = { blob, name: newName, size: blob.size, originalSize: file.size };
        
        const compEl = document.getElementById(`compressed-${index}`);
        const savEl = document.getElementById(`savings-${index}`);
        if (compEl) { compEl.style.display = 'inline-block'; compEl.textContent = formatSize(blob.size); }
        
        const variation = ((1 - blob.size / file.size) * 100).toFixed(1);
        if (savEl) { savEl.style.display = 'inline-block'; savEl.textContent = `${variation > 0 ? '-' : '+'}${Math.abs(variation)}%`; }
        
        const dlBtn = document.getElementById(`download-${index}`);
        if (dlBtn) {
            dlBtn.style.display = 'inline-flex';
            dlBtn.onclick = () => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = newName;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
            };
        }
    } catch (error) { console.error('Erreur:', error); }
}

function downloadAll() {
    compressed.forEach((item, index) => {
        if (item) setTimeout(() => {
            const url = URL.createObjectURL(item.blob);
            const a = document.createElement('a'); a.href = url; a.download = item.name;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }, index * 200);
    });
}

async function downloadAsZip() {
    const zipBtn = document.getElementById('zipBtn');
    if (!zipBtn || !compressed.some(c => c)) return;
    zipBtn.disabled = true; setButtonLoading(zipBtn, 'ZIP...');

    const zip = new JSZip();
    compressed.forEach(item => { if (item) zip.file(item.name, item.blob); });

    try {
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a'); a.href = url; a.download = `hopla-tinyimg-${detectPage()}.zip`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        
        setButtonText(zipBtn, '✅', 'ZIP téléchargé !');
        setTimeout(() => { zipBtn.disabled = false; setButtonText(zipBtn, '📦', 'Télécharger en ZIP'); }, 3000);
    } catch (err) {
        setButtonText(zipBtn, '❌', 'Erreur'); zipBtn.disabled = false;
    }
}

function updateStats() {
    const stats = document.getElementById('stats');
    if (!stats) return;
    const total = compressed.filter(c => c).length;
    if (total === 0) { stats.style.display = 'none'; return; }
    
    const orig = compressed.reduce((sum, c) => sum + (c?.originalSize || 0), 0);
    const newSize = compressed.reduce((sum, c) => sum + (c?.size || 0), 0);
    const variation = ((1 - newSize / orig) * 100).toFixed(1);
    
    stats.style.display = 'grid';
    const el1 = document.getElementById('totalFiles');
    const el2 = document.getElementById('originalSize');
    const el3 = document.getElementById('compressedSize');
    const el4 = document.getElementById('savingsPercent');
    if (el1) el1.textContent = total;
    if (el2) el2.textContent = formatSize(orig);
    if (el3) el3.textContent = formatSize(newSize);
    if (el4) el4.textContent = `${variation > 0 ? '-' : '+'}${Math.abs(variation)}%`;
}

function clearAll() {
    files = []; compressed = [];
    const grid = document.getElementById('imagesGrid'); if (grid) { while (grid.firstChild) grid.removeChild(grid.firstChild); }
    const controls = document.getElementById('controls'); if (controls) controls.style.display = 'none';
    const actionBar = document.getElementById('actionBar'); if (actionBar) actionBar.style.display = 'none';
    const stats = document.getElementById('stats'); if (stats) stats.style.display = 'none';
    const zipBtn = document.getElementById('zipBtn'); if (zipBtn) zipBtn.disabled = true;
    const dlBtn = document.getElementById('downloadAllBtn'); if (dlBtn) dlBtn.disabled = true;
    const fileInput = document.getElementById('fileInput'); if (fileInput) fileInput.value = '';
}

async function handleFiles(fileList) {
    const selectedFiles = Array.from(fileList).slice(0, MAX_FILES);
    const validatedFiles = [];

    for (const file of selectedFiles) {
        const validation = await validateImageFile(file);
        if (!validation.valid) {
            showToast(`${file.name} : ${validation.reason}`, 'error');
            continue;
        }
        validatedFiles.push(file);
    }

    files = validatedFiles;

    if (files.length > 0) {
        const controls = document.getElementById('controls'); if (controls) controls.style.display = 'flex';
        const actionBar = document.getElementById('actionBar'); if (actionBar) actionBar.style.display = 'flex';
        const grid = document.getElementById('imagesGrid');
        if (grid) { while (grid.firstChild) grid.removeChild(grid.firstChild); files.forEach((f, i) => grid.appendChild(createImageCard(f, i))); }
        updateStats();
    }
}

// ========== INITIALISATION PAR PAGE ==========
function initPage() {
    const page = detectPage();
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const chooseBtn = document.getElementById('chooseFilesBtn');
    
    if (!uploadZone) return;

    setupDragAndDrop(uploadZone, handleFiles);
    if (fileInput) fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    if (chooseBtn) chooseBtn.addEventListener('click', () => fileInput && fileInput.click());

    if (page === 'compression') {
        const qSlider = document.getElementById('qualitySlider');
        const qValue = document.getElementById('qualityValue');
        if (qSlider && qValue) qSlider.addEventListener('input', (e) => { qValue.textContent = e.target.value + '%'; });
        
        document.getElementById('compressBtn')?.addEventListener('click', async () => {
            const btn = document.getElementById('compressBtn');
            btn.disabled = true; setButtonLoading(btn, 'Compression...');
            compressed = [];
            const q = qSlider ? parseInt(qSlider.value) / 100 : 0.8;
            for (let i = 0; i < files.length; i++) await convertImage(files[i], i, q, 'image/webp', '.webp');
            btn.disabled = false; setButtonText(btn, '⚡', 'Compresser tout');
            document.getElementById('downloadAllBtn').disabled = false;
            document.getElementById('zipBtn').disabled = false;
            updateStats();
        });
    } 

    document.getElementById('zipBtn')?.addEventListener('click', downloadAsZip);
    document.getElementById('downloadAllBtn')?.addEventListener('click', downloadAll);
    document.getElementById('clearBtn')?.addEventListener('click', clearAll);
}

// ========== DÉMARRAGE ==========
document.addEventListener('DOMContentLoaded', async () => {
    await loadComponents();
    initPage();
});
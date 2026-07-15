// ========== CHARGEMENT DES COMPOSANTS ==========
async function loadComponents() {
    try {
        const headerContainer = document.getElementById('header-container');
        const footerContainer = document.getElementById('footer-container');
        const headerUrl = new URL('./components/header.html', window.location.href).href;
        const footerUrl = new URL('./components/footer.html', window.location.href).href;

        if (headerContainer) {
            const headerRes = await fetch(headerUrl);
            if (!headerRes.ok) throw new Error(`Failed to load header: ${headerRes.status} ${headerRes.statusText}`);
            const headerHtml = await headerRes.text();
            headerContainer.innerHTML = headerHtml;
        }

        if (footerContainer) {
            const footerRes = await fetch(footerUrl);
            if (!footerRes.ok) throw new Error(`Failed to load footer: ${footerRes.status} ${footerRes.statusText}`);
            const footerHtml = await footerRes.text();
            footerContainer.innerHTML = footerHtml;
        }

        initMobileMenu();
        setActiveLink();
    } catch (error) {
        console.error('Erreur chargement des composants:', error);
    }
}

// ========== UTILITAIRES ==========
function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
}

function formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function initMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('navMenu');
    if (btn && menu) {
        btn.addEventListener('click', () => menu.classList.toggle('show'));
    }
}

function setActiveLink() {
    const path = window.location.pathname;
    let currentPage = 'compression';
    if (path.includes('webp')) currentPage = 'webp';
    else if (path.includes('avif')) currentPage = 'avif';
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === currentPage);
    });
}

// ========== ÉTAT GLOBAL ==========
let files = [];
let compressed = [];
let avifOutputFormat = 'png';
const MAX_FILES = 10;
const MAX_SIZE = 5 * 1024 * 1024;

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
    return 'compression';
}

function createImageCard(file, index) {
    const card = document.createElement('div');
    card.className = 'image-card';
    const url = URL.createObjectURL(file);
    card.innerHTML = `
        <div class="image-preview">
            <div class="preview-box">
                <div class="preview-label">Original</div>
                <img src="${url}" class="preview-image" alt="Aperçu">
            </div>
        </div>
        <div class="image-info">
            <div class="image-name">${escapeHTML(file.name)}</div>
            <div class="size-comparison">
                <span class="size-box size-original">${formatSize(file.size)}</span>
                <span class="size-box size-compressed" id="compressed-${index}" style="display:none;"></span>
                <span class="savings" id="savings-${index}" style="display:none;"></span>
            </div>
        </div>
        <div class="action-buttons">
            <button class="btn btn-small btn-success" id="download-${index}" style="display:none;">💾 Télécharger</button>
        </div>
    `;
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
    zipBtn.disabled = true; zipBtn.innerHTML = '<span class="loading"></span> ZIP...';

    const zip = new JSZip();
    compressed.forEach(item => { if (item) zip.file(item.name, item.blob); });

    try {
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a'); a.href = url; a.download = `hopla-tinyimg-${detectPage()}.zip`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        
        zipBtn.innerHTML = '<span>✅</span> ZIP téléchargé !';
        setTimeout(() => { zipBtn.disabled = false; zipBtn.innerHTML = '<span>📦</span> Télécharger en ZIP'; }, 3000);
    } catch (err) {
        zipBtn.innerHTML = '<span>❌</span> Erreur'; zipBtn.disabled = false;
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
    const grid = document.getElementById('imagesGrid'); if (grid) grid.innerHTML = '';
    const controls = document.getElementById('controls'); if (controls) controls.style.display = 'none';
    const actionBar = document.getElementById('actionBar'); if (actionBar) actionBar.style.display = 'none';
    const stats = document.getElementById('stats'); if (stats) stats.style.display = 'none';
    const zipBtn = document.getElementById('zipBtn'); if (zipBtn) zipBtn.disabled = true;
    const dlBtn = document.getElementById('downloadAllBtn'); if (dlBtn) dlBtn.disabled = true;
    const fileInput = document.getElementById('fileInput'); if (fileInput) fileInput.value = '';
}

function handleFiles(fileList, type) {
    files = Array.from(fileList).slice(0, MAX_FILES).filter(file => {
        if (file.size > MAX_SIZE) { alert(`${file.name} dépasse 5 MB`); return false; }
        if (type === 'all') return file.type.startsWith('image/');
        if (type === 'webp') return file.type.includes('png') || file.type.includes('jpeg') || file.type.includes('jpg');
        if (type === 'avif') return file.type.includes('avif') || file.name.toLowerCase().endsWith('.avif');
        return false;
    });
    if (type === 'avif' && files.length === 0) { alert('Fichiers AVIF requis.'); return; }
    
    if (files.length > 0) {
        const controls = document.getElementById('controls'); if (controls) controls.style.display = 'flex';
        const actionBar = document.getElementById('actionBar'); if (actionBar) actionBar.style.display = 'flex';
        const grid = document.getElementById('imagesGrid'); 
        if (grid) { grid.innerHTML = ''; files.forEach((f, i) => grid.appendChild(createImageCard(f, i))); }
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

    const type = page === 'webp' ? 'webp' : (page === 'avif' ? 'avif' : 'all');
    setupDragAndDrop(uploadZone, (f) => handleFiles(f, type));
    if (fileInput) fileInput.addEventListener('change', (e) => handleFiles(e.target.files, type));
    if (chooseBtn) chooseBtn.addEventListener('click', () => fileInput && fileInput.click());

    if (page === 'compression') {
        const qSlider = document.getElementById('qualitySlider');
        const qValue = document.getElementById('qualityValue');
        if (qSlider && qValue) qSlider.addEventListener('input', (e) => { qValue.textContent = e.target.value + '%'; });
        
        document.getElementById('compressBtn')?.addEventListener('click', async () => {
            const btn = document.getElementById('compressBtn');
            btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Compression...';
            compressed = [];
            const q = qSlider ? parseInt(qSlider.value) / 100 : 0.8;
            for (let i = 0; i < files.length; i++) await convertImage(files[i], i, q, 'image/webp', '.webp');
            btn.disabled = false; btn.innerHTML = '<span>⚡</span> Compresser tout';
            document.getElementById('downloadAllBtn').disabled = false;
            document.getElementById('zipBtn').disabled = false;
            updateStats();
        });
    } 
    else if (page === 'webp') {
        document.getElementById('convertBtn')?.addEventListener('click', async () => {
            const btn = document.getElementById('convertBtn');
            btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Conversion...';
            compressed = [];
            for (let i = 0; i < files.length; i++) await convertImage(files[i], i, 0.85, 'image/webp', '.webp');
            btn.disabled = false; btn.innerHTML = '<span>🔄</span> Convertir en WebP';
            document.getElementById('downloadAllBtn').disabled = false;
            document.getElementById('zipBtn').disabled = false;
            updateStats();
        });
    } 
    else if (page === 'avif') {
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                avifOutputFormat = btn.dataset.format;
                document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                avifOutputFormat = btn.dataset.quick;
                document.querySelectorAll('.format-btn').forEach(b => b.classList.toggle('active', b.dataset.format === avifOutputFormat));
            });
        });

        document.getElementById('convertBtn')?.addEventListener('click', async () => {
            const btn = document.getElementById('convertBtn');
            btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Conversion...';
            compressed = [];
            const mime = avifOutputFormat === 'png' ? 'image/png' : 'image/jpeg';
            const ext = avifOutputFormat === 'png' ? '.png' : '.jpg';
            for (let i = 0; i < files.length; i++) await convertImage(files[i], i, 0.92, mime, ext);
            btn.disabled = false; btn.innerHTML = '<span>🔄</span> Convertir';
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
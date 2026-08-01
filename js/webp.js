// ========== ÉTAT GLOBAL POUR WEBP CONVERTER ==========
let webpFiles = [];
let convertedWebpImages = [];
const MAX_WEBP_FILES = 10;
const MAX_WEBP_SIZE = 5 * 1024 * 1024; // 5 MB

console.log('🎨 webp.js chargé');

// ========== UTILITAIRES ==========
function formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function validateWebpFile(file) {
    if (!file || file.size === 0) return { valid: false, reason: 'Fichier vide.' };
    if (file.size > MAX_WEBP_SIZE) return { valid: false, reason: 'Dépasse 5 MB.' };
    
    const type = file.type;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(type)) {
        return { valid: false, reason: 'Format non supporté (PNG/JPG uniquement).' };
    }
    return { valid: true };
}

// ========== CRÉATION DES CARTES D'IMAGES ==========
function createWebpCard(file, index) {
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
    img.width = 300;
    img.height = 150;

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
    compSize.id = `webp-size-${index}`;
    compSize.style.display = 'none';
    const savings = document.createElement('span');
    savings.className = 'savings';
    savings.id = `webp-savings-${index}`;
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
    dlBtn.id = `webp-download-${index}`;
    dlBtn.style.display = 'none';
    dlBtn.textContent = '💾 Télécharger .webp';
    actions.appendChild(dlBtn);

    card.appendChild(preview);
    card.appendChild(info);
    card.appendChild(actions);

    return card;
}

// ========== CONVERSION VERS WEBP ==========
async function convertToWebp(file, index) {
    try {
        console.log(`Conversion de ${file.name} en WebP...`);
        
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
        
        // Conversion en WebP avec qualité par défaut (0.8)
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((result) => {
                if (result) resolve(result);
                else reject(new Error('Erreur de conversion'));
            }, 'image/webp', 0.8);
        });
        
        const newName = file.name.replace(/\.[^.]+$/, '') + '.webp';
        
        convertedWebpImages[index] = { 
            blob, 
            name: newName, 
            size: blob.size, 
            originalSize: file.size 
        };
        
        // Mise à jour UI
        const sizeEl = document.getElementById(`webp-size-${index}`);
        const savEl = document.getElementById(`webp-savings-${index}`);
        
        if (sizeEl) {
            sizeEl.style.display = 'inline-block';
            sizeEl.textContent = formatSize(blob.size);
        }
        
        const variation = ((1 - blob.size / file.size) * 100).toFixed(1);
        if (savEl) {
            savEl.style.display = 'inline-block';
            savEl.textContent = `-${Math.abs(variation)}%`;
            savEl.style.color = variation > 0 ? '#10b981' : '#ef4444'; // Vert si gain, rouge si perte
        }
        
        const dlBtn = document.getElementById(`webp-download-${index}`);
        if (dlBtn) {
            dlBtn.style.display = 'inline-flex';
            dlBtn.onclick = () => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = newName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 100);
            };
        }
        
    } catch (error) {
        console.error('Erreur conversion WebP:', error);
        showToast(`Erreur lors de la conversion de ${file.name}`, 'error');
    }
}

// ========== STATISTIQUES ==========
function updateWebpStats() {
    const stats = document.getElementById('stats');
    if (!stats) return;
    
    const total = convertedWebpImages.filter(c => c).length;
    if (total === 0) { stats.style.display = 'none'; return; }
    
    const orig = convertedWebpImages.reduce((sum, c) => sum + (c?.originalSize || 0), 0);
    const newSize = convertedWebpImages.reduce((sum, c) => sum + (c?.size || 0), 0);
    const variation = ((1 - newSize / orig) * 100).toFixed(1);
    
    stats.style.display = 'grid';
    document.getElementById('totalFiles').textContent = total;
    document.getElementById('originalSize').textContent = formatSize(orig);
    document.getElementById('compressedSize').textContent = formatSize(newSize);
    document.getElementById('savingsPercent').textContent = `-${Math.abs(variation)}%`;
}

// ========== TÉLÉCHARGEMENTS ==========
function downloadAllWebp() {
    convertedWebpImages.forEach((item, index) => {
        if (item) {
            setTimeout(() => {
                const url = URL.createObjectURL(item.blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = item.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 100);
            }, index * 200);
        }
    });
}

async function downloadWebpAsZip() {
    const zipBtn = document.getElementById('zipBtn');
    const validFiles = convertedWebpImages.filter(c => c && c.blob);
    
    if (validFiles.length === 0) {
        showToast('Aucun fichier converti disponible', 'warning');
        return;
    }
    
    if (typeof JSZip === 'undefined') {
        showToast('Erreur : Bibliothèque ZIP non chargée', 'error');
        return;
    }
    
    zipBtn.disabled = true;
    const originalHTML = zipBtn.innerHTML;
    zipBtn.innerHTML = '<span class="loading"></span> Création ZIP...';

    try {
        const zip = new JSZip();
        validFiles.forEach(item => zip.file(item.name, item.blob));
        
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hopla-webp-conversion.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        zipBtn.innerHTML = '<span>✅</span> ZIP téléchargé !';
        setTimeout(() => { 
            zipBtn.disabled = false; 
            zipBtn.innerHTML = originalHTML; 
        }, 3000);
        
    } catch (err) {
        console.error('Erreur ZIP WebP:', err);
        zipBtn.innerHTML = '<span>❌</span> Erreur';
        zipBtn.disabled = false;
        showToast('Erreur lors de la création du ZIP', 'error');
    }
}

// ========== GESTION DES FICHIERS ==========
async function handleWebpFiles(fileList) {
    const selectedFiles = Array.from(fileList).slice(0, MAX_WEBP_FILES);
    const validatedFiles = [];

    for (const file of selectedFiles) {
        const validation = await validateWebpFile(file);
        if (!validation.valid) {
            showToast(`${file.name} : ${validation.reason}`, 'error');
            continue;
        }
        validatedFiles.push(file);
    }

    webpFiles = validatedFiles;

    if (webpFiles.length > 0) {
        const actionBar = document.getElementById('actionBar');
        if (actionBar) actionBar.style.display = 'flex';
        
        const grid = document.getElementById('imagesGrid');
        if (grid) {
            while (grid.firstChild) grid.removeChild(grid.firstChild);
            webpFiles.forEach((f, i) => grid.appendChild(createWebpCard(f, i)));
        }
    }
}

// ========== RÉINITIALISATION ==========
function clearWebpConverter() {
    webpFiles = [];
    convertedWebpImages = [];
    
    const grid = document.getElementById('imagesGrid');
    if (grid) while (grid.firstChild) grid.removeChild(grid.firstChild);
    
    const actionBar = document.getElementById('actionBar');
    if (actionBar) actionBar.style.display = 'none';
    
    const stats = document.getElementById('stats');
    if (stats) stats.style.display = 'none';
    
    const zipBtn = document.getElementById('zipBtn');
    if (zipBtn) zipBtn.disabled = true;
    
    const dlBtn = document.getElementById('downloadAllBtn');
    if (dlBtn) dlBtn.disabled = true;
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
}

// ========== INITIALISATION DE LA PAGE ==========
function initWebpPage() {
    console.log('🚀 Initialisation de la page WebP');
    
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const chooseBtn = document.getElementById('chooseFilesBtn');
    
    if (!uploadZone) return;

    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => uploadZone.classList.add('dragover'), false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => uploadZone.classList.remove('dragover'), false);
    });
    
    uploadZone.addEventListener('drop', (e) => handleWebpFiles(e.dataTransfer.files), false);
    
    // Input file
    if (fileInput) {
        fileInput.addEventListener('change', (e) => handleWebpFiles(e.target.files));
    }
    
    // Bouton choisir fichiers
    if (chooseBtn) {
        chooseBtn.addEventListener('click', () => fileInput && fileInput.click());
    }

    // Bouton convertir
    const convertBtn = document.getElementById('convertBtn');
    if (convertBtn) {
        convertBtn.addEventListener('click', async () => {
            if (webpFiles.length === 0) return;
            
            convertBtn.disabled = true;
            const originalText = convertBtn.innerHTML;
            convertBtn.innerHTML = '<span class="loading"></span> Conversion...';
            
            convertedWebpImages = [];
            
            for (let i = 0; i < webpFiles.length; i++) {
                await convertToWebp(webpFiles[i], i);
            }
            
            convertBtn.disabled = false;
            convertBtn.innerHTML = originalText;
            
            document.getElementById('downloadAllBtn').disabled = false;
            document.getElementById('zipBtn').disabled = false;
            
            updateWebpStats();
            showToast('Conversion WebP terminée !', 'success');
        });
    }

    // Boutons de téléchargement
    const zipBtn = document.getElementById('zipBtn');
    if (zipBtn) zipBtn.addEventListener('click', downloadWebpAsZip);
    
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    if (downloadAllBtn) downloadAllBtn.addEventListener('click', downloadAllWebp);
    
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearWebpConverter);
}

// Exporter la fonction
if (typeof window !== 'undefined') {
    window.initWebpPage = initWebpPage;
}
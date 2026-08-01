// ========== ÉTAT GLOBAL POUR AVIF CONVERTER ==========
let avifFiles = [];
let convertedAvifImages = [];
let targetFormat = 'png'; // Par défaut
const MAX_AVIF_FILES = 10;
const MAX_AVIF_SIZE = 5 * 1024 * 1024; // 5 MB

console.log('🎨 avif.js chargé');

// ========== UTILITAIRES ==========
function formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function validateAvifFile(file) {
    if (!file || file.size === 0) return { valid: false, reason: 'Fichier vide.' };
    if (file.size > MAX_AVIF_SIZE) return { valid: false, reason: 'Dépasse 5 MB.' };
    
    // Accepter AVIF ou image générique si le type n'est pas bien défini par l'OS
    const isAvif = file.type === 'image/avif' || file.name.toLowerCase().endsWith('.avif');
    if (!isAvif) {
        return { valid: false, reason: 'Format non supporté (AVIF uniquement).' };
    }
    return { valid: true };
}

// ========== CRÉATION DES CARTES D'IMAGES ==========
function createAvifCard(file, index) {
    const card = document.createElement('div');
    card.className = 'image-card';

    const url = URL.createObjectURL(file);

    const preview = document.createElement('div');
    preview.className = 'image-preview';
    const previewBox = document.createElement('div');
    previewBox.className = 'preview-box';
    const previewLabel = document.createElement('div');
    previewLabel.className = 'preview-label';
    previewLabel.textContent = 'Original (AVIF)';
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
    compSize.id = `avif-size-${index}`;
    compSize.style.display = 'none';
    const savings = document.createElement('span');
    savings.className = 'savings';
    savings.id = `avif-savings-${index}`;
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
    dlBtn.id = `avif-download-${index}`;
    dlBtn.style.display = 'none';
    dlBtn.textContent = `💾 Télécharger .${targetFormat === 'jpeg' ? 'jpg' : targetFormat}`;
    actions.appendChild(dlBtn);

    card.appendChild(preview);
    card.appendChild(info);
    card.appendChild(actions);

    return card;
}

// ========== CONVERSION AVIF VERS PNG/JPEG ==========
async function convertAvifImage(file, index, format) {
    try {
        console.log(`Conversion de ${file.name} vers ${format}...`);
        
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        
        const ctx = canvas.getContext('2d');
        // Fond blanc pour JPEG car il ne supporte pas la transparence
        if (format === 'jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(bitmap, 0, 0);
        
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const quality = format === 'jpeg' ? 0.9 : undefined; // Qualité élevée pour JPEG
        
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((result) => {
                if (result) resolve(result);
                else reject(new Error('Erreur de conversion'));
            }, mimeType, quality);
        });
        
        const ext = format === 'jpeg' ? 'jpg' : 'png';
        const newName = file.name.replace(/\.[^.]+$/, '') + `.${ext}`;
        
        convertedAvifImages[index] = { 
            blob, 
            name: newName, 
            size: blob.size, 
            originalSize: file.size 
        };
        
        // Mise à jour UI
        const sizeEl = document.getElementById(`avif-size-${index}`);
        const savEl = document.getElementById(`avif-savings-${index}`);
        
        if (sizeEl) {
            sizeEl.style.display = 'inline-block';
            sizeEl.textContent = formatSize(blob.size);
        }
        
        const variation = ((1 - blob.size / file.size) * 100).toFixed(1);
        if (savEl) {
            savEl.style.display = 'inline-block';
            // AVIF est souvent plus petit, donc la conversion vers PNG/JPEG peut augmenter la taille
            const sign = variation > 0 ? '-' : '+';
            savEl.textContent = `${sign}${Math.abs(variation)}%`;
            savEl.style.color = variation > 0 ? '#10b981' : '#f59e0b'; // Vert si gain, orange si perte
        }
        
        const dlBtn = document.getElementById(`avif-download-${index}`);
        if (dlBtn) {
            dlBtn.style.display = 'inline-flex';
            dlBtn.textContent = `💾 Télécharger .${ext}`;
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
        console.error('Erreur conversion AVIF:', error);
        showToast(`Erreur lors de la conversion de ${file.name}`, 'error');
    }
}

// ========== STATISTIQUES ==========
function updateAvifStats() {
    const stats = document.getElementById('stats');
    if (!stats) return;
    
    const total = convertedAvifImages.filter(c => c).length;
    if (total === 0) { stats.style.display = 'none'; return; }
    
    const orig = convertedAvifImages.reduce((sum, c) => sum + (c?.originalSize || 0), 0);
    const newSize = convertedAvifImages.reduce((sum, c) => sum + (c?.size || 0), 0);
    const variation = ((1 - newSize / orig) * 100).toFixed(1);
    
    stats.style.display = 'grid';
    document.getElementById('totalFiles').textContent = total;
    document.getElementById('originalSize').textContent = formatSize(orig);
    document.getElementById('compressedSize').textContent = formatSize(newSize);
    
    const sign = variation > 0 ? '-' : '+';
    document.getElementById('savingsPercent').textContent = `${sign}${Math.abs(variation)}%`;
}

// ========== TÉLÉCHARGEMENTS ==========
function downloadAllAvif() {
    convertedAvifImages.forEach((item, index) => {
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

async function downloadAvifAsZip() {
    const zipBtn = document.getElementById('zipBtn');
    const validFiles = convertedAvifImages.filter(c => c && c.blob);
    
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
        a.download = `hopla-avif-conversion.zip`;
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
        console.error('Erreur ZIP AVIF:', err);
        zipBtn.innerHTML = '<span>❌</span> Erreur';
        zipBtn.disabled = false;
        showToast('Erreur lors de la création du ZIP', 'error');
    }
}

// ========== GESTION DES FICHIERS ==========
async function handleAvifFiles(fileList) {
    const selectedFiles = Array.from(fileList).slice(0, MAX_AVIF_FILES);
    const validatedFiles = [];

    for (const file of selectedFiles) {
        const validation = await validateAvifFile(file);
        if (!validation.valid) {
            showToast(`${file.name} : ${validation.reason}`, 'error');
            continue;
        }
        validatedFiles.push(file);
    }

    avifFiles = validatedFiles;

    if (avifFiles.length > 0) {
        const actionBar = document.getElementById('actionBar');
        if (actionBar) actionBar.style.display = 'flex';
        
        const grid = document.getElementById('imagesGrid');
        if (grid) {
            while (grid.firstChild) grid.removeChild(grid.firstChild);
            avifFiles.forEach((f, i) => grid.appendChild(createAvifCard(f, i)));
        }
    }
}

// ========== RÉINITIALISATION ==========
function clearAvifConverter() {
    avifFiles = [];
    convertedAvifImages = [];
    
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
function initAvifPage() {
    console.log('🚀 Initialisation de la page AVIF');
    
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const chooseBtn = document.getElementById('chooseFilesBtn');
    
    if (!uploadZone) return;

    // Gestion des boutons de format
    const formatBtns = document.querySelectorAll('.format-btn');
    formatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            formatBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            targetFormat = btn.dataset.format;
            console.log(`Format cible changé vers : ${targetFormat}`);
            
            // Mettre à jour les textes des boutons de téléchargement rapides si présents
            const quickBtns = document.querySelectorAll('.quick-btn');
            quickBtns.forEach(qb => {
                if (qb.dataset.quick === targetFormat) {
                    qb.classList.add('active'); // Optionnel : style visuel
                } else {
                    qb.classList.remove('active');
                }
            });
        });
    });

    // Boutons de conversion rapide
    const quickBtns = document.querySelectorAll('.quick-btn');
    quickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            targetFormat = btn.dataset.quick;
            // Simuler le clic sur le bouton de format correspondant
            const targetBtn = document.querySelector(`.format-btn[data-format="${targetFormat}"]`);
            if (targetBtn) targetBtn.click();
            
            // Si des fichiers sont déjà chargés, lancer la conversion directement
            if (avifFiles.length > 0) {
                document.getElementById('convertBtn').click();
            }
        });
    });

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
    
    uploadZone.addEventListener('drop', (e) => handleAvifFiles(e.dataTransfer.files), false);
    
    // Input file
    if (fileInput) {
        fileInput.addEventListener('change', (e) => handleAvifFiles(e.target.files));
    }
    
    // Bouton choisir fichiers
    if (chooseBtn) {
        chooseBtn.addEventListener('click', () => fileInput && fileInput.click());
    }

    // Bouton convertir
    const convertBtn = document.getElementById('convertBtn');
    if (convertBtn) {
        convertBtn.addEventListener('click', async () => {
            if (avifFiles.length === 0) return;
            
            convertBtn.disabled = true;
            const originalText = convertBtn.innerHTML;
            convertBtn.innerHTML = '<span class="loading"></span> Conversion...';
            
            convertedAvifImages = [];
            
            for (let i = 0; i < avifFiles.length; i++) {
                await convertAvifImage(avifFiles[i], i, targetFormat);
            }
            
            convertBtn.disabled = false;
            convertBtn.innerHTML = originalText;
            
            document.getElementById('downloadAllBtn').disabled = false;
            document.getElementById('zipBtn').disabled = false;
            
            updateAvifStats();
            showToast(`Conversion en ${targetFormat.toUpperCase()} terminée !`, 'success');
        });
    }

    // Boutons de téléchargement
    const zipBtn = document.getElementById('zipBtn');
    if (zipBtn) zipBtn.addEventListener('click', downloadAvifAsZip);
    
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    if (downloadAllBtn) downloadAllBtn.addEventListener('click', downloadAllAvif);
    
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearAvifConverter);
}

// Exporter la fonction
if (typeof window !== 'undefined') {
    window.initAvifPage = initAvifPage;
}
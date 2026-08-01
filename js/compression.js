// ========== ÉTAT GLOBAL POUR LA PAGE COMPRESSION ==========
let compressionFiles = [];
let compressedImages = [];
const MAX_COMPRESSION_FILES = 10;
const MAX_COMPRESSION_SIZE = 5 * 1024 * 1024; // 5 MB

// Vérification au chargement
console.log('🔧 compression.js chargé');
console.log('✅ JSZip disponible:', typeof JSZip !== 'undefined');

// ========== UTILITAIRES SPÉCIFIQUES À LA COMPRESSION ==========
function formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    if (isAvif(bytes)) return 'avif';
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

function isAvif(bytes) {
    return bytes.length >= 12 &&
        bytes[0] === 0x46 && bytes[1] === 0x4F && bytes[2] === 0x52 && bytes[3] === 0x4D &&
        bytes[8] === 0x41 && bytes[9] === 0x56 && bytes[10] === 0x49 && bytes[11] === 0x46;
}

function matchesExtension(detectedType, extension) {
    const map = {
        jpeg: ['jpg', 'jpeg'],
        png: ['png'],
        webp: ['webp'],
        avif: ['avif']
    };
    return map[detectedType]?.includes(extension) ?? false;
}

function matchesMime(detectedType, mime) {
    const map = {
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        avif: 'image/avif'
    };
    return !mime || map[detectedType] === mime;
}

async function validateCompressionFile(file) {
    if (!file || file.size === 0) {
        return { valid: false, reason: 'Le fichier est vide ou illisible.', detectedType: null };
    }

    if (file.size > MAX_COMPRESSION_SIZE) {
        return { valid: false, reason: 'Le fichier dépasse 5 MB.', detectedType: null };
    }

    const extension = getExtension(file.name);
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
    if (!allowedExtensions.includes(extension)) {
        return { valid: false, reason: 'Extension non autorisée. Formats acceptés : JPG, JPEG, PNG, WEBP.', detectedType: null };
    }

    let bytes;
    try {
        bytes = await readFileHeader(file, 16);
    } catch {
        return { valid: false, reason: 'Impossible de lire le fichier.', detectedType: null };
    }

    const detectedType = detectImageType(bytes);
    if (!detectedType) {
        return { valid: false, reason: 'Le fichier ne correspond pas à une vraie image JPG, PNG, WEBP ou AVIF.', detectedType: null };
    }

    if (!matchesExtension(detectedType, extension)) {
        return { valid: false, reason: `Incohérence détectée : le contenu du fichier semble être ${detectedType.toUpperCase()}, mais l'extension est .${extension}.`, detectedType };
    }

    if (!matchesMime(detectedType, file.type)) {
        return { valid: false, reason: `Incohérence détectée : le contenu semble être ${detectedType.toUpperCase()}, mais le type MIME déclaré est ${file.type || 'inconnu'}.`, detectedType };
    }

    return { valid: true, reason: '', detectedType };
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

// ========== CRÉATION DES CARTES D'IMAGES ==========
function createCompressionCard(file, index) {
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

// ========== COMPRESSION D'IMAGE ==========
async function compressImage(file, index, quality) {
    try {
        console.log(`Compression de ${file.name} avec qualité ${quality}`);
        
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
        
        // Déterminer le format original
        const extension = getExtension(file.name).toLowerCase();
        let mimeType = 'image/jpeg'; // Par défaut
        
        if (extension === 'png') {
            mimeType = 'image/png';
        } else if (extension === 'webp') {
            mimeType = 'image/webp';
        } else if (extension === 'avif') {
            mimeType = 'image/avif';
        }
        
        console.log(`Format détecté: ${mimeType}`);
        
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(new Error('toBlob a retourné null'));
                }
            }, mimeType, quality);
        });
        
        console.log(`Blob créé: ${blob.size} bytes`);
        
        // Créer un nouveau nom avec suffixe _compressed
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const newName = `${baseName}_compressed.${getExtension(file.name)}`;
        
        compressedImages[index] = { 
            blob, 
            name: newName, 
            size: blob.size, 
            originalSize: file.size 
        };
        
        // Mettre à jour l'affichage
        const compEl = document.getElementById(`compressed-${index}`);
        const savEl = document.getElementById(`savings-${index}`);
        
        if (compEl) { 
            compEl.style.display = 'inline-block'; 
            compEl.textContent = formatSize(blob.size); 
        }
        
        const variation = ((1 - blob.size / file.size) * 100).toFixed(1);
        if (savEl) { 
            savEl.style.display = 'inline-block'; 
            savEl.textContent = `${variation > 0 ? '-' : '+'}${Math.abs(variation)}%`; 
        }
        
        const dlBtn = document.getElementById(`download-${index}`);
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
        
        console.log(`✅ Compression réussie pour ${file.name}`);
    } catch (error) { 
        console.error('❌ Erreur de compression:', error);
        showToast(`Erreur lors de la compression de ${file.name}: ${error.message}`, 'error');
    }
}

// ========== MISE À JOUR DES STATISTIQUES ==========
function updateCompressionStats() {
    const stats = document.getElementById('stats');
    if (!stats) return;
    
    const total = compressedImages.filter(c => c).length;
    if (total === 0) { 
        stats.style.display = 'none'; 
        return; 
    }
    
    const orig = compressedImages.reduce((sum, c) => sum + (c?.originalSize || 0), 0);
    const newSize = compressedImages.reduce((sum, c) => sum + (c?.size || 0), 0);
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

// ========== TÉLÉCHARGEMENTS ==========
function downloadAllCompressed() {
    compressedImages.forEach((item, index) => {
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

async function downloadAsZip() {
    console.log('📦 Début création ZIP');
    
    const zipBtn = document.getElementById('zipBtn');
    
    // Vérifier qu'il y a des fichiers compressés
    const validFiles = compressedImages.filter(c => c && c.blob);
    console.log('Fichiers valides:', validFiles.length);
    
    if (validFiles.length === 0) {
        showToast('Aucun fichier compressé disponible', 'warning');
        return;
    }
    
    // Vérifier que JSZip est disponible
    if (typeof JSZip === 'undefined') {
        console.error('❌ JSZip non défini');
        showToast('Erreur : Bibliothèque ZIP non chargée. Veuillez recharger la page.', 'error');
        return;
    }
    
    console.log('✅ JSZip version:', JSZip.version || 'inconnue');
    
    zipBtn.disabled = true;
    const originalHTML = zipBtn.innerHTML;
    zipBtn.innerHTML = '<span class="loading"></span> Création ZIP...';

    try {
        const zip = new JSZip();
        
        // Ajouter chaque fichier au ZIP
        validFiles.forEach((item, index) => {
            if (item && item.blob && item.name) {
                console.log(`Ajout au ZIP: ${item.name} (${item.size} bytes)`);
                zip.file(item.name, item.blob);
            }
        });
        
        console.log('Génération du ZIP...');
        
        // Générer le ZIP
        const content = await zip.generateAsync({ 
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 6 }
        });
        
        console.log(`✅ ZIP généré: ${content.size} bytes`);
        
        // Créer le lien de téléchargement
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hopla-tinyimg-compression-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Nettoyer l'URL après un court délai
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        // Message de succès
        zipBtn.innerHTML = '<span>✅</span> ZIP téléchargé !';
        setTimeout(() => { 
            zipBtn.disabled = false; 
            zipBtn.innerHTML = originalHTML; 
        }, 3000);
        
        showToast(`${validFiles.length} fichier(s) compressé(s) en ZIP`, 'success');
        console.log('✅ Téléchargement ZIP réussi');
        
    } catch (err) {
        console.error('❌ Erreur détaillée ZIP:', err);
        console.error('Stack:', err.stack);
        zipBtn.innerHTML = '<span>❌</span> Erreur ZIP';
        zipBtn.disabled = false;
        
        let errorMessage = 'Erreur lors de la création du fichier ZIP';
        if (err.message) {
            errorMessage += ': ' + err.message;
        }
        showToast(errorMessage, 'error');
    }
}

// ========== GESTION DES FICHIERS ==========
async function handleCompressionFiles(fileList) {
    const selectedFiles = Array.from(fileList).slice(0, MAX_COMPRESSION_FILES);
    const validatedFiles = [];

    for (const file of selectedFiles) {
        const validation = await validateCompressionFile(file);
        if (!validation.valid) {
            showToast(`${file.name} : ${validation.reason}`, 'error');
            continue;
        }
        validatedFiles.push(file);
    }

    compressionFiles = validatedFiles;

    if (compressionFiles.length > 0) {
        const controls = document.getElementById('controls');
        if (controls) controls.style.display = 'flex';
        
        const actionBar = document.getElementById('actionBar');
        if (actionBar) actionBar.style.display = 'flex';
        
        const grid = document.getElementById('imagesGrid');
        if (grid) {
            while (grid.firstChild) grid.removeChild(grid.firstChild);
            compressionFiles.forEach((f, i) => grid.appendChild(createCompressionCard(f, i)));
        }
        
        updateCompressionStats();
    }
}

// ========== RÉINITIALISATION ==========
function clearCompression() {
    compressionFiles = [];
    compressedImages = [];
    
    const grid = document.getElementById('imagesGrid');
    if (grid) { 
        while (grid.firstChild) grid.removeChild(grid.firstChild); 
    }
    
    const controls = document.getElementById('controls');
    if (controls) controls.style.display = 'none';
    
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

// ========== INITIALISATION DE LA PAGE COMPRESSION ==========
function initCompressionPage() {
    console.log('🚀 Initialisation de la page compression');
    
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const chooseBtn = document.getElementById('chooseFilesBtn');
    
    if (!uploadZone) {
        console.error('❌ uploadZone non trouvé');
        return;
    }

    // Drag & Drop
    setupDragAndDrop(uploadZone, handleCompressionFiles);
    
    // Input file
    if (fileInput) {
        fileInput.addEventListener('change', (e) => handleCompressionFiles(e.target.files));
    }
    
    // Bouton choisir fichiers
    if (chooseBtn) {
        chooseBtn.addEventListener('click', () => fileInput && fileInput.click());
    }

    // Slider de qualité
    const qSlider = document.getElementById('qualitySlider');
    const qValue = document.getElementById('qualityValue');
    if (qSlider && qValue) {
        qSlider.addEventListener('input', (e) => { 
            qValue.textContent = e.target.value + '%'; 
        });
    }
    
    // Bouton compresser
    const compressBtn = document.getElementById('compressBtn');
    if (compressBtn) {
        compressBtn.addEventListener('click', async () => {
            console.log('🔘 Bouton compresser cliqué');
            
            if (compressionFiles.length === 0) {
                showToast('Veuillez d\'abord sélectionner des fichiers', 'warning');
                return;
            }
            
            compressBtn.disabled = true;
            const originalText = compressBtn.innerHTML;
            compressBtn.innerHTML = '<span class="loading"></span> Compression...';
            
            try {
                compressedImages = [];
                const q = qSlider ? parseInt(qSlider.value) / 100 : 0.8;
                
                console.log(`Début compression de ${compressionFiles.length} fichiers avec qualité ${q}`);
                
                for (let i = 0; i < compressionFiles.length; i++) {
                    await compressImage(compressionFiles[i], i, q);
                }
                
                console.log('✅ Toutes les compressions terminées');
                
                compressBtn.disabled = false;
                compressBtn.innerHTML = originalText;
                
                const downloadAllBtn = document.getElementById('downloadAllBtn');
                if (downloadAllBtn) downloadAllBtn.disabled = false;
                
                const zipBtn = document.getElementById('zipBtn');
                if (zipBtn) zipBtn.disabled = false;
                
                updateCompressionStats();
                showToast('Compression terminée avec succès !', 'success');
            } catch (error) {
                console.error('❌ Erreur pendant la compression:', error);
                compressBtn.disabled = false;
                compressBtn.innerHTML = originalText;
                showToast('Erreur lors de la compression', 'error');
            }
        });
    }

    // Boutons de téléchargement
    const zipBtn = document.getElementById('zipBtn');
    if (zipBtn) {
        zipBtn.addEventListener('click', downloadAsZip);
    }
    
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', downloadAllCompressed);
    }
    
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCompression);
    }
    
    console.log('✅ Page compression initialisée');
}

// Exporter la fonction d'initialisation
if (typeof window !== 'undefined') {
    window.initCompressionPage = initCompressionPage;
}
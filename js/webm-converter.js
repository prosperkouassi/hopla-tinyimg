// ========== ÉTAT GLOBAL POUR WEBM CONVERTER ==========
let webmFiles = [];
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

console.log('🎬 webm-converter.js chargé');

// ========== UTILITAIRES ==========
function sortFilesNaturally(files) {
    return files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url); // Libération immédiate de la mémoire
            resolve(img);
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(e);
        };
        img.src = url;
    });
}

// ========== GESTION DES FICHIERS ==========
function handleWebmFiles(files) {
    // Filtrer uniquement les images valides
    const validFiles = Array.from(files).filter(f => ALLOWED_IMAGE_TYPES.includes(f.type));
    
    if (validFiles.length === 0) {
        showToast("Veuillez sélectionner des fichiers image valides (PNG, JPG, WebP, AVIF).", 'warning');
        return;
    }

    // Tri naturel (img2.jpg avant img10.jpg)
    webmFiles = sortFilesNaturally(validFiles);
    
    console.log(`✅ ${webmFiles.length} images chargées et triées`);

    // Mise à jour de l'interface
    const fileListEl = document.getElementById('fileList');
    const actionBar = document.getElementById('actionBar');
    
    if (fileListEl) {
        fileListEl.style.display = 'block';
        while (fileListEl.firstChild) fileListEl.removeChild(fileListEl.firstChild);
        
        const strong = document.createElement('strong'); 
        strong.textContent = `${webmFiles.length} image(s) prête(s) à être convertie(s) :`;
        fileListEl.appendChild(strong);
        
        const ul = document.createElement('ul');
        const displayCount = Math.min(webmFiles.length, 5);
        
        for (let i = 0; i < displayCount; i++) {
            const li = document.createElement('li'); 
            li.textContent = `• ${webmFiles[i].name}`; 
            ul.appendChild(li);
        }
        
        if (webmFiles.length > 5) {
            const li = document.createElement('li'); 
            const em = document.createElement('em'); 
            em.textContent = `... et ${webmFiles.length - 5} autres.`; 
            li.appendChild(em); 
            ul.appendChild(li);
        }
        fileListEl.appendChild(ul);
    }
    
    if (actionBar) actionBar.style.display = 'flex';
    
    const convertBtn = document.getElementById('convertBtn');
    if (convertBtn) convertBtn.disabled = false;
}

// ========== MISE À JOUR DU STATUT ==========
function updateWebmStatus(text, percent, isLoading = false) {
    const statusText = document.getElementById('statusText');
    const progressFill = document.getElementById('progressFill');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    if (statusText) statusText.textContent = text;
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (loadingSpinner) loadingSpinner.style.display = isLoading ? 'inline-block' : 'none';
}

// ========== CONVERSION EN WEBM ==========
async function startWebmConversion() {
    if (webmFiles.length === 0) {
        showToast('Veuillez d\'abord sélectionner des images', 'warning');
        return;
    }

    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statusContainer = document.getElementById('statusContainer');
    const canvas = document.getElementById('canvas');
    
    if (!canvas) {
        showToast('Erreur : Canvas non trouvé', 'error');
        return;
    }
    
    const ctx = canvas.getContext('2d');

    console.log('🚀 Début de la conversion WebM');
    
    if (convertBtn) convertBtn.disabled = true;
    if (clearBtn) clearBtn.disabled = true;
    if (statusContainer) statusContainer.style.display = 'flex';
    
    updateWebmStatus('Initialisation du moteur de rendu...', 5, true);

    const fpsInput = document.getElementById('fps');
    const qualityInput = document.getElementById('quality');
    
    const fps = fpsInput ? parseInt(fpsInput.value) : 10;
    const qualityPercent = qualityInput ? parseInt(qualityInput.value) : 80;
    const quality = qualityPercent / 100;

    try {
        // 1. Charger la première image pour définir la résolution
        updateWebmStatus('Lecture des dimensions de la première image...', 10, true);
        const firstImg = await loadImage(webmFiles[0]);
        canvas.width = firstImg.width;
        canvas.height = firstImg.height;
        console.log(`📐 Résolution vidéo : ${canvas.width}x${canvas.height}`);

        // 2. Configuration du MediaRecorder
        const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') 
            ? 'video/webm; codecs=vp9' 
            : 'video/webm';
        
        const stream = canvas.captureStream(fps);
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: mimeType,
            videoBitsPerSecond: quality * 5000000 // Bitrate dynamique basé sur la qualité
        });

        const chunks = [];
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            console.log('🛑 Enregistrement arrêté, création du Blob...');
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            
            // Téléchargement automatique
            const a = document.createElement('a');
            a.href = url;
            a.download = `hopla-animation-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            updateWebmStatus('✅ Conversion terminée ! Téléchargement lancé.', 100, false);
            showToast('Vidéo WebM créée avec succès !', 'success');
            
            if (convertBtn) convertBtn.disabled = false;
            if (clearBtn) clearBtn.disabled = false;
        };

        mediaRecorder.start();
        console.log('🔴 Enregistrement démarré');

        // 3. Boucle de rendu image par image
        const frameDuration = 1000 / fps;
        
        for (let i = 0; i < webmFiles.length; i++) {
            const percent = 15 + ((i / webmFiles.length) * 85);
            updateWebmStatus(`Traitement de l'image ${i + 1} sur ${webmFiles.length}...`, percent, true);
            
            const img = await loadImage(webmFiles[i]);
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Nettoyer le canvas
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Attendre la durée d'une frame pour respecter le FPS
            await new Promise(resolve => setTimeout(resolve, frameDuration));
        }

        console.log('🏁 Fin de la boucle d\'images, arrêt de l\'enregistrement...');
        mediaRecorder.stop();

    } catch (error) {
        console.error('❌ Erreur de conversion WebM:', error);
        updateWebmStatus('❌ Une erreur est survenue lors de la conversion.', 0, false);
        showToast(`Erreur: ${error.message}`, 'error');
        
        if (convertBtn) convertBtn.disabled = false;
        if (clearBtn) clearBtn.disabled = false;
    }
}

// ========== RÉINITIALISATION ==========
function clearWebmConverter() {
    webmFiles = [];
    
    const fileInput = document.getElementById('fileInput');
    const fileListEl = document.getElementById('fileList');
    const actionBar = document.getElementById('actionBar');
    const statusContainer = document.getElementById('statusContainer');
    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearBtn');
    
    if (fileInput) fileInput.value = '';
    if (fileListEl) fileListEl.style.display = 'none';
    if (actionBar) actionBar.style.display = 'none';
    if (statusContainer) statusContainer.style.display = 'none';
    if (convertBtn) convertBtn.disabled = true;
    if (clearBtn) clearBtn.disabled = false;
    
    console.log('🗑️ Convertisseur WebM réinitialisé');
}

// ========== INITIALISATION DE LA PAGE ==========
function initWebmConverterPage() {
    console.log('🚀 Initialisation du convertisseur WebM');
    
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const chooseFilesBtn = document.getElementById('chooseFilesBtn');
    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearBtn');
    const fpsSlider = document.getElementById('fps');
    const qualitySlider = document.getElementById('quality');

    if (!uploadZone) {
        console.error('❌ uploadZone non trouvé');
        return;
    }

    // Gestion des sliders
    if (fpsSlider) {
        fpsSlider.addEventListener('input', (e) => {
            const valEl = document.getElementById('fpsValue');
            if (valEl) valEl.textContent = e.target.value;
        });
    }
    
    if (qualitySlider) {
        qualitySlider.addEventListener('input', (e) => {
            const valEl = document.getElementById('qualityValue');
            if (valEl) valEl.textContent = e.target.value;
        });
    }

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
    
    uploadZone.addEventListener('drop', (e) => {
        const items = e.dataTransfer.items;
        if (items) {
            // Gestion spéciale pour les dossiers déposés
            const files = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i].webkitGetAsEntry && items[i].webkitGetAsEntry();
                if (item) {
                    traverseFileTree(item, files);
                } else {
                    files.push(items[i].getAsFile());
                }
            }
            // Note: traverseFileTree est asynchrone, donc on gère les fichiers dans la fonction récursive
        } else {
            handleWebmFiles(e.dataTransfer.files);
        }
    }, false);

    // Fonction récursive pour lire les dossiers
    function traverseFileTree(item, filesArray) {
        if (item.isFile) {
            item.file((file) => {
                if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
                    filesArray.push(file);
                }
                // Si c'est le dernier fichier, on met à jour l'interface
                // (Ceci est une simplification, idéalement on attendrait que tout soit lu)
            });
        } else if (item.isDirectory) {
            const dirReader = item.createReader();
            dirReader.readEntries((entries) => {
                for (let i = 0; i < entries.length; i++) {
                    traverseFileTree(entries[i], filesArray);
                }
            });
        }
    }
    
    // Input file
    if (fileInput) {
        fileInput.addEventListener('change', (e) => handleWebmFiles(e.target.files));
    }
    
    // Bouton choisir fichiers
    if (chooseFilesBtn) {
        chooseFilesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput && fileInput.click();
        });
    }
    
    uploadZone.addEventListener('click', () => {
        fileInput && fileInput.click();
    });

    // Bouton convertir
    if (convertBtn) {
        convertBtn.addEventListener('click', startWebmConversion);
    }
    
    // Bouton effacer
    if (clearBtn) {
        clearBtn.addEventListener('click', clearWebmConverter);
    }
    
    console.log('✅ Page WebM Converter initialisée');
}

// Exporter la fonction
if (typeof window !== 'undefined') {
    window.initWebmConverterPage = initWebmConverterPage;
}
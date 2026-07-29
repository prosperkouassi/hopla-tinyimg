document.addEventListener('DOMContentLoaded', () => {
    // Éléments du DOM
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const chooseFilesBtn = document.getElementById('chooseFilesBtn');
    const fileListEl = document.getElementById('fileList');
    const actionBar = document.getElementById('actionBar');
    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statusContainer = document.getElementById('statusContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const statusText = document.getElementById('statusText');
    const progressFill = document.getElementById('progressFill');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    let selectedFiles = [];

    // Mise à jour des affichages de paramètres
    document.getElementById('fps').addEventListener('input', (e) => {
        document.getElementById('fpsValue').textContent = e.target.value;
    });
    
    document.getElementById('quality').addEventListener('input', (e) => {
        document.getElementById('qualityValue').textContent = e.target.value;
    });

    // Gestion du Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    
    // Clic sur la zone ou le bouton déclenche l'input
    chooseFilesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        // Filtrer uniquement les images
        selectedFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        
        if (selectedFiles.length === 0) {
            alert("Veuillez sélectionner des fichiers image valides (PNG, JPG, WebP, AVIF).");
            return;
        }

        // Tri naturel pour que img2.jpg vienne avant img10.jpg
        selectedFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        
        // Affichage de la liste résumée
        fileListEl.style.display = 'block';
        actionBar.style.display = 'flex';
        statusContainer.style.display = 'none';
        
        let listHTML = `<strong>${selectedFiles.length} image(s) prête(s) à être convertie(s) :</strong><ul>`;
        
        const displayCount = Math.min(selectedFiles.length, 5);
        for (let i = 0; i < displayCount; i++) {
            listHTML += `<li>• ${selectedFiles[i].name}</li>`;
        }
        
        if (selectedFiles.length > 5) {
            listHTML += `<li><em>... et ${selectedFiles.length - 5} autres.</em></li>`;
        }
        listHTML += `</ul>`;
        fileListEl.innerHTML = listHTML;
        
        convertBtn.disabled = false;
    }

    // Fonction utilitaire pour charger une image sans fuite de mémoire
    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url); // Libération immédiate de la mémoire
                resolve(img);
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    function updateStatus(text, percent, isLoading = false) {
        statusText.textContent = text;
        progressFill.style.width = `${percent}%`;
        loadingSpinner.style.display = isLoading ? 'inline-block' : 'none';
    }

    // Cœur de la conversion
    convertBtn.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;

        convertBtn.disabled = true;
        clearBtn.disabled = true;
        statusContainer.style.display = 'flex';
        updateStatus('Initialisation du moteur de rendu...', 5, true);

        const fps = parseInt(document.getElementById('fps').value);
        const qualityPercent = parseInt(document.getElementById('quality').value);
        const quality = qualityPercent / 100;

        try {
            // Charger la première image pour définir la taille du canvas (résolution de la vidéo)
            updateStatus('Lecture des dimensions de la première image...', 10, true);
            const firstImg = await loadImage(selectedFiles[0]);
            canvas.width = firstImg.width;
            canvas.height = firstImg.height;

            // Configuration du MediaRecorder
            const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') 
                ? 'video/webm; codecs=vp9' 
                : 'video/webm';
            
            const stream = canvas.captureStream(fps);
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                videoBitsPerSecond: quality * 5000000 // Ex: 0.8 * 5Mbps = 4Mbps
            });

            const chunks = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                
                // Déclencher le téléchargement
                const a = document.createElement('a');
                a.href = url;
                a.download = `animation_hopla_${Date.now()}.webm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                updateStatus('✅ Conversion terminée ! Téléchargement lancé.', 100, false);
                convertBtn.disabled = false;
                clearBtn.disabled = false;
            };

            mediaRecorder.start();

            // Boucle de rendu image par image
            const frameDuration = 1000 / fps;
            for (let i = 0; i < selectedFiles.length; i++) {
                const percent = 15 + ((i / selectedFiles.length) * 85);
                updateStatus(`Traitement de l'image ${i + 1} sur ${selectedFiles.length}...`, percent, true);
                
                const img = await loadImage(selectedFiles[i]);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Pause pour respecter le FPS demandé
                await new Promise(resolve => setTimeout(resolve, frameDuration));
            }

            mediaRecorder.stop();

        } catch (error) {
            console.error("Erreur de conversion :", error);
            updateStatus('❌ Une erreur est survenue lors de la conversion.', 0, false);
            convertBtn.disabled = false;
            clearBtn.disabled = false;
        }
    });

    // Bouton Effacer
    clearBtn.addEventListener('click', () => {
        selectedFiles = [];
        fileInput.value = '';
        fileListEl.style.display = 'none';
        actionBar.style.display = 'none';
        statusContainer.style.display = 'none';
        convertBtn.disabled = true;
        clearBtn.disabled = false;
    });
});
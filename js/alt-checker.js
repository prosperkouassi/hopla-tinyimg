// ========== ALT TEXT CHECKER ==========

const MAX_ALT_LENGTH = 125;

document.addEventListener('DOMContentLoaded', () => {
    const checkBtn = document.getElementById('checkBtn');
    const urlInput = document.getElementById('urlInput');
    const loadingState = document.getElementById('loadingState');
    const resultsState = document.getElementById('resultsState');

    if (checkBtn) {
        checkBtn.addEventListener('click', async () => {
            const url = urlInput.value.trim();
            
            if (!url) {
                alert('Veuillez entrer une URL valide');
                return;
            }

            // Afficher le chargement
            loadingState.style.display = 'block';
            resultsState.style.display = 'none';
            checkBtn.disabled = true;

            try {
                await analyzePage(url);
            } catch (error) {
                console.error('Erreur:', error);
                alert('Erreur lors de l\'analyse de la page. Vérifiez l\'URL et réessayez.');
            } finally {
                loadingState.style.display = 'none';
                checkBtn.disabled = false;
            }
        });
    }
});

async function analyzePage(url) {
    try {
        // Utiliser un proxy CORS pour éviter les problèmes de sécurité
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error('Impossible de charger la page');
        }

        const html = await response.text();
        const images = extractImages(html);
        const analysis = analyzeImages(images);
        displayResults(analysis, url);
        
    } catch (error) {
        console.error('Erreur:', error);
        throw error;
    }
}

function extractImages(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const imgElements = doc.querySelectorAll('img');
    
    const images = [];
    imgElements.forEach((img, index) => {
        const src = img.getAttribute('src') || 'src non spécifié';
        const alt = img.getAttribute('alt');
        const altLength = alt ? alt.length : 0;
        
        images.push({
            index: index + 1,
            src: src,
            alt: alt,
            altLength: altLength,
            hasAlt: alt !== null,
            isEmpty: alt === '',
            isTooLong: altLength > MAX_ALT_LENGTH,
            isValid: alt !== null && alt !== '' && altLength <= MAX_ALT_LENGTH
        });
    });
    
    return images;
}

function analyzeImages(images) {
    const total = images.length;
    const validAlt = images.filter(img => img.isValid).length;
    const missingAlt = images.filter(img => !img.hasAlt).length;
    const emptyAlt = images.filter(img => img.isEmpty).length;
    const tooLong = images.filter(img => img.isTooLong).length;
    
    const score = total > 0 ? Math.round((validAlt / total) * 100) : 0;
    
    return {
        images,
        total,
        validAlt,
        missingAlt,
        emptyAlt,
        tooLong,
        score,
        recommendations: generateRecommendations(images, total, validAlt, missingAlt, emptyAlt, tooLong)
    };
}

function generateRecommendations(images, total, validAlt, missingAlt, emptyAlt, tooLong) {
    const recommendations = [];
    
    if (missingAlt > 0) {
        recommendations.push(` Ajoutez des balises alt aux ${missingAlt} image(s) qui en sont dépourvues. C'est essentiel pour l'accessibilité et le SEO.`);
    }
    
    if (emptyAlt > 0) {
        recommendations.push(`⚠️ ${emptyAlt} image(s) ont une balise alt vide. Si l'image est décorative, utilisez alt="" (c'est correct), sinon ajoutez une description.`);
    }
    
    if (tooLong > 0) {
        recommendations.push(` ${tooLong} image(s) ont un texte alt trop long (plus de ${MAX_ALT_LENGTH} caractères). Raccourcissez-les pour une meilleure expérience utilisateur.`);
    }
    
    if (validAlt === total && total > 0) {
        recommendations.push('✅ Excellent ! Toutes vos images ont des balises alt appropriées.');
    }
    
    if (total === 0) {
        recommendations.push('ℹ️ Aucune image trouvée sur cette page.');
    }
    
    recommendations.push('💡 Conseil : Un bon texte alt doit décrire l\'image de manière concise et inclure des mots-clés pertinents si approprié.');
    
    return recommendations;
}

function displayResults(analysis, pageUrl) {
    // Mettre à jour les statistiques
    document.getElementById('totalImages').textContent = analysis.total;
    document.getElementById('validAlt').textContent = analysis.validAlt;
    document.getElementById('missingAlt').textContent = analysis.missingAlt;
    document.getElementById('emptyAlt').textContent = analysis.emptyAlt;
    document.getElementById('longAlt').textContent = analysis.tooLong;
    
    // Afficher la liste des images
    const imagesList = document.getElementById('imagesList');
    imagesList.innerHTML = '';
    
    analysis.images.forEach(img => {
        const item = document.createElement('div');
        item.className = 'image-item';
        
        let statusClass = 'status-valid';
        let statusIcon = '✅';
        let statusText = 'Valide';
        
        if (!img.hasAlt) {
            statusClass = 'status-error';
            statusIcon = '❌';
            statusText = 'Alt manquant';
        } else if (img.isEmpty) {
            statusClass = 'status-warning';
            statusIcon = '⚠️';
            statusText = 'Alt vide';
        } else if (img.isTooLong) {
            statusClass = 'status-info';
            statusIcon = '';
            statusText = 'Trop long';
        }
        
        item.innerHTML = `
            <div class="image-info-header">
                <span class="status-icon ${statusClass}">${statusIcon}</span>
                <span class="image-number">Image ${img.index}</span>
                <span class="status-text ${statusClass}">${statusText}</span>
            </div>
            <div class="image-details">
                <div class="detail-row">
                    <strong>Source:</strong> 
                    <span class="image-src">${escapeHTML(truncateString(img.src, 60))}</span>
                </div>
                ${img.hasAlt ? `
                <div class="detail-row">
                    <strong>Alt (${img.altLength} caractères):</strong> 
                    <span class="alt-text">${escapeHTML(img.alt)}</span>
                </div>
                ` : '<div class="detail-row"><strong>Alt:</strong> <span class="missing">Non spécifié</span></div>'}
            </div>
        `;
        
        imagesList.appendChild(item);
    });
    
    // Afficher les recommandations
    const recommendationsList = document.getElementById('recommendationsList');
    recommendationsList.innerHTML = '';
    analysis.recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.textContent = rec;
        recommendationsList.appendChild(li);
    });
    
    // Afficher les résultats
    document.getElementById('resultsState').style.display = 'block';
    
    // Scroll vers les résultats
    document.getElementById('resultsState').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function truncateString(str, maxLength) {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
}
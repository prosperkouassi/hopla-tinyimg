// ========== ALT TEXT CHECKER ==========

const MAX_ALT_LENGTH = 125;

document.addEventListener('DOMContentLoaded', () => {
    const checkBtn = document.getElementById('checkBtn');
    const urlInput = document.getElementById('urlInput');
    const checkHtmlBtn = document.getElementById('checkHtmlBtn');
    const htmlInput = document.getElementById('htmlInput');
    const loadingState = document.getElementById('loadingState');
    const resultsState = document.getElementById('resultsState');

    // Méthode 1 : Analyse par URL
    if (checkBtn) {
        checkBtn.addEventListener('click', async () => {
            const url = urlInput.value.trim();
            if (!url || !url.startsWith('http')) {
                alert('Veuillez entrer une URL valide commençant par http:// ou https://');
                return;
            }

            loadingState.style.display = 'block';
            resultsState.style.display = 'none';
            checkBtn.disabled = true;

            try {
                const html = await fetchHtmlWithProxies(url);
                processAndDisplay(html, url);
            } catch (error) {
                console.error('Erreur URL:', error);
                alert(`⚠️ Impossible d'accéder à cette URL via les proxies publics.

Cela peut être dû à une protection CORS, à Cloudflare ou à un blocage du site ciblé.

👉 Utilisez la "Méthode 2" en copiant-collant le code source de la page, ou essayez à nouveau plus tard.`);
            } finally {
                loadingState.style.display = 'none';
                checkBtn.disabled = false;
            }
        });
    }

    // Méthode 2 : Analyse par collage de code HTML (Infaillible)
    if (checkHtmlBtn) {
        checkHtmlBtn.addEventListener('click', () => {
            const html = htmlInput.value.trim();
            if (!html) {
                alert('Veuillez coller le code source HTML dans la zone de texte.');
                return;
            }
            processAndDisplay(html, 'Code source collé');
        });
    }
});

async function fetchHtmlWithProxies(url) {
    const proxies = [
        {
            name: 'AllOrigins',
            build: target => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`
        },
        {
            name: 'CORSProxy',
            build: target => `https://corsproxy.io/?${encodeURIComponent(target)}`
        },
        {
            name: 'Codetabs',
            build: target => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`
        },
        {
            name: 'ThingProxy',
            build: target => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(target)}`
        }
    ];

    let lastError;
    for (const proxy of proxies) {
        try {
            const proxyUrl = proxy.build(url);
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                lastError = new Error(`${proxy.name} returned ${response.status} ${response.statusText}`);
                continue;
            }
            const html = await response.text();
            return html;
        } catch (error) {
            lastError = error;
            continue;
        }
    }
    throw lastError || new Error('Impossible de charger la page via les proxies publics.');
}

function processAndDisplay(html, sourceName) {
    const images = extractImages(html);
    const analysis = analyzeImages(images);
    displayResults(analysis, sourceName);
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
    
    return {
        images,
        total,
        validAlt,
        missingAlt,
        emptyAlt,
        tooLong,
        recommendations: generateRecommendations(images, total, validAlt, missingAlt, emptyAlt, tooLong)
    };
}

function generateRecommendations(images, total, validAlt, missingAlt, emptyAlt, tooLong) {
    const recommendations = [];
    
    if (total === 0) {
        recommendations.push('ℹ️ Aucune image (<img>) trouvée sur cette page.');
        return recommendations;
    }

    if (missingAlt > 0) {
        recommendations.push(`❌ Ajoutez des balises alt aux ${missingAlt} image(s) qui en sont dépourvues. C'est essentiel pour l'accessibilité et le SEO.`);
    }
    
    if (emptyAlt > 0) {
        recommendations.push(`⚠️ ${emptyAlt} image(s) ont une balise alt vide (alt=""). Si l'image est purement décorative, c'est correct. Sinon, ajoutez une description.`);
    }
    
    if (tooLong > 0) {
        recommendations.push(`📏 ${tooLong} image(s) ont un texte alt trop long (plus de ${MAX_ALT_LENGTH} caractères). Raccourcissez-les pour une meilleure expérience utilisateur et un meilleur SEO.`);
    }
    
    if (validAlt === total) {
        recommendations.push('✅ Excellent ! Toutes vos images ont des balises alt appropriées et bien rédigées.');
    }
    
    recommendations.push('💡 Conseil pro : Un bon texte alt doit décrire l\'image de manière concise, naturelle, et inclure des mots-clés pertinents uniquement si cela a du sens dans le contexte.');
    
    return recommendations;
}

function displayResults(analysis, sourceName) {
    document.getElementById('totalImages').textContent = analysis.total;
    document.getElementById('validAlt').textContent = analysis.validAlt;
    document.getElementById('missingAlt').textContent = analysis.missingAlt;
    document.getElementById('emptyAlt').textContent = analysis.emptyAlt;
    document.getElementById('longAlt').textContent = analysis.tooLong;
    
    const imagesList = document.getElementById('imagesList');
    imagesList.innerHTML = '';
    
    if (analysis.total === 0) {
        imagesList.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 20px;">Aucune image trouvée dans le code fourni.</p>';
    } else {
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
                statusIcon = '📏';
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
                        <span class="image-src">${escapeHTML(truncateString(img.src, 80))}</span>
                    </div>
                    ${img.hasAlt ? `
                    <div class="detail-row">
                        <strong>Alt (${img.altLength} car.):</strong> 
                        <span class="alt-text">"${escapeHTML(img.alt)}"</span>
                    </div>
                    ` : '<div class="detail-row"><strong>Alt:</strong> <span class="missing">Non spécifié</span></div>'}
                </div>
            `;
            imagesList.appendChild(item);
        });
    }
    
    const recommendationsList = document.getElementById('recommendationsList');
    recommendationsList.innerHTML = '';
    analysis.recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.textContent = rec;
        recommendationsList.appendChild(li);
    });
    
    document.getElementById('resultsState').style.display = 'block';
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
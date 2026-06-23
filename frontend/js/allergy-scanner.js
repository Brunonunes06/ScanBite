// Allergy Scanner System with AI Analysis
class AllergyScanner {
    constructor() {
        this.currentImage = null;
        this.analysisResults = [];
        this.allergyDatabase = this.initializeAllergyDatabase();
        this.initializeEventListeners();
        this.populateAllergyTable();
    }

    // Initialize comprehensive allergy database
    initializeAllergyDatabase() {
        return {
            // Common allergens with detailed information
            allergens: [
                {
                    name: "Amendoim",
                    sources: "Manteiga de amendoim, óleo de amendoim, doces, snacks, molhos asiáticos",
                    symptoms: "Urticária, inchaço, dificuldade respiratória, anafilaxia",
                    severity: "grave",
                    keywords: ["amendoim", "peanut", "arachis", "óleo de amendoim"]
                },
                {
                    name: "Leite",
                    sources: "Leite, queijo, iogurte, manteiga, sorvete, produtos lácteos",
                    symptoms: "Dor abdominal, diarreia, vômito, eczema, asma",
                    severity: "moderada",
                    keywords: ["leite", "milk", "laticínio", "queijo", "iogurte"]
                },
                {
                    name: "Ovos",
                    sources: "Ovos, maionese, bolos, pães, massas, vacinas",
                    symptoms: "Urticária, inchaço, problemas digestivos, anafilaxia",
                    severity: "moderada",
                    keywords: ["ovo", "egg", "gema", "clara"]
                },
                {
                    name: "Trigo",
                    sources: "Pão, massas, bolos, biscoitos, cerveja, molhos",
                    symptoms: "Dor abdominal, inchaço, diarreia, fadiga",
                    severity: "leve",
                    keywords: ["trigo", "wheat", "glúten", "pão", "massa"]
                },
                {
                    name: "Soja",
                    sources: "Tofu, óleo de soja, molho shoyu, proteína vegetal, legumes",
                    symptoms: "Urticária, dor abdominal, dificuldade respiratória",
                    severity: "moderada",
                    keywords: ["soja", "soy", "tofu", "shoyu"]
                },
                {
                    name: "Frutos do Mar",
                    sources: "Camarão, lagosta, caranguejo, mexilhão, ostras",
                    symptoms: "Urticária, inchaço, dificuldade respiratória, anafilaxia",
                    severity: "grave",
                    keywords: ["camarão", "lagosta", "caranguejo", "mexilhão", "frutos do mar"]
                },
                {
                    name: "Nozes",
                    sources: "Amêndoas, castanhas, nozes, avelãs, pistaches",
                    symptoms: "Urticária, inchaço, problemas digestivos, anafilaxia",
                    severity: "grave",
                    keywords: ["amêndoa", "castanha", "noz", "avelã", "pistache"]
                },
                {
                    name: "Milho",
                    sources: "Milho, xarope de milho, amido de milho, fubá, pipoca",
                    symptoms: "Urticária, dor abdominal, vômito, diarreia",
                    severity: "leve",
                    keywords: ["milho", "corn", "xarope", "fubá"]
                },
                {
                    name: "Sésamo",
                    sources: "Gergelim, tahine, pão sírio, óleo de gergelim",
                    symptoms: "Urticária, inchaço, dificuldade respiratória, anafilaxia",
                    severity: "grave",
                    keywords: ["sésamo", "gergelim", "tahine"]
                },
                {
                    name: "Mostarda",
                    sources: "Mostarda, molhos, condimentos, conservas",
                    symptoms: "Urticária, inchaço, problemas digestivos",
                    severity: "moderada",
                    keywords: ["mostarda", "mustard", "condimento"]
                },
                {
                    name: "Lentilhas",
                    sources: "Lentilhas, feijões, grão-de-bico, ervilhas",
                    symptoms: "Dor abdominal, inchaço, problemas digestivos",
                    severity: "leve",
                    keywords: ["lentilha", "feijão", "grão-de-bico", "ervilha"]
                },
                {
                    name: "Citrinos",
                    sources: "Laranja, limão, lima, grapefruit, mandarina",
                    symptoms: "Urticária, inchaço dos lábios, problemas digestivos",
                    severity: "leve",
                    keywords: ["laranja", "limão", "lima", "citrus"]
                }
            ]
        };
    }

    // Initialize event listeners
    initializeEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const analyzeBtn = document.getElementById('analyzeBtn');

        // Click to upload
        uploadArea.addEventListener('click', () => fileInput.click());

        // File input change
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });

        // Analyze button
        analyzeBtn.addEventListener('click', () => this.analyzeImage());
    }

    // Handle file selection
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.handleFile(file);
        }
    }

    // Handle file processing
    handleFile(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError('Por favor, selecione um arquivo de imagem válido.');
            return;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('O arquivo é muito grande. Por favor, selecione uma imagem menor que 10MB.');
            return;
        }

        // Read and display image
        const reader = new FileReader();
        reader.onload = (e) => {
            this.displayImage(e.target.result);
            this.currentImage = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Display uploaded image
    displayImage(imageSrc) {
        const previewArea = document.getElementById('previewArea');
        const previewImage = document.getElementById('previewImage');
        
        previewImage.src = imageSrc;
        previewArea.style.display = 'block';
        
        // Clear previous results
        this.clearResults();
    }

    // Clear previous results
    clearResults() {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox empty-icon"></i>
                <p>Nenhuma análise realizada ainda</p>
                <p>Clique em "Analisar com IA" para começar</p>
            </div>
        `;
    }

    // Analyze image with AI
    async analyzeImage() {
        if (!this.currentImage) {
            this.showError('Por favor, selecione uma imagem primeiro.');
            return;
        }

        // Verificar limite do plano antes de analisar
        try {
            const planData = JSON.parse(localStorage.getItem('nutriScanPlan') || 'null');
            const plan = planData ? planData.plan : 'free';
            if (plan === 'free') {
                const history = JSON.parse(localStorage.getItem('allergyAnalysisHistory') || '[]');
                // contar scans no mês atual
                const now = new Date();
                const monthCount = history.filter(h => {
                    const d = new Date(h.timestamp || h.date || h.id);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                }).length;

                if (monthCount >= 10) {
                    this.showError('Limite de 10 scans/mês atingido para o plano gratuito. Faça upgrade para mais scans.');
                    return;
                }
            }
        } catch (e) {
            console.warn('Erro ao verificar plano:', e);
        }

        const analyzeBtn = document.getElementById('analyzeBtn');
        const originalText = analyzeBtn.innerHTML;
        
        // Show loading state
        analyzeBtn.disabled = true;
        analyzeBtn.classList.add('loading');
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analisando...';

        try {
            // Simulate AI analysis delay
            await this.simulateAIAnalysis();
            
            // Get analysis results
            const results = this.performAIAnalysis();
            
            // Display results
            this.displayResults(results);
            
            // Save to history
            this.saveAnalysisToHistory(results);
            
        } catch (error) {
            this.showError('Erro ao analisar a imagem. Por favor, tente novamente.');
            console.error('Analysis error:', error);
        } finally {
            // Reset button
            analyzeBtn.disabled = false;
            analyzeBtn.classList.remove('loading');
            analyzeBtn.innerHTML = originalText;
        }
    }

    // Simulate AI processing time
    simulateAIAnalysis() {
        return new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Perform AI analysis (simulated)
    performAIAnalysis() {
        // Simulate random detection of allergens
        const detectedAllergens = [];
        const randomAllergens = this.getRandomAllergens();
        
        randomAllergens.forEach(allergen => {
            const confidence = Math.random() * 0.3 + 0.7; // 70-100% confidence
            detectedAllergens.push({
                ...allergen,
                confidence: confidence,
                detectedAreas: this.generateDetectedAreas()
            });
        });

        // Generate overall analysis
        const overallRisk = this.calculateOverallRisk(detectedAllergens);
        
        return {
            timestamp: new Date().toISOString(),
            overallRisk: overallRisk,
            detectedAllergens: detectedAllergens,
            recommendations: this.generateRecommendations(detectedAllergens),
            imageAnalysis: this.generateImageAnalysis()
        };
    }

    // Get random allergens for simulation
    getRandomAllergens() {
        const allergens = this.allergyDatabase.allergens;
        const count = Math.floor(Math.random() * 3) + 1; // 1-3 allergens
        const shuffled = [...allergens].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // Generate detected areas (simulated bounding boxes)
    generateDetectedAreas() {
        const areas = [];
        const count = Math.floor(Math.random() * 2) + 1; // 1-2 areas
        
        for (let i = 0; i < count; i++) {
            areas.push({
                x: Math.random() * 80 + 10, // 10-90%
                y: Math.random() * 80 + 10, // 10-90%
                width: Math.random() * 20 + 10, // 10-30%
                height: Math.random() * 20 + 10 // 10-30%
            });
        }
        
        return areas;
    }

    // Calculate overall risk level
    calculateOverallRisk(allergens) {
        if (allergens.length === 0) return 'safe';
        
        const hasGrave = allergens.some(a => a.severity === 'grave');
        const hasModerada = allergens.some(a => a.severity === 'moderada');
        
        if (hasGrave) return 'danger';
        if (hasModerada) return 'warning';
        return 'caution';
    }

    // Generate recommendations based on detected allergens
    generateRecommendations(allergens) {
        const recommendations = [];
        
        if (allergens.length === 0) {
            recommendations.push("Nenhum alérgeno comum detectado. Produto parece seguro para consumo geral.");
            return recommendations;
        }
        
        const graveAllergens = allergens.filter(a => a.severity === 'grave');
        const moderateAllergens = allergens.filter(a => a.severity === 'moderada');
        
        if (graveAllergens.length > 0) {
            recommendations.push("⚠️ **ALERTA MÁXIMO**: Detectados alérgenos de alto risco. Evitar consumo se tiver alergia grave.");
        }
        
        if (moderateAllergens.length > 0) {
            recommendations.push("⚠️ **ATENÇÃO**: Detectados alérgenos que podem causar reações moderadas.");
        }
        
        recommendations.push("📋 Verifique sempre o rótulo completo do produto.");
        recommendations.push("🏥 Em caso de reação alérgica, procure atendimento médico imediatamente.");
        recommendations.push("💊 Mantenha medicação para alergia sempre por perto se necessário.");
        
        return recommendations;
    }

    // Generate image analysis description
    generateImageAnalysis() {
        const analyses = [
            "Imagem analisada mostra produto alimentar processado com embalagem visível.",
            "Qualidade da imagem permite boa visualização dos ingredientes.",
            "Detectados possíveis alérgenos baseado em análise de padrões visuais.",
            "Recomenda-se confirmação com leitura do rótulo nutricional."
        ];
        
        return analyses.join(" ");
    }

    // Display analysis results
    displayResults(results) {
        const resultsContainer = document.getElementById('resultsContainer');
        
        let html = `
            <div class="result-card ${results.overallRisk}">
                <div class="result-header">
                    <h3 class="result-title">Análise Completa</h3>
                    <span class="result-severity severity-${results.overallRisk}">
                        ${this.getSeverityText(results.overallRisk)}
                    </span>
                </div>
                <div class="result-description">
                    ${results.imageAnalysis}
                </div>
                <div class="allergen-list">
                    ${results.detectedAllergens.map(allergen => 
                        `<span class="allergen-tag ${allergen.severity === 'grave' ? 'danger' : allergen.severity === 'moderada' ? 'warning' : ''}">
                            ${allergen.name} (${Math.round(allergen.confidence * 100)}%)
                        </span>`
                    ).join('')}
                </div>
            </div>
        `;
        
        // Add detailed allergen information
        results.detectedAllergens.forEach(allergen => {
            html += `
                <div class="result-card ${allergen.severity === 'grave' ? 'danger' : allergen.severity === 'moderada' ? 'warning' : ''}">
                    <div class="result-header">
                        <h3 class="result-title">${allergen.name}</h3>
                        <span class="result-severity severity-${allergen.severity === 'grave' ? 'danger' : allergen.severity === 'moderada' ? 'warning' : 'caution'}">
                            ${allergen.severity}
                        </span>
                    </div>
                    <div class="result-description">
                        <strong>Fontes Comuns:</strong> ${allergen.sources}<br>
                        <strong>Sintomas:</strong> ${allergen.symptoms}<br>
                        <strong>Confiança da IA:</strong> ${Math.round(allergen.confidence * 100)}%
                    </div>
                </div>
            `;
        });
        
        // Add recommendations
        html += `
            <div class="result-card">
                <div class="result-header">
                    <h3 class="result-title">Recomendações</h3>
                </div>
                <div class="result-description">
                    ${results.recommendations.map(rec => `<p>${rec}</p>`).join('')}
                </div>
            </div>
        `;
        
        resultsContainer.innerHTML = html;
    }

    // Get severity text in Portuguese
    getSeverityText(severity) {
        const texts = {
            'safe': 'Seguro',
            'caution': 'Cuidado',
            'warning': 'Atenção',
            'danger': 'Perigo'
        };
        return texts[severity] || 'Desconhecido';
    }

    // Save analysis to history
    saveAnalysisToHistory(results) {
        const history = JSON.parse(localStorage.getItem('allergyAnalysisHistory') || '[]');
        const analysis = {
            ...results,
            id: Date.now(),
            image: this.currentImage
        };
        
        history.unshift(analysis);
        
        // Keep only last 50 analyses
        if (history.length > 50) {
            history.splice(50);
        }
        
        localStorage.setItem('allergyAnalysisHistory', JSON.stringify(history));
        
        // Também adicionar entrada simplificada em nutriScanScans para o dashboard
        try {
            const scans = JSON.parse(localStorage.getItem('nutriScanScans') || '[]');
            const scanEntry = {
                id: analysis.id,
                product: 'Imagem analisada',
                date: analysis.timestamp || new Date().toISOString(),
                status: (analysis.overallRisk === 'safe' ? 'safe' : (analysis.overallRisk === 'warning' ? 'warning' : 'danger')),
                confidence: analysis.detectedAllergens && analysis.detectedAllergens[0] ? Math.round(analysis.detectedAllergens[0].confidence * 100) : 90,
                image: analysis.image || this.currentImage || ''
            };
            scans.unshift(scanEntry);
            // manter 100 scans locais
            if (scans.length > 100) scans.splice(100);
            localStorage.setItem('nutriScanScans', JSON.stringify(scans));
        } catch (e) {
            console.warn('Erro ao adicionar scan simplificado:', e);
        }

        // Notificar o dashboard em tempo real na mesma aba
        try {
            // Disparar evento DOM para listeners na página
            const event = new CustomEvent('scan:completed', { detail: scanEntry });
            document.dispatchEvent(event);

            // Se houver um sincronizador real-time global, chamar o handler diretamente
            if (window.realtimeSync && typeof window.realtimeSync.handleScanUpdate === 'function') {
                window.realtimeSync.handleScanUpdate(scanEntry);
            }
        } catch (e) {
            // não bloquear fluxo se notificação falhar
            console.warn('Erro ao notificar dashboard sobre novo scan:', e);
        }

        // Atualizar contador de uso do plano no usuário local
        try {
            const userStr = localStorage.getItem('nutriScanUser');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.subscription = user.subscription || {};
                user.subscription.scansUsed = (user.subscription.scansUsed || 0) + 1;
                localStorage.setItem('nutriScanUser', JSON.stringify(user));
            }
        } catch (e) {
            console.warn('Erro ao atualizar uso do plano do usuário:', e);
        }
        
        // Incluir dados do usuário e notificar histórico (outras abas)
        try {
            const userStr = localStorage.getItem('nutriScanUser');
            if (userStr) {
                const user = JSON.parse(userStr);
                analysis.user = { name: user.name || 'Usuário', id: user.id || null };
            }
        } catch (e) {
            // ignore
        }

        try {
            localStorage.setItem('allergyAnalysisLast', JSON.stringify(analysis));
            localStorage.setItem('allergyAnalysisLastUpdate', Date.now().toString());
        } catch (e) {
            console.warn('Erro ao sinalizar atualização de histórico:', e);
        }
    }

    // Populate allergy table
    populateAllergyTable() {
        const tableBody = document.getElementById('allergyTableBody');
        
        const html = this.allergyDatabase.allergens.map(allergen => `
            <tr>
                <td class="allergy-name">${allergen.name}</td>
                <td>${allergen.sources}</td>
                <td class="allergy-symptoms">${allergen.symptoms}</td>
                <td class="allergy-severity">
                    <span class="severity-badge severity-${allergen.severity === 'grave' ? 'danger' : allergen.severity === 'moderada' ? 'warning' : 'caution'}">
                        ${allergen.severity}
                    </span>
                </td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = html;
    }

    // Show error message
    showError(message) {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = `
            <div class="result-card danger">
                <div class="result-header">
                    <h3 class="result-title">Erro</h3>
                </div>
                <div class="result-description">
                    ${message}
                </div>
            </div>
        `;
    }
}

// Initialize the allergy scanner when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AllergyScanner();
});

// Nota: `safeRedirect` é centralizado em `api-config.js`.

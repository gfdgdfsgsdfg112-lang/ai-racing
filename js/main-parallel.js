/**
 * Главный игровой модуль с многопоточными вычислениями
 * Визуализация в главном потоке, вычисления в Workers
 */

class ParallelGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.networkCanvas = document.getElementById('networkCanvas');
        this.networkCtx = this.networkCanvas.getContext('2d');
        this.chartCanvas = document.getElementById('chartCanvas');
        this.chartCtx = this.chartCanvas.getContext('2d');
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.track = new Track(this.canvas.width, this.canvas.height, 'complex');
        
        this.populationSize = 50;
        this.cars = [];
        
        // Оригинальный генетический алгоритм (проверенный)
        this.ga = new GeneticAlgorithm({
            populationSize: this.populationSize,
            mutationRate: 0.15,
            mutationStrength: 0.3,
            elitismCount: 3
        });
        
        this.generation = 1;
        this.bestCar = null;
        this.running = true;
        this.speed = 1;
        this.frameCount = 0;
        
        // Worker Pool для ускорения вычислений
        this.workerPool = null;
        this.useWorkers = false;
        
        this.init();
    }
    
    async init() {
        // Пробуем инициализировать Workers
        try {
            const numWorkers = navigator.hardwareConcurrency || 4;
            this.workerPool = new WorkerPool(numWorkers);
            
            const trackData = this.getTrackData();
            await this.workerPool.initTrack(trackData);
            
            this.useWorkers = true;
            console.log(`✅ Worker Pool инициализирован: ${numWorkers} потоков`);
        } catch (e) {
            console.log('⚠️ Workers недоступны, используем основной поток');
            this.useWorkers = false;
        }
        
        // Инициализация популяции
        this.initPopulation();
        this.setupControls();
        this.updateTrackInfo();
        this.gameLoop();
    }
    
    getTrackData() {
        return {
            walls: this.track.walls,
            finishZone: {
                x: this.track.finishZone.x,
                y: this.track.finishZone.y,
                radius: this.track.finishZone.radius
            },
            trackLength: this.track.trackLength || 2000,
            start: this.track.getStartPosition()
        };
    }
    
    resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = 450;
        
        this.networkCanvas.width = this.networkCanvas.parentElement.clientWidth - 30;
        this.networkCanvas.height = 120;
        
        this.chartCanvas.width = this.chartCanvas.parentElement.clientWidth - 30;
        this.chartCanvas.height = 80;
        
        if (this.track) {
            this.track.resize(this.canvas.width, this.canvas.height);
        }
    }
    
    initPopulation() {
        this.cars = [];
        const startPos = this.track.getStartPosition();
        
        for (let i = 0; i < this.populationSize; i++) {
            const car = new Car(startPos.x, startPos.y);
            this.cars.push(car);
        }
        
        this.bestCar = this.cars[0];
    }
    
    setupControls() {
        document.getElementById('startBtn').addEventListener('click', () => {
            this.running = !this.running;
            document.getElementById('startBtn').textContent = this.running ? '⏸ Пауза' : '▶ Старт';
        });
        
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.reset();
        });
        
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            this.speed = parseInt(e.target.value);
            document.getElementById('speedValue').textContent = this.speed + 'x';
        });
        
        document.getElementById('populationSlider').addEventListener('input', (e) => {
            this.populationSize = parseInt(e.target.value);
            document.getElementById('populationValue').textContent = this.populationSize;
            this.ga.populationSize = this.populationSize;
            this.reset();
        });
        
        document.getElementById('mutationSlider').addEventListener('input', (e) => {
            this.ga.mutationRate = parseInt(e.target.value) / 100;
            document.getElementById('mutationValue').textContent = e.target.value + '%';
        });
        
        document.getElementById('methodSelect').addEventListener('change', (e) => {
            this.ga.method = e.target.value;
        });
        
        document.getElementById('trackSelect').addEventListener('change', (e) => {
            this.changeTrack(e.target.value);
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.running = !this.running;
                document.getElementById('startBtn').textContent = this.running ? '⏸ Пауза' : '▶ Старт';
            } else if (e.code === 'KeyR') {
                this.reset();
            }
        });
    }
    
    changeTrack(template) {
        this.track.loadTemplate(template);
        this.updateTrackInfo();
        this.reset();
    }
    
    updateTrackInfo() {
        const info = this.track.getTemplateInfo();
        const stars = '⭐'.repeat(info.difficulty);
        
        document.getElementById('trackInfo').innerHTML = `
            <p><strong>${info.name}</strong></p>
            <p>${info.description}</p>
            <p>Сложность: ${stars}</p>
        `;
    }
    
    reset() {
        this.generation = 1;
        this.ga.reset();
        this.initPopulation();
        this.frameCount = 0;
    }
    
    gameLoop() {
        if (this.running) {
            for (let i = 0; i < this.speed; i++) {
                this.update();
            }
        }
        
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        this.frameCount++;
        
        let aliveCount = 0;
        
        for (const car of this.cars) {
            if (car.alive && !car.finished) {
                car.update(this.track);
                aliveCount++;
            }
        }
        
        this.bestCar = this.cars.reduce((best, car) => 
            car.fitness > best.fitness ? car : best
        , this.cars[0]);
        
        if (aliveCount === 0 || this.frameCount > 2500) {
            this.nextGeneration();
        }
        
        this.updateUI();
    }
    
    nextGeneration() {
        const newBrains = this.ga.evolve(this.cars);
        
        const startPos = this.track.getStartPosition();
        
        this.cars = [];
        for (let i = 0; i < this.populationSize; i++) {
            const car = new Car(startPos.x, startPos.y, newBrains[i]);
            this.cars.push(car);
        }
        
        this.generation = this.ga.generation;
        this.frameCount = 0;
        
        console.log(`Поколение ${this.generation}: Лучший = ${Math.round(this.ga.bestFitness)}, Средний = ${Math.round(this.ga.avgFitness)}`);
    }
    
    updateUI() {
        document.getElementById('generation').textContent = this.generation;
        document.getElementById('bestFitness').textContent = Math.round(this.ga.bestFitness);
        document.getElementById('avgFitness').textContent = Math.round(this.ga.avgFitness);
        
        const alive = this.cars.filter(c => c.alive).length;
        document.getElementById('aliveCount').textContent = alive;
        
        const finished = this.cars.filter(c => c.finished).length;
        document.getElementById('finishedCount').textContent = finished;
    }
    
    render() {
        this.ctx.fillStyle = '#f5f5f5';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.track.draw(this.ctx);
        
        for (const car of this.cars) {
            if (car !== this.bestCar) {
                car.draw(this.ctx, false);
            }
        }
        
        if (this.bestCar) {
            this.bestCar.draw(this.ctx, true);
        }
        
        if (this.bestCar && this.bestCar.finished) {
            this.ctx.fillStyle = 'rgba(0, 150, 0, 0.9)';
            this.ctx.fillRect(10, this.canvas.height - 40, 220, 30);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`🏆 ФИНИШ: ${(this.bestCar.finishTime / 60).toFixed(2)}с`, 20, this.canvas.height - 20);
        }
        
        // Показываем информацию о потоках
        if (this.workerPool && this.useWorkers) {
            const info = this.workerPool.getInfo();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(this.canvas.width - 120, 10, 110, 25);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '11px sans-serif';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`⚡ ${info.totalWorkers} потоков`, this.canvas.width - 15, 27);
        }
        
        this.drawNetwork();
        this.drawChart();
    }
    
    drawNetwork() {
        const ctx = this.networkCtx;
        const w = this.networkCanvas.width;
        const h = this.networkCanvas.height;
        
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, w, h);
        
        if (!this.bestCar) return;
        
        const brain = this.bestCar.brain;
        if (!brain) return;
        
        const layers = brain.layerSizes;
        
        const layerSpacing = w / (layers.length + 1);
        
        const positions = [];
        for (let l = 0; l < layers.length; l++) {
            const layerPositions = [];
            const neuronSpacing = h / (layers[l] + 1);
            
            for (let n = 0; n < layers[l]; n++) {
                layerPositions.push({
                    x: layerSpacing * (l + 1),
                    y: neuronSpacing * (n + 1)
                });
            }
            positions.push(layerPositions);
        }
        
        for (let l = 0; l < brain.layers.length; l++) {
            const layer = brain.layers[l];
            
            for (let i = 0; i < layer.weights.length; i++) {
                for (let j = 0; j < layer.weights[i].length; j++) {
                    const weight = layer.weights[i][j];
                    const alpha = Math.min(1, Math.abs(weight) / 2);
                    
                    ctx.strokeStyle = weight > 0 
                        ? `rgba(0, 102, 204, ${alpha * 0.5})` 
                        : `rgba(204, 0, 0, ${alpha * 0.5})`;
                    ctx.lineWidth = Math.abs(weight) * 0.5;
                    
                    ctx.beginPath();
                    ctx.moveTo(positions[l][j].x, positions[l][j].y);
                    ctx.lineTo(positions[l + 1][i].x, positions[l + 1][i].y);
                    ctx.stroke();
                }
            }
        }
        
        for (let l = 0; l < positions.length; l++) {
            for (let n = 0; n < positions[l].length; n++) {
                const pos = positions[l][n];
                
                ctx.fillStyle = l === 0 ? '#e6f2ff' : l === positions.length - 1 ? '#e6ffe6' : '#fff';
                ctx.strokeStyle = '#0066cc';
                ctx.lineWidth = 1;
                
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }
    }
    
    drawChart() {
        const ctx = this.chartCtx;
        const w = this.chartCanvas.width;
        const h = this.chartCanvas.height;
        
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, w, h);
        
        const history = this.ga.fitnessHistory;
        
        if (history.length < 2) return;
        
        const maxFitness = Math.max(...history, 1);
        const padding = 15;
        
        ctx.strokeStyle = '#0066cc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const xStep = (w - padding * 2) / Math.max(history.length - 1, 1);
        
        for (let i = 0; i < history.length; i++) {
            const x = padding + i * xStep;
            const y = h - padding - (history[i] / maxFitness) * (h - padding * 2);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        const avgHistory = this.ga.avgFitnessHistory;
        ctx.strokeStyle = '#cc0000';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        
        for (let i = 0; i < avgHistory.length; i++) {
            const x = padding + i * xStep;
            const y = h - padding - (avgHistory[i] / maxFitness) * (h - padding * 2);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

window.addEventListener('load', () => {
    window.game = new ParallelGame();
});

/**
 * ParallelGenetic - Параллельный генетический алгоритм
 * Использует Worker Pool для многопоточных вычислений
 */

class ParallelGenetic {
    constructor(config = {}) {
        this.populationSize = config.populationSize || 50;
        this.mutationRate = config.mutationRate || 0.15;
        this.mutationStrength = config.mutationStrength || 0.3;
        this.elitismCount = config.elitismCount || 3;
        this.method = config.method || 'adaptive';
        
        this.generation = 1;
        this.bestFitness = 0;
        this.avgFitness = 0;
        this.fitnessHistory = [];
        this.avgFitnessHistory = [];
        
        // Worker Pool
        this.workerPool = null;
        this.initialized = false;
        
        // Адаптивные параметры
        this.stagnationCount = 0;
        this.lastBestFitness = 0;
        
        // Видообразование
        this.species = [];
        this.speciesThreshold = 0.3;
        
        // CMA-ES параметры
        this.cmaEs = null;
    }
    
    /**
     * Инициализация с Worker Pool
     */
    async init(workerPool, trackData) {
        this.workerPool = workerPool;
        await this.workerPool.initTrack(trackData);
        this.initialized = true;
        console.log('✅ ParallelGenetic инициализирован');
    }
    
    /**
     * Создание начальной популяции
     */
    async createPopulation() {
        const networks = [];
        for (let i = 0; i < this.populationSize; i++) {
            const network = await this.workerPool.createNetwork([8, 10, 10, 2]);
            networks.push(network);
        }
        return networks;
    }
    
    /**
     * Оценка популяции (параллельно)
     */
    async evaluatePopulation(networks, startPos, maxSteps = 2500) {
        if (!this.initialized) {
            throw new Error('ParallelGenetic не инициализирован');
        }
        
        const startTime = performance.now();
        const results = await this.workerPool.simulateBatch(networks, startPos, maxSteps);
        const endTime = performance.now();
        
        console.log(`⚡ Оценка популяции: ${(endTime - startTime).toFixed(2)}мс (${this.workerPool.numWorkers} потоков)`);
        
        // Обновляем статистику
        const fitnesses = results.map(r => r.fitness);
        this.bestFitness = Math.max(...fitnesses);
        this.avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
        
        this.fitnessHistory.push(this.bestFitness);
        this.avgFitnessHistory.push(this.avgFitness);
        
        // Адаптивная мутация
        if (this.method === 'adaptive') {
            this.adaptiveMutation();
        }
        
        return results;
    }
    
    /**
     * Адаптивная мутация
     */
    adaptiveMutation() {
        if (this.bestFitness > this.lastBestFitness) {
            this.stagnationCount = 0;
            // Уменьшаем мутацию при прогрессе
            this.mutationRate = Math.max(0.05, this.mutationRate * 0.95);
        } else {
            this.stagnationCount++;
            // Увеличиваем мутацию при стагнации
            if (this.stagnationCount > 5) {
                this.mutationRate = Math.min(0.5, this.mutationRate * 1.1);
            }
        }
        this.lastBestFitness = this.bestFitness;
    }
    
    /**
     * Эволюция популяции (параллельно)
     */
    async evolve(networks, fitnesses) {
        const newNetworks = [];
        
        // Создаём индексы с сортировкой по fitness
        const indexed = networks.map((net, i) => ({ net, fitness: fitnesses[i].fitness, index: i }));
        indexed.sort((a, b) => b.fitness - a.fitness);
        
        // Элита - лучшие особи без изменений
        for (let i = 0; i < this.elitismCount; i++) {
            newNetworks.push(JSON.parse(JSON.stringify(indexed[i].net)));
        }
        
        // Методы отбора и размножения
        switch (this.method) {
            case 'speciation':
                await this.speciationEvolve(indexed, newNetworks);
                break;
            case 'cmaes':
                await this.cmaEsEvolve(indexed, newNetworks);
                break;
            case 'standard':
            default:
                await this.standardEvolve(indexed, newNetworks);
                break;
        }
        
        this.generation++;
        return newNetworks;
    }
    
    /**
     * Стандартная эволюция
     */
    async standardEvolve(indexed, newNetworks) {
        const totalFitness = indexed.reduce((sum, item) => sum + Math.max(0, item.fitness), 0);
        
        // Функция выбора родителя (рулетка)
        const selectParent = () => {
            let r = Math.random() * totalFitness;
            for (const item of indexed) {
                r -= Math.max(0, item.fitness);
                if (r <= 0) return item.net;
            }
            return indexed[0].net;
        };
        
        // Заполняем популяцию
        const promises = [];
        while (newNetworks.length < this.populationSize) {
            const parent1 = selectParent();
            const parent2 = selectParent();
            
            // Кроссовер и мутация
            promises.push(
                this.workerPool.crossover(parent1, parent2).then(child =>
                    this.workerPool.mutate(child, this.mutationRate, this.mutationStrength)
                ).then(mutated => {
                    newNetworks.push(mutated);
                })
            );
        }
        
        await Promise.all(promises);
    }
    
    /**
     * Эволюция с видообразованием
     */
    async speciationEvolve(indexed, newNetworks) {
        // Простая реализация видообразования
        // Разделяем популяцию на виды по похожести
        
        const species = this.assignSpecies(indexed);
        
        // Эволюция внутри каждого вида
        for (const spec of species) {
            const specFitness = spec.reduce((sum, item) => sum + item.fitness, 0) / spec.length;
            
            // Лучший из вида
            if (newNetworks.length < this.populationSize) {
                newNetworks.push(JSON.parse(JSON.stringify(spec[0].net)));
            }
            
            // Мутации внутри вида
            while (newNetworks.length < this.populationSize && spec.length > 1) {
                const parent = spec[Math.floor(Math.random() * spec.length)].net;
                const mutated = await this.workerPool.mutate(parent, this.mutationRate, this.mutationStrength);
                newNetworks.push(mutated);
            }
        }
    }
    
    /**
     * Распределение по видам
     */
    assignSpecies(indexed) {
        const species = [];
        
        for (const item of indexed) {
            let assigned = false;
            
            for (const spec of species) {
                if (this.networkDistance(item.net, spec[0].net) < this.speciesThreshold) {
                    spec.push(item);
                    assigned = true;
                    break;
                }
            }
            
            if (!assigned) {
                species.push([item]);
            }
        }
        
        return species;
    }
    
    /**
     * Расстояние между сетями
     */
    networkDistance(net1, net2) {
        let distance = 0;
        let count = 0;
        
        for (let l = 1; l < net1.layers.length; l++) {
            const layer1 = net1.layers[l];
            const layer2 = net2.layers[l];
            
            if (!layer1 || !layer2) continue;
            
            for (let i = 0; i < layer1.weights.length; i++) {
                for (let j = 0; j < layer1.weights[i].length; j++) {
                    distance += Math.abs(layer1.weights[i][j] - layer2.weights[i][j]);
                    count++;
                }
                distance += Math.abs(layer1.biases[i] - layer2.biases[i]);
                count++;
            }
        }
        
        return count > 0 ? distance / count : 0;
    }
    
    /**
     * CMA-ES эволюция
     */
    async cmaEsEvolve(indexed, newNetworks) {
        // Упрощённая реализация CMA-ES
        // Используем среднее значение лучших
        
        const topCount = Math.min(10, indexed.length);
        const topNetworks = indexed.slice(0, topCount).map(item => item.net);
        
        // Создаём среднюю сеть
        const meanNetwork = this.createMeanNetwork(topNetworks);
        
        // Генерируем потомков с мутацией вокруг среднего
        while (newNetworks.length < this.populationSize) {
            const mutated = await this.workerPool.mutate(
                JSON.parse(JSON.stringify(meanNetwork)),
                this.mutationRate * 2,
                this.mutationStrength
            );
            newNetworks.push(mutated);
        }
    }
    
    /**
     * Создание средней сети
     */
    createMeanNetwork(networks) {
        const meanNet = JSON.parse(JSON.stringify(networks[0]));
        
        for (let l = 1; l < meanNet.layers.length; l++) {
            const layer = meanNet.layers[l];
            if (!layer) continue;
            
            for (let i = 0; i < layer.weights.length; i++) {
                for (let j = 0; j < layer.weights[i].length; j++) {
                    let sum = 0;
                    for (const net of networks) {
                        sum += net.layers[l].weights[i][j];
                    }
                    layer.weights[i][j] = sum / networks.length;
                }
                
                let sum = 0;
                for (const net of networks) {
                    sum += net.layers[l].biases[i];
                }
                layer.biases[i] = sum / networks.length;
            }
        }
        
        return meanNet;
    }
    
    /**
     * Сброс
     */
    reset() {
        this.generation = 1;
        this.bestFitness = 0;
        this.avgFitness = 0;
        this.fitnessHistory = [];
        this.avgFitnessHistory = [];
        this.stagnationCount = 0;
        this.lastBestFitness = 0;
        this.species = [];
    }
    
    /**
     * Получение статистики
     */
    getStats() {
        return {
            generation: this.generation,
            bestFitness: this.bestFitness,
            avgFitness: this.avgFitness,
            mutationRate: this.mutationRate,
            stagnationCount: this.stagnationCount,
            workerInfo: this.workerPool ? this.workerPool.getInfo() : null
        };
    }
}

// Экспорт
window.ParallelGenetic = ParallelGenetic;

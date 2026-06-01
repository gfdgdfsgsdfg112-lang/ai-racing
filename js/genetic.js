/**
 * Генетический алгоритм с 4 методами обучения
 */

class GeneticAlgorithm {
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
        
        // Для адаптивной мутации
        this.stagnationCount = 0;
        
        // Для видообразования
        this.species = [];
        this.speciesThreshold = 0.5;
        
        // Для CMA-ES
        this.cmaesMean = null;
        this.cmaesCov = null;
        this.cmaesSigma = 0.5;
    }
    
    evolve(cars) {
        const sorted = cars.slice().sort((a, b) => b.fitness - a.fitness);
        
        this.bestFitness = sorted[0].fitness;
        this.avgFitness = cars.reduce((sum, c) => sum + c.fitness, 0) / cars.length;
        
        this.fitnessHistory.push(this.bestFitness);
        this.avgFitnessHistory.push(this.avgFitness);
        
        let newBrains;
        
        switch (this.method) {
            case 'adaptive':
                newBrains = this.evolveAdaptive(sorted);
                break;
            case 'speciation':
                newBrains = this.evolveSpeciation(cars);
                break;
            case 'cmaes':
                newBrains = this.evolveCMAES(sorted);
                break;
            default:
                newBrains = this.evolveStandard(sorted);
        }
        
        this.generation++;
        
        return newBrains;
    }
    
    // Стандартный генетический алгоритм
    evolveStandard(sorted) {
        const newBrains = [];
        
        for (let i = 0; i < this.elitismCount && i < sorted.length; i++) {
            newBrains.push(sorted[i].brain.clone());
        }
        
        while (newBrains.length < this.populationSize) {
            const parent1 = this.tournamentSelect(sorted);
            const parent2 = this.tournamentSelect(sorted);
            
            const child = NeuralNetwork.crossover(parent1.brain, parent2.brain);
            child.mutate(this.mutationRate, this.mutationStrength);
            
            newBrains.push(child);
        }
        
        return newBrains;
    }
    
    // Адаптивная мутация
    evolveAdaptive(sorted) {
        // Проверяем застой
        if (this.fitnessHistory.length > 5) {
            const recent = this.fitnessHistory.slice(-5);
            const improvement = recent[recent.length - 1] - recent[0];
            
            if (improvement < 100) {
                this.stagnationCount++;
            } else {
                this.stagnationCount = 0;
            }
        }
        
        // Адаптивная сила мутации
        let adaptiveStrength = this.mutationStrength;
        if (this.stagnationCount > 3) {
            adaptiveStrength = Math.min(1.0, this.mutationStrength * (1 + this.stagnationCount * 0.2));
        }
        
        const newBrains = [];
        
        for (let i = 0; i < this.elitismCount && i < sorted.length; i++) {
            newBrains.push(sorted[i].brain.clone());
        }
        
        while (newBrains.length < this.populationSize) {
            const parent1 = this.tournamentSelect(sorted);
            const parent2 = this.tournamentSelect(sorted);
            
            const child = NeuralNetwork.crossover(parent1.brain, parent2.brain);
            child.mutate(this.mutationRate, adaptiveStrength);
            
            newBrains.push(child);
        }
        
        return newBrains;
    }
    
    // Видообразование (NEAT-like)
    evolveSpeciation(cars) {
        // Разделяем на виды
        this.species = this.speciate(cars);
        
        const newBrains = [];
        
        // Сортируем виды по лучшему фитнесу
        this.species.sort((a, b) => b.bestFitness - a.bestFitness);
        
        // Элитизм от каждого вида
        for (const species of this.species) {
            if (species.members.length > 0) {
                const best = species.members.reduce((a, b) => a.fitness > b.fitness ? a : b);
                newBrains.push(best.brain.clone());
            }
        }
        
        // Заполняем остальную популяцию
        while (newBrains.length < this.populationSize) {
            // Выбираем случайный вид с вероятностью пропорциональной фитнесу
            const species = this.selectSpecies();
            
            const parent1 = this.tournamentSelect(species.members);
            const parent2 = this.tournamentSelect(species.members);
            
            const child = NeuralNetwork.crossover(parent1.brain, parent2.brain);
            child.mutate(this.mutationRate, this.mutationStrength);
            
            newBrains.push(child);
        }
        
        return newBrains;
    }
    
    speciate(cars) {
        const species = [];
        
        for (const car of cars) {
            let found = false;
            
            for (const s of species) {
                if (this.distance(car.brain, s.representative) < this.speciesThreshold) {
                    s.members.push(car);
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                species.push({
                    representative: car.brain.clone(),
                    members: [car],
                    bestFitness: 0
                });
            }
        }
        
        // Обновляем лучший фитнес для каждого вида
        for (const s of species) {
            s.bestFitness = Math.max(...s.members.map(m => m.fitness));
        }
        
        return species;
    }
    
    selectSpecies() {
        const totalFitness = this.species.reduce((sum, s) => sum + s.bestFitness, 0);
        let random = Math.random() * totalFitness;
        
        for (const species of this.species) {
            random -= species.bestFitness;
            if (random <= 0) {
                return species;
            }
        }
        
        return this.species[0];
    }
    
    distance(brain1, brain2) {
        let totalDiff = 0;
        let count = 0;
        
        for (let l = 0; l < brain1.layers.length; l++) {
            const w1 = brain1.layers[l].weights;
            const w2 = brain2.layers[l].weights;
            
            for (let i = 0; i < w1.length; i++) {
                for (let j = 0; j < w1[i].length; j++) {
                    totalDiff += Math.abs(w1[i][j] - w2[i][j]);
                    count++;
                }
            }
        }
        
        return count > 0 ? totalDiff / count : 0;
    }
    
    // CMA-ES (упрощённый)
    evolveCMAES(sorted) {
        const newBrains = [];
        
        // Инициализация
        if (!this.cmaesMean) {
            this.cmaesMean = sorted[0].brain.getWeights();
            this.cmaesSigma = 0.5;
        }
        
        // Обновляем среднее на основе лучших
        const topCount = Math.min(10, sorted.length);
        let meanWeights = null;
        
        for (let i = 0; i < topCount; i++) {
            const weights = sorted[i].brain.getWeights();
            if (!meanWeights) {
                meanWeights = weights.slice();
            } else {
                for (let j = 0; j < weights.length; j++) {
                    meanWeights[j] += weights[j];
                }
            }
        }
        
        for (let j = 0; j < meanWeights.length; j++) {
            meanWeights[j] /= topCount;
        }
        
        this.cmaesMean = meanWeights;
        
        // Адаптация sigma
        if (this.fitnessHistory.length > 5) {
            const recent = this.fitnessHistory.slice(-5);
            const improvement = recent[recent.length - 1] - recent[0];
            
            if (improvement < 100) {
                this.cmaesSigma *= 1.1;
            } else {
                this.cmaesSigma *= 0.9;
            }
            
            this.cmaesSigma = Math.max(0.1, Math.min(2.0, this.cmaesSigma));
        }
        
        // Элитизм
        for (let i = 0; i < this.elitismCount && i < sorted.length; i++) {
            newBrains.push(sorted[i].brain.clone());
        }
        
        // Генерация новых особей
        while (newBrains.length < this.populationSize) {
            const brain = sorted[0].brain.clone();
            const weights = this.cmaesMean.slice();
            
            for (let i = 0; i < weights.length; i++) {
                weights[i] += this.gaussianRandom() * this.cmaesSigma;
            }
            
            brain.setWeights(weights);
            newBrains.push(brain);
        }
        
        return newBrains;
    }
    
    gaussianRandom() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    
    tournamentSelect(population) {
        const tournamentSize = 5;
        let best = null;
        
        for (let i = 0; i < tournamentSize; i++) {
            const idx = Math.floor(Math.random() * population.length);
            if (!best || population[idx].fitness > best.fitness) {
                best = population[idx];
            }
        }
        
        return best;
    }
    
    reset() {
        this.generation = 1;
        this.bestFitness = 0;
        this.avgFitness = 0;
        this.fitnessHistory = [];
        this.avgFitnessHistory = [];
        this.stagnationCount = 0;
        this.species = [];
        this.cmaesMean = null;
        this.cmaesCov = null;
        this.cmaesSigma = 0.5;
    }
    
    getStats() {
        return {
            generation: this.generation,
            bestFitness: this.bestFitness,
            avgFitness: this.avgFitness,
            history: this.fitnessHistory,
            avgHistory: this.avgFitnessHistory
        };
    }
}

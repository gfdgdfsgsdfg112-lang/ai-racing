/**
 * Worker Pool - Пул веб-воркеров для многопоточных вычислений
 * Распределяет задачи между доступными CPU ядрами
 */

class WorkerPool {
    constructor(numWorkers = navigator.hardwareConcurrency || 4) {
        this.numWorkers = numWorkers;
        this.workers = [];
        this.taskQueue = [];
        this.activeTasks = new Map();
        this.taskIdCounter = 0;
        
        console.log(`🔧 Инициализация Worker Pool: ${numWorkers} потоков`);
        
        // Создаём воркеров
        this.initWorkers();
    }
    
    /**
     * Инициализация воркеров
     */
    initWorkers() {
        const workerCode = `
            // Код воркера - выполняется в отдельном потоке
            let neuralNetwork = null;
            let trackData = null;
            
            // Функция создания нейросети
            function createNetwork(layers) {
                return {
                    layers: layers.map((size, i) => {
                        if (i === 0) return null;
                        return {
                            weights: Array(size).fill(0).map(() => 
                                Array(layers[i-1]).fill(0).map(() => (Math.random() - 0.5) * 2)
                            ),
                            biases: Array(size).fill(0).map(() => (Math.random() - 0.5) * 2)
                        };
                    }),
                    layerSizes: layers
                };
            }
            
            // Функция активации (tanh)
            function tanh(x) {
                return Math.tanh(x);
            }
            
            // Прямой проход нейросети
            function forward(network, inputs) {
                let activations = inputs;
                
                for (let l = 1; l < network.layers.length; l++) {
                    const layer = network.layers[l];
                    if (!layer) continue;
                    
                    const newActivations = [];
                    for (let i = 0; i < layer.weights.length; i++) {
                        let sum = layer.biases[i];
                        for (let j = 0; j < layer.weights[i].length; j++) {
                            sum += layer.weights[i][j] * activations[j];
                        }
                        newActivations.push(tanh(sum));
                    }
                    activations = newActivations;
                }
                
                return activations;
            }
            
            // Мутация нейросети
            function mutate(network, rate, strength) {
                for (let l = 1; l < network.layers.length; l++) {
                    const layer = network.layers[l];
                    if (!layer) continue;
                    
                    for (let i = 0; i < layer.weights.length; i++) {
                        for (let j = 0; j < layer.weights[i].length; j++) {
                            if (Math.random() < rate) {
                                layer.weights[i][j] += (Math.random() - 0.5) * 2 * strength;
                            }
                        }
                        if (Math.random() < rate) {
                            layer.biases[i] += (Math.random() - 0.5) * 2 * strength;
                        }
                    }
                }
                return network;
            }
            
            // Кроссовер двух нейросетей
            function crossover(parent1, parent2) {
                const child = JSON.parse(JSON.stringify(parent1));
                
                for (let l = 1; l < child.layers.length; l++) {
                    const layer = child.layers[l];
                    if (!layer) continue;
                    
                    for (let i = 0; i < layer.weights.length; i++) {
                        if (Math.random() < 0.5) {
                            layer.weights[i] = [...parent2.layers[l].weights[i]];
                            layer.biases[i] = parent2.layers[l].biases[i];
                        }
                    }
                }
                return child;
            }
            
            // Симуляция машины
            function simulateCar(network, trackData, startPos, maxSteps) {
                let x = startPos.x;
                let y = startPos.y;
                let angle = startPos.angle;
                let speed = 0;
                let distance = 0;
                let alive = true;
                let finished = false;
                let steps = 0;
                let progress = 0;
                
                const sensorLength = 120;
                const maxSpeed = 5;
                const acceleration = 0.2;
                const friction = 0.98;
                const turnSpeed = 0.05;
                
                while (alive && !finished && steps < maxSteps) {
                    steps++;
                    
                    // Вычисляем сенсоры
                    const sensors = [];
                    for (let s = 0; s < 8; s++) {
                        const sensorAngle = angle + (s * Math.PI / 4);
                        const endX = x + Math.cos(sensorAngle) * sensorLength;
                        const endY = y + Math.sin(sensorAngle) * sensorLength;
                        
                        // Проверка столкновения со стенами
                        let dist = sensorLength;
                        for (const wall of trackData.walls) {
                            const intersection = rayLineIntersection(
                                x, y, endX, endY,
                                wall.x1, wall.y1, wall.x2, wall.y2
                            );
                            if (intersection && intersection.dist < dist) {
                                dist = intersection.dist;
                            }
                        }
                        sensors.push(dist / sensorLength);
                    }
                    
                    // Получаем управление от нейросети
                    const outputs = forward(network, sensors);
                    const gas = outputs[0] || 0;
                    const turn = outputs[1] || 0;
                    
                    // Обновляем физику
                    speed = speed * friction + gas * acceleration;
                    speed = Math.max(-maxSpeed/2, Math.min(maxSpeed, speed));
                    angle += turn * turnSpeed;
                    
                    const newX = x + Math.cos(angle) * speed;
                    const newY = y + Math.sin(angle) * speed;
                    
                    // Проверка столкновения
                    let collision = false;
                    for (const wall of trackData.walls) {
                        if (lineIntersectsCircle(wall.x1, wall.y1, wall.x2, wall.y2, newX, newY, 8)) {
                            collision = true;
                            break;
                        }
                    }
                    
                    if (collision) {
                        alive = false;
                    } else {
                        x = newX;
                        y = newY;
                        distance += Math.abs(speed);
                        
                        // Проверка финиша
                        const dx = x - trackData.finishZone.x;
                        const dy = y - trackData.finishZone.y;
                        if (Math.sqrt(dx*dx + dy*dy) < trackData.finishZone.radius && progress > trackData.trackLength * 0.75) {
                            finished = true;
                        }
                        
                        // Обновление прогресса
                        progress += Math.abs(speed);
                    }
                }
                
                // Вычисление fitness
                let fitness = steps * 2 + distance * 0.5 + speed * 50;
                if (finished) {
                    fitness += 30000 + (maxSteps - steps) * 25;
                }
                
                return {
                    fitness,
                    finished,
                    steps,
                    distance,
                    progress
                };
            }
            
            // Вспомогательные функции геометрии
            function rayLineIntersection(rx1, ry1, rx2, ry2, lx1, ly1, lx2, ly2) {
                const dx = rx2 - rx1;
                const dy = ry2 - ry1;
                const lx = lx2 - lx1;
                const ly = ly2 - ly1;
                
                const denom = dx * ly - dy * lx;
                if (Math.abs(denom) < 0.0001) return null;
                
                const t = ((lx1 - rx1) * ly - (ly1 - ry1) * lx) / denom;
                const u = ((lx1 - rx1) * dy - (ly1 - ry1) * dx) / denom;
                
                if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
                    return {
                        x: rx1 + t * dx,
                        y: ry1 + t * dy,
                        dist: t * Math.sqrt(dx*dx + dy*dy)
                    };
                }
                return null;
            }
            
            function lineIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
                const dx = x2 - x1;
                const dy = y2 - y1;
                const fx = x1 - cx;
                const fy = y1 - cy;
                
                const a = dx*dx + dy*dy;
                const b = 2 * (fx*dx + fy*dy);
                const c = fx*fx + fy*fy - r*r;
                
                let discriminant = b*b - 4*a*c;
                if (discriminant < 0) return false;
                
                discriminant = Math.sqrt(discriminant);
                const t1 = (-b - discriminant) / (2*a);
                const t2 = (-b + discriminant) / (2*a);
                
                return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
            }
            
            // Обработка сообщений
            self.onmessage = function(e) {
                const { type, taskId, data } = e.data;
                
                switch (type) {
                    case 'init':
                        trackData = data.trackData;
                        self.postMessage({ type: 'ready', taskId });
                        break;
                        
                    case 'createNetwork':
                        const network = createNetwork(data.layers);
                        self.postMessage({ type: 'networkCreated', taskId, data: { network } });
                        break;
                        
                    case 'mutate':
                        const mutated = mutate(JSON.parse(JSON.stringify(data.network)), data.rate, data.strength);
                        self.postMessage({ type: 'mutated', taskId, data: { network: mutated } });
                        break;
                        
                    case 'crossover':
                        const child = crossover(data.parent1, data.parent2);
                        self.postMessage({ type: 'crossover', taskId, data: { network: child } });
                        break;
                        
                    case 'simulate':
                        const results = [];
                        for (const net of data.networks) {
                            const result = simulateCar(net, trackData, data.startPos, data.maxSteps);
                            results.push(result);
                        }
                        self.postMessage({ type: 'simulated', taskId, data: { results } });
                        break;
                        
                    case 'batchSimulate':
                        const batchResults = [];
                        for (let i = 0; i < data.networks.length; i++) {
                            const result = simulateCar(data.networks[i], trackData, data.startPos, data.maxSteps);
                            batchResults.push({
                                index: data.startIndex + i,
                                ...result
                            });
                        }
                        self.postMessage({ type: 'batchSimulated', taskId, data: { results: batchResults } });
                        break;
                        
                    default:
                        self.postMessage({ type: 'error', taskId, error: 'Unknown task type' });
                }
            };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        
        for (let i = 0; i < this.numWorkers; i++) {
            const worker = new Worker(workerUrl);
            worker.onmessage = (e) => this.handleWorkerMessage(e, i);
            worker.onerror = (e) => this.handleWorkerError(e, i);
            this.workers.push({
                worker,
                busy: false,
                currentTask: null
            });
        }
    }
    
    /**
     * Обработка сообщений от воркера
     */
    handleWorkerMessage(e, workerIndex) {
        const { type, taskId, data, error } = e.data;
        const workerInfo = this.workers[workerIndex];
        
        if (error) {
            console.error(`❌ Worker ${workerIndex} error:`, error);
        }
        
        // Находим задачу
        const task = this.activeTasks.get(taskId);
        if (task) {
            task.resolve({ type, data, error });
            this.activeTasks.delete(taskId);
        }
        
        // Освобождаем воркер
        workerInfo.busy = false;
        workerInfo.currentTask = null;
        
        // Запускаем следующую задачу
        this.processQueue();
    }
    
    /**
     * Обработка ошибок воркера
     */
    handleWorkerError(e, workerIndex) {
        console.error(`❌ Worker ${workerIndex} error:`, e.message);
        
        const workerInfo = this.workers[workerIndex];
        if (workerInfo.currentTask) {
            const task = this.activeTasks.get(workerInfo.currentTask);
            if (task) {
                task.reject(new Error(e.message));
                this.activeTasks.delete(workerInfo.currentTask);
            }
        }
        
        workerInfo.busy = false;
        workerInfo.currentTask = null;
        this.processQueue();
    }
    
    /**
     * Отправка задачи воркеру
     */
    sendTask(type, data) {
        return new Promise((resolve, reject) => {
            const taskId = this.taskIdCounter++;
            
            this.taskQueue.push({
                taskId,
                type,
                data,
                resolve,
                reject
            });
            
            this.processQueue();
        });
    }
    
    /**
     * Обработка очереди задач
     */
    processQueue() {
        while (this.taskQueue.length > 0) {
            // Находим свободный воркер
            const freeWorker = this.workers.find(w => !w.busy);
            if (!freeWorker) break;
            
            const task = this.taskQueue.shift();
            
            freeWorker.busy = true;
            freeWorker.currentTask = task.taskId;
            this.activeTasks.set(task.taskId, task);
            
            freeWorker.worker.postMessage({
                type: task.type,
                taskId: task.taskId,
                data: task.data
            });
        }
    }
    
    /**
     * Инициализация трассы
     */
    async initTrack(trackData) {
        const promises = this.workers.map((w, i) => 
            this.sendTask('init', { trackData })
        );
        await Promise.all(promises);
        console.log('✅ Трасса инициализирована во всех воркерах');
    }
    
    /**
     * Создание нейросети
     */
    async createNetwork(layers = [8, 10, 10, 2]) {
        const result = await this.sendTask('createNetwork', { layers });
        return result.data.network;
    }
    
    /**
     * Мутация нейросети
     */
    async mutate(network, rate = 0.15, strength = 0.3) {
        const result = await this.sendTask('mutate', { network, rate, strength });
        return result.data.network;
    }
    
    /**
     * Кроссовер
     */
    async crossover(parent1, parent2) {
        const result = await this.sendTask('crossover', { parent1, parent2 });
        return result.data.network;
    }
    
    /**
     * Симуляция партии машин (распределённая)
     */
    async simulateBatch(networks, startPos, maxSteps = 2500) {
        // Разбиваем на части по количеству воркеров
        const chunkSize = Math.ceil(networks.length / this.numWorkers);
        const chunks = [];
        
        for (let i = 0; i < networks.length; i += chunkSize) {
            chunks.push({
                networks: networks.slice(i, i + chunkSize),
                startIndex: i
            });
        }
        
        // Отправляем задачи параллельно
        const promises = chunks.map(chunk =>
            this.sendTask('batchSimulate', {
                networks: chunk.networks,
                startPos,
                maxSteps,
                startIndex: chunk.startIndex
            })
        );
        
        const results = await Promise.all(promises);
        
        // Объединяем результаты
        const allResults = [];
        for (const result of results) {
            allResults.push(...result.data.results);
        }
        
        // Сортируем по индексу
        allResults.sort((a, b) => a.index - b.index);
        
        return allResults;
    }
    
    /**
     * Получение количества активных потоков
     */
    getActiveThreads() {
        return this.workers.filter(w => w.busy).length;
    }
    
    /**
     * Получение информации о пуле
     */
    getInfo() {
        return {
            totalWorkers: this.numWorkers,
            activeWorkers: this.workers.filter(w => w.busy).length,
            queueLength: this.taskQueue.length,
            activeTasks: this.activeTasks.size
        };
    }
    
    /**
     * Завершение работы всех воркеров
     */
    terminate() {
        for (const { worker } of this.workers) {
            worker.terminate();
        }
        this.workers = [];
        this.taskQueue = [];
        this.activeTasks.clear();
        console.log('🔌 Worker Pool остановлен');
    }
}

// Экспорт
window.WorkerPool = WorkerPool;

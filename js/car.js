/**
 * Класс машины - нужно пройти 1 круг для финиша
 */

class Car {
    constructor(x, y, brain = null) {
        this.x = x;
        this.y = y;
        this.angle = -Math.PI / 2;
        
        this.speed = 0;
        this.maxSpeed = 5;
        this.acceleration = 0.2;
        this.friction = 0.98;
        this.turnSpeed = 0.05;
        
        this.width = 15;
        this.height = 25;
        
        this.sensorCount = 8;
        this.sensorLength = 120;
        this.sensors = [];
        this.sensorReadings = [];
        
        this.alive = true;
        this.finished = false;
        this.fitness = 0;
        
        this.timeAlive = 0;
        this.maxTime = 2000;
        this.finishTime = 0;
        
        // Для расчёта средней скорости
        this.speedSum = 0;
        this.speedCount = 0;
        this.totalDistance = 0;
        this.lastX = x;
        this.lastY = y;
        
        // Минимальное расстояние для финиша (устанавливается из track)
        this.minFinishDistance = 0;
        
        if (brain) {
            this.brain = brain.clone();
        } else {
            this.brain = new NeuralNetwork([8, 10, 10, 2]);
        }
        
        this.hue = Math.random() * 360;
    }
    
    update(track) {
        if (!this.alive || this.finished) return;
        
        this.timeAlive++;
        
        // Устанавливаем минимальное расстояние для финиша
        if (this.minFinishDistance === 0) {
            this.minFinishDistance = track.getMinDistanceForFinish();
        }
        
        // Таймаут
        if (this.timeAlive > this.maxTime) {
            this.alive = false;
            this.calculateFitness();
            return;
        }
        
        this.updateSensors(track);
        
        const outputs = this.brain.predict(this.sensorReadings);
        
        const accel = outputs[0];
        const steer = outputs[1];
        
        // Газ
        if (accel > 0.1) {
            this.speed += this.acceleration * accel;
        } else if (accel < -0.1) {
            this.speed += this.acceleration * accel * 0.5;
        }
        
        // Поворот
        if (Math.abs(this.speed) > 0.2) {
            this.angle += steer * this.turnSpeed * Math.sign(this.speed);
        }
        
        this.speed *= this.friction;
        this.speed = Math.max(-this.maxSpeed * 0.3, Math.min(this.maxSpeed, this.speed));
        
        // Отслеживание скорости
        this.speedSum += Math.abs(this.speed);
        this.speedCount++;
        
        const oldX = this.x;
        const oldY = this.y;
        
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        
        // Расстояние
        const dist = Math.sqrt(Math.pow(this.x - this.lastX, 2) + Math.pow(this.y - this.lastY, 2));
        this.totalDistance += dist;
        this.lastX = this.x;
        this.lastY = this.y;
        
        // Проверка столкновения
        if (track.isWall(this.x, this.y)) {
            this.alive = false;
            this.x = oldX;
            this.y = oldY;
            this.calculateFitness();
            return;
        }
        
        // Проверка финиша (только если прошли 1 круг)
        if (track.checkFinish(this.x, this.y, this.totalDistance)) {
            this.finished = true;
            this.finishTime = this.timeAlive;
        }
        
        this.calculateFitness();
    }
    
    updateSensors(track) {
        this.sensors = [];
        this.sensorReadings = [];
        
        const angles = [
            -Math.PI / 2, -Math.PI / 3, -Math.PI / 6, 0,
            Math.PI / 6, Math.PI / 3, Math.PI / 2, Math.PI
        ];
        
        for (let i = 0; i < this.sensorCount; i++) {
            const sensorAngle = this.angle + angles[i];
            const endX = this.x + Math.cos(sensorAngle) * this.sensorLength;
            const endY = this.y + Math.sin(sensorAngle) * this.sensorLength;
            
            this.sensors.push({ x1: this.x, y1: this.y, x2: endX, y2: endY });
            
            const reading = this.castRay(this.x, this.y, endX, endY, track);
            this.sensorReadings.push(reading);
        }
    }
    
    castRay(x1, y1, x2, y2, track) {
        const steps = 30;
        const dx = (x2 - x1) / steps;
        const dy = (y2 - y1) / steps;
        
        for (let i = 0; i <= steps; i++) {
            const x = x1 + dx * i;
            const y = y1 + dy * i;
            
            if (track.isWall(x, y)) {
                return i / steps;
            }
        }
        return 1;
    }
    
    calculateFitness() {
        // === ГЛАВНАЯ ЗАДАЧА: ПРОЙТИ 1 КРУГ И БЫСТРО ФИНИШИРОВАТЬ ===
        
        let fitness = 0;
        
        // 1. Бонус за выживание (не врезались)
        fitness += this.timeAlive * 2;
        
        // 2. Бонус за пройденное расстояние
        fitness += this.totalDistance * 0.5;
        
        // 3. Бонус за среднюю скорость
        if (this.speedCount > 0) {
            const avgSpeed = this.speedSum / this.speedCount;
            fitness += avgSpeed * 50;
        }
        
        // 4. ОГРОМНЫЙ БОНУС ЗА ФИНИШ (пройден 1 круг)
        if (this.finished) {
            // Базовый бонус за финиш
            fitness += 30000;
            
            // ГЛАВНЫЙ БОНУС - за быстрое время
            const timeBonus = Math.max(0, (this.maxTime - this.finishTime) * 25);
            fitness += timeBonus;
            
            // Дополнительные бонусы за очень быстрое время
            if (this.finishTime < 300) {
                fitness += 15000; // Очень быстро!
            } else if (this.finishTime < 500) {
                fitness += 8000;
            } else if (this.finishTime < 800) {
                fitness += 3000;
            }
        }
        
        // 5. Штраф за низкую скорость
        if (this.timeAlive > 100 && this.speedCount > 0) {
            const avgSpeed = this.speedSum / this.speedCount;
            if (avgSpeed < 1) {
                fitness -= 1000;
            } else if (avgSpeed < 2) {
                fitness -= 500;
            }
        }
        
        this.fitness = Math.max(0, fitness);
    }
    
    draw(ctx, isBest = false) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2);
        
        if (isBest) {
            ctx.fillStyle = '#0066cc';
        } else if (this.alive) {
            ctx.fillStyle = `hsl(${this.hue}, 50%, 50%)`;
        } else {
            ctx.fillStyle = '#ccc';
        }
        
        ctx.beginPath();
        ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 3);
        ctx.fill();
        
        ctx.strokeStyle = isBest ? '#004080' : '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        if (this.alive) {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.roundRect(-this.width / 2 + 2, -this.height / 2 + 5, this.width - 4, this.height / 3, 2);
            ctx.fill();
        }
        
        ctx.restore();
        
        if (isBest && this.alive) {
            this.drawSensors(ctx);
        }
    }
    
    drawSensors(ctx) {
        for (let i = 0; i < this.sensors.length; i++) {
            const s = this.sensors[i];
            const r = this.sensorReadings[i];
            
            const hitX = s.x1 + (s.x2 - s.x1) * r;
            const hitY = s.y1 + (s.y2 - s.y1) * r;
            
            ctx.strokeStyle = r < 0.5 ? 'rgba(204,0,0,0.3)' : 'rgba(0,102,204,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(s.x1, s.y1);
            ctx.lineTo(hitX, hitY);
            ctx.stroke();
            
            ctx.fillStyle = r < 0.5 ? '#cc0000' : '#0066cc';
            ctx.beginPath();
            ctx.arc(hitX, hitY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

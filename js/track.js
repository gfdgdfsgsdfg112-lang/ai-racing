/**
 * Класс трассы - 5 шаблонов, финиш после 1 круга
 */

class Track {
    constructor(width, height, type = 'complex') {
        this.width = width;
        this.height = height;
        this.type = type;
        
        this.trackWidth = 70;
        this.wallThickness = 5;
        
        this.innerPath = [];
        this.outerPath = [];
        this.centerPath = [];
        
        this.startX = 0;
        this.startY = 0;
        this.startAngle = 0;
        
        // Для расчёта финиша
        this.trackLength = 0;
        this.minFinishDistance = 0;
        this.finishZone = { x: 0, y: 0, radius: 40 };
        
        // Offscreen canvas для проверки столкновений
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        
        this.generateTrack(type);
        this.calculateTrackLength();
    }
    
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.offscreenCanvas.width = width;
        this.offscreenCanvas.height = height;
        this.generateTrack(this.type);
        this.calculateTrackLength();
        this.drawToOffscreen();
    }
    
    loadTemplate(type) {
        this.type = type;
        this.generateTrack(type);
        this.calculateTrackLength();
        this.drawToOffscreen();
    }
    
    generateTrack(type) {
        const cx = this.width / 2;
        const cy = this.height / 2;
        
        switch(type) {
            case 'oval':
                this.generateOval(cx, cy);
                break;
            case 'circuit':
                this.generateCircuit(cx, cy);
                break;
            case 'zigzag':
                this.generateZigzag(cx, cy);
                break;
            case 'figure8':
                this.generateFigure8(cx, cy);
                break;
            case 'complex':
            default:
                this.generateComplex(cx, cy);
                break;
        }
        
        this.startX = this.centerPath[0].x;
        this.startY = this.centerPath[0].y;
        this.startAngle = this.calculateStartAngle();
        
        // Зона финиша - в начале трассы
        this.finishZone = {
            x: this.startX,
            y: this.startY,
            radius: 40
        };
        
        // Инициализируем offscreen canvas
        this.offscreenCanvas.width = this.width;
        this.offscreenCanvas.height = this.height;
        this.drawToOffscreen();
    }
    
    generateOval(cx, cy) {
        const rx = 280;
        const ry = 180;
        const points = 60;
        
        this.centerPath = [];
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            this.centerPath.push({
                x: cx + Math.cos(angle) * rx,
                y: cy + Math.sin(angle) * ry
            });
        }
        
        this.createWalls();
    }
    
    generateCircuit(cx, cy) {
        const points = [
            { x: cx - 250, y: cy - 150 },
            { x: cx + 200, y: cy - 150 },
            { x: cx + 280, y: cy },
            { x: cx + 200, y: cy + 150 },
            { x: cx - 250, y: cy + 150 },
            { x: cx - 280, y: cy }
        ];
        
        this.centerPath = this.smoothPath(points, 30);
        this.createWalls();
    }
    
    generateZigzag(cx, cy) {
        const points = [
            { x: cx - 250, y: cy },
            { x: cx - 150, y: cy - 120 },
            { x: cx, y: cy + 120 },
            { x: cx + 150, y: cy - 120 },
            { x: cx + 250, y: cy },
            { x: cx + 150, y: cy + 120 },
            { x: cx, y: cy - 120 },
            { x: cx - 150, y: cy + 120 }
        ];
        
        this.centerPath = this.smoothPath(points, 25);
        this.createWalls();
    }
    
    generateFigure8(cx, cy) {
        const points = 60;
        this.centerPath = [];
        
        for (let i = 0; i < points; i++) {
            const t = (i / points) * Math.PI * 2;
            const scale = 180;
            this.centerPath.push({
                x: cx + Math.sin(t) * scale,
                y: cy + Math.sin(t * 2) * scale * 0.6
            });
        }
        
        this.createWalls();
    }
    
    generateComplex(cx, cy) {
        const points = [
            { x: cx - 200, y: cy - 150 },
            { x: cx - 50, y: cy - 180 },
            { x: cx + 100, y: cy - 120 },
            { x: cx + 250, y: cy - 100 },
            { x: cx + 280, y: cy + 50 },
            { x: cx + 150, y: cy + 150 },
            { x: cx, y: cy + 100 },
            { x: cx - 100, y: cy + 180 },
            { x: cx - 250, y: cy + 100 },
            { x: cx - 280, y: cy - 50 }
        ];
        
        this.centerPath = this.smoothPath(points, 20);
        this.createWalls();
    }
    
    smoothPath(points, segments) {
        const result = [];
        const n = points.length;
        
        for (let i = 0; i < n; i++) {
            const p0 = points[(i - 1 + n) % n];
            const p1 = points[i];
            const p2 = points[(i + 1) % n];
            const p3 = points[(i + 2) % n];
            
            for (let t = 0; t < segments; t++) {
                const s = t / segments;
                const s2 = s * s;
                const s3 = s2 * s;
                
                const x = 0.5 * ((2 * p1.x) +
                    (-p0.x + p2.x) * s +
                    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * s2 +
                    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * s3);
                
                const y = 0.5 * ((2 * p1.y) +
                    (-p0.y + p2.y) * s +
                    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * s2 +
                    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * s3);
                
                result.push({ x, y });
            }
        }
        
        return result;
    }
    
    createWalls() {
        this.innerPath = [];
        this.outerPath = [];
        
        const n = this.centerPath.length;
        
        for (let i = 0; i < n; i++) {
            const prev = this.centerPath[(i - 1 + n) % n];
            const curr = this.centerPath[i];
            const next = this.centerPath[(i + 1) % n];
            
            const dx = next.x - prev.x;
            const dy = next.y - prev.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            
            if (len === 0) continue;
            
            const nx = -dy / len;
            const ny = dx / len;
            
            const halfWidth = this.trackWidth / 2;
            
            this.innerPath.push({
                x: curr.x + nx * halfWidth,
                y: curr.y + ny * halfWidth
            });
            
            this.outerPath.push({
                x: curr.x - nx * halfWidth,
                y: curr.y - ny * halfWidth
            });
        }
    }
    
    calculateStartAngle() {
        if (this.centerPath.length < 2) return 0;
        
        const p0 = this.centerPath[0];
        const p1 = this.centerPath[1];
        
        return Math.atan2(p1.y - p0.y, p1.x - p0.x);
    }
    
    calculateTrackLength() {
        this.trackLength = 0;
        
        for (let i = 0; i < this.centerPath.length; i++) {
            const p1 = this.centerPath[i];
            const p2 = this.centerPath[(i + 1) % this.centerPath.length];
            
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            
            this.trackLength += Math.sqrt(dx * dx + dy * dy);
        }
        
        // Минимальное расстояние для финиша = 75% длины круга
        // Это гарантирует, что машина прошла почти полный круг
        this.minFinishDistance = this.trackLength * 0.75;
    }
    
    getMinDistanceForFinish() {
        return this.minFinishDistance;
    }
    
    getStartPosition() {
        return {
            x: this.startX,
            y: this.startY,
            angle: this.startAngle
        };
    }
    
    isWall(x, y) {
        // Проверка границ
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return true;
        }
        
        const imageData = this.offscreenCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1);
        const r = imageData.data[0];
        const g = imageData.data[1];
        const b = imageData.data[2];
        
        // Стена = тёмный цвет (r < 100)
        return r < 100;
    }
    
    checkFinish(x, y, totalDistance) {
        // Проверяем, что машина прошла минимум 75% круга
        if (totalDistance < this.minFinishDistance) {
            return false;
        }
        
        // Проверяем, что машина в зоне финиша
        const dx = x - this.finishZone.x;
        const dy = y - this.finishZone.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        return dist < this.finishZone.radius;
    }
    
    drawToOffscreen() {
        const ctx = this.offscreenCtx;
        
        // Фон
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Трасса (дорога)
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.moveTo(this.outerPath[0].x, this.outerPath[0].y);
        for (let i = 1; i < this.outerPath.length; i++) {
            ctx.lineTo(this.outerPath[i].x, this.outerPath[i].y);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(this.innerPath[0].x, this.innerPath[0].y);
        for (let i = 1; i < this.innerPath.length; i++) {
            ctx.lineTo(this.innerPath[i].x, this.innerPath[i].y);
        }
        ctx.closePath();
        ctx.fill();
        
        // Внешняя стена
        ctx.strokeStyle = '#333';
        ctx.lineWidth = this.wallThickness;
        ctx.beginPath();
        ctx.moveTo(this.outerPath[0].x, this.outerPath[0].y);
        for (let i = 1; i < this.outerPath.length; i++) {
            ctx.lineTo(this.outerPath[i].x, this.outerPath[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Внутренняя стена
        ctx.beginPath();
        ctx.moveTo(this.innerPath[0].x, this.innerPath[0].y);
        for (let i = 1; i < this.innerPath.length; i++) {
            ctx.lineTo(this.innerPath[i].x, this.innerPath[i].y);
        }
        ctx.closePath();
        ctx.stroke();
    }
    
    draw(ctx) {
        // Фон
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Трасса (дорога)
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.moveTo(this.outerPath[0].x, this.outerPath[0].y);
        for (let i = 1; i < this.outerPath.length; i++) {
            ctx.lineTo(this.outerPath[i].x, this.outerPath[i].y);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(this.innerPath[0].x, this.innerPath[0].y);
        for (let i = 1; i < this.innerPath.length; i++) {
            ctx.lineTo(this.innerPath[i].x, this.innerPath[i].y);
        }
        ctx.closePath();
        ctx.fill();
        
        // Внешняя стена
        ctx.strokeStyle = '#333';
        ctx.lineWidth = this.wallThickness;
        ctx.beginPath();
        ctx.moveTo(this.outerPath[0].x, this.outerPath[0].y);
        for (let i = 1; i < this.outerPath.length; i++) {
            ctx.lineTo(this.outerPath[i].x, this.outerPath[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Внутренняя стена
        ctx.beginPath();
        ctx.moveTo(this.innerPath[0].x, this.innerPath[0].y);
        for (let i = 1; i < this.innerPath.length; i++) {
            ctx.lineTo(this.innerPath[i].x, this.innerPath[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Центральная линия (пунктир)
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        ctx.setLineDash([15, 15]);
        ctx.beginPath();
        ctx.moveTo(this.centerPath[0].x, this.centerPath[0].y);
        for (let i = 1; i < this.centerPath.length; i++) {
            ctx.lineTo(this.centerPath[i].x, this.centerPath[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Старт/Финиш линия
        this.drawFinishLine(ctx);
        
        // Зона финиша (полупрозрачная)
        ctx.fillStyle = 'rgba(0, 102, 204, 0.1)';
        ctx.beginPath();
        ctx.arc(this.finishZone.x, this.finishZone.y, this.finishZone.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Стартовая позиция
        ctx.fillStyle = '#0066cc';
        ctx.beginPath();
        ctx.arc(this.startX, this.startY, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Стрелка направления
        ctx.strokeStyle = '#0066cc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const arrowLen = 25;
        ctx.moveTo(this.startX, this.startY);
        ctx.lineTo(
            this.startX + Math.cos(this.startAngle) * arrowLen,
            this.startY + Math.sin(this.startAngle) * arrowLen
        );
        ctx.stroke();
    }
    
    drawFinishLine(ctx) {
        // Находим перпендикулярное направление в точке старта
        const n = this.centerPath.length;
        const p0 = this.centerPath[0];
        const p1 = this.centerPath[1];
        
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        if (len === 0) return;
        
        const nx = -dy / len;
        const ny = dx / len;
        
        const halfWidth = this.trackWidth / 2;
        
        const x1 = p0.x + nx * halfWidth;
        const y1 = p0.y + ny * halfWidth;
        const x2 = p0.x - nx * halfWidth;
        const y2 = p0.y - ny * halfWidth;
        
        // Шахматная клетка
        const segments = 8;
        
        for (let i = 0; i < segments; i++) {
            const t1 = i / segments;
            const t2 = (i + 1) / segments;
            
            const sx1 = x1 + (x2 - x1) * t1;
            const sy1 = y1 + (y2 - y1) * t1;
            const sx2 = x1 + (x2 - x1) * t2;
            const sy2 = y1 + (y2 - y1) * t2;
            
            ctx.fillStyle = (i % 2 === 0) ? '#fff' : '#000';
            ctx.lineWidth = 3;
            
            const perpX = -ny * 4;
            const perpY = nx * 4;
            
            ctx.beginPath();
            ctx.moveTo(sx1 - perpX, sy1 - perpY);
            ctx.lineTo(sx2 - perpX, sy2 - perpY);
            ctx.lineTo(sx2 + perpX, sy2 + perpY);
            ctx.lineTo(sx1 + perpX, sy1 + perpY);
            ctx.closePath();
            ctx.fill();
        }
    }
    
    getTemplateInfo() {
        const infos = {
            oval: {
                name: 'Овал',
                description: 'Простой овал для начинающих',
                difficulty: 1
            },
            circuit: {
                name: 'Кольцо',
                description: 'Классическая кольцевая трасса',
                difficulty: 2
            },
            zigzag: {
                name: 'Зигзаг',
                description: 'Чередование левых и правых поворотов',
                difficulty: 2
            },
            figure8: {
                name: 'Восьмёрка',
                description: 'Пересечение в центре',
                difficulty: 2
            },
            complex: {
                name: 'Сложная',
                description: 'Множество разнообразных поворотов',
                difficulty: 3
            }
        };
        
        return infos[this.type] || infos.complex;
    }
}

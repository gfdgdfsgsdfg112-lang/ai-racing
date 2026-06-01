/**
 * Нейронная сеть для управления машиной
 */

class NeuralNetwork {
    constructor(layerSizes) {
        this.layerSizes = layerSizes;
        this.layers = [];
        
        for (let i = 0; i < layerSizes.length - 1; i++) {
            this.layers.push({
                weights: this.createMatrix(layerSizes[i + 1], layerSizes[i]),
                biases: new Array(layerSizes[i + 1]).fill(0)
            });
        }
        
        this.randomize();
    }
    
    createMatrix(rows, cols) {
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            matrix.push(new Array(cols).fill(0));
        }
        return matrix;
    }
    
    randomize() {
        for (const layer of this.layers) {
            for (let i = 0; i < layer.weights.length; i++) {
                for (let j = 0; j < layer.weights[i].length; j++) {
                    const scale = Math.sqrt(2 / (layer.weights[i].length + layer.weights.length));
                    layer.weights[i][j] = (Math.random() * 2 - 1) * scale;
                }
            }
            for (let i = 0; i < layer.biases.length; i++) {
                layer.biases[i] = (Math.random() * 2 - 1) * 0.1;
            }
        }
    }
    
    predict(inputs) {
        let current = inputs.slice();
        
        for (let l = 0; l < this.layers.length; l++) {
            const layer = this.layers[l];
            const next = new Array(layer.biases.length);
            
            for (let i = 0; i < layer.biases.length; i++) {
                let sum = layer.biases[i];
                for (let j = 0; j < current.length; j++) {
                    sum += layer.weights[i][j] * current[j];
                }
                next[i] = l < this.layers.length - 1 ? Math.max(0, sum) : Math.tanh(sum);
            }
            
            current = next;
        }
        
        return current;
    }
    
    clone() {
        const nn = new NeuralNetwork(this.layerSizes.slice());
        
        for (let l = 0; l < this.layers.length; l++) {
            const src = this.layers[l];
            const dst = nn.layers[l];
            
            for (let i = 0; i < src.weights.length; i++) {
                for (let j = 0; j < src.weights[i].length; j++) {
                    dst.weights[i][j] = src.weights[i][j];
                }
            }
            for (let i = 0; i < src.biases.length; i++) {
                dst.biases[i] = src.biases[i];
            }
        }
        
        return nn;
    }
    
    mutate(rate, strength) {
        for (const layer of this.layers) {
            for (let i = 0; i < layer.weights.length; i++) {
                for (let j = 0; j < layer.weights[i].length; j++) {
                    if (Math.random() < rate) {
                        layer.weights[i][j] += (Math.random() * 2 - 1) * strength;
                        layer.weights[i][j] = Math.max(-3, Math.min(3, layer.weights[i][j]));
                    }
                }
            }
            for (let i = 0; i < layer.biases.length; i++) {
                if (Math.random() < rate) {
                    layer.biases[i] += (Math.random() * 2 - 1) * strength;
                    layer.biases[i] = Math.max(-3, Math.min(3, layer.biases[i]));
                }
            }
        }
    }
    
    static crossover(a, b) {
        const child = a.clone();
        
        for (let l = 0; l < child.layers.length; l++) {
            const la = a.layers[l];
            const lb = b.layers[l];
            const lc = child.layers[l];
            
            for (let i = 0; i < lc.weights.length; i++) {
                for (let j = 0; j < lc.weights[i].length; j++) {
                    lc.weights[i][j] = Math.random() < 0.5 ? la.weights[i][j] : lb.weights[i][j];
                }
                lc.biases[i] = Math.random() < 0.5 ? la.biases[i] : lb.biases[i];
            }
        }
        
        return child;
    }
    
    // Получить все веса как плоский массив
    getWeights() {
        const weights = [];
        for (const layer of this.layers) {
            for (const row of layer.weights) {
                weights.push(...row);
            }
            weights.push(...layer.biases);
        }
        return weights;
    }
    
    // Установить веса из плоского массива
    setWeights(weights) {
        let idx = 0;
        for (const layer of this.layers) {
            for (let i = 0; i < layer.weights.length; i++) {
                for (let j = 0; j < layer.weights[i].length; j++) {
                    layer.weights[i][j] = weights[idx++];
                }
            }
            for (let i = 0; i < layer.biases.length; i++) {
                layer.biases[i] = weights[idx++];
            }
        }
    }
}

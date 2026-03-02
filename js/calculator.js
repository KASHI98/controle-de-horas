const Calculator = {
    // Calcula as horas reais entre início e fim
    calcularDuracao(inicio, fim) {
        if (!inicio || !fim) return 0;
        const [h1, m1] = inicio.split(':').map(Number);
        const [h2, m2] = fim.split(':').map(Number);
        
        let min1 = h1 * 60 + m1;
        let min2 = h2 * 60 + m2;
        
        if (min2 < min1) min2 += 24 * 60; // Trata virada de dia
        
        return (min2 - min1) / 60; 
    },

    calcularValorHora(salario, horasSemana) {
        return Number(salario) / (Number(horasSemana) * 5);
    },

    calcularDiaria(salario) {
        return Number(salario) / 22;
    }
};
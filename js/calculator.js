const Calculator = {
    // Converte uma string "HH:MM" em minutos. Retorna null se inválida.
    _parseHora(str) {
        if (typeof str !== 'string') return null;
        const match = str.trim().match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return null;
        const h = Number(match[1]);
        const m = Number(match[2]);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
        if (h < 0 || h > 23 || m < 0 || m > 59) return null;
        return h * 60 + m;
    },

    // Calcula as horas reais entre início e fim.
    // Lança Error com mensagem amigável se as horas forem inválidas.
    calcularDuracao(inicio, fim) {
        const min1 = this._parseHora(inicio);
        if (min1 === null) {
            throw new Error("Hora de início inválida. Use o formato HH:MM (ex: 08:30).");
        }
        const min2Raw = this._parseHora(fim);
        if (min2Raw === null) {
            throw new Error("Hora de término inválida. Use o formato HH:MM (ex: 17:00).");
        }

        let min2 = min2Raw;
        if (min2 < min1) min2 += 24 * 60; // Trata virada de dia

        const horas = (min2 - min1) / 60;
        if (horas > 24) {
            throw new Error("A duração informada excede 24 horas.");
        }
        return horas;
    },

    calcularValorHora(salario, horasSemana) {
        const s = Number(salario);
        const h = Number(horasSemana);
        if (!Number.isFinite(s) || s < 0) return 0;
        if (!Number.isFinite(h) || h <= 0) return 0;
        return s / (h * 5);
    },

    calcularDiaria(salario) {
        const s = Number(salario);
        if (!Number.isFinite(s) || s < 0) return 0;
        return s / 22;
    }
};

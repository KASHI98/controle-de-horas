let editandoId = null;

// --- Helpers de UX e segurança ---------------------------------------------

function mostrarMensagem(texto, tipo = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText =
            'position:fixed;top:20px;right:20px;z-index:9999;' +
            'display:flex;flex-direction:column;gap:10px;max-width:360px;';
        document.body.appendChild(container);
    }

    const cores = { info: '#3742fa', success: '#2ed573', warning: '#ffa502', error: '#ff4757' };
    const cor = cores[tipo] || cores.info;

    const toast = document.createElement('div');
    toast.style.cssText =
        'background:#1e1e2e;color:#fff;padding:12px 16px;' +
        `border-left:4px solid ${cor};border-radius:6px;` +
        'box-shadow:0 4px 12px rgba(0,0,0,0.4);font-size:14px;' +
        'opacity:0;transform:translateX(20px);transition:all .25s ease;';
    toast.textContent = texto;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    });
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function escapeHtml(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function lerRegistros() {
    try {
        const dados = Storage.get();
        return Array.isArray(dados) ? dados : [];
    } catch (err) {
        console.error('Falha ao ler registros do Storage:', err);
        mostrarMensagem(
            "Não foi possível carregar os registros salvos. Os dados podem estar corrompidos.",
            'error'
        );
        return [];
    }
}

function salvarRegistros(banco) {
    try {
        Storage.save(banco);
        return true;
    } catch (err) {
        console.error('Falha ao salvar no Storage:', err);
        mostrarMensagem(
            "Falha ao salvar no armazenamento local. Verifique o espaço disponível do navegador.",
            'error'
        );
        return false;
    }
}

function valorNumerico(valor, { min = -Infinity, max = Infinity, fallback = 0 } = {}) {
    const n = Number(valor);
    if (!Number.isFinite(n) || n < min || n > max) return fallback;
    return n;
}

// --- Navegação --------------------------------------------------------------

function showPage(pageId) {
    const page = document.getElementById(pageId);
    if (!page) {
        mostrarMensagem(`Página "${pageId}" não encontrada.`, 'warning');
        return;
    }
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.menu button').forEach(b => b.classList.remove('active'));
    page.classList.add('active');
    document.getElementById(`btn-${pageId}`)?.classList.add('active');
}

// --- Registro de horas ------------------------------------------------------

function registrarExtra() {
    const tituloEl = document.getElementById('titulo');
    const dataEl = document.getElementById('dataAtividade');
    const inicioEl = document.getElementById('horaInicio');
    const fimEl = document.getElementById('horaFim');
    const tipoEl = document.getElementById('tipoDia');
    const anotacaoEl = document.getElementById('anotacao');

    if (!tituloEl || !dataEl || !inicioEl || !fimEl || !tipoEl) {
        mostrarMensagem("Formulário indisponível. Recarregue a página.", 'error');
        return;
    }

    const titulo = (tituloEl.value || '').trim();
    const data = dataEl.value;
    const inicio = inicioEl.value;
    const fim = fimEl.value;
    const anotacao = anotacaoEl ? (anotacaoEl.value || '').trim() : '';
    const multiplicador = parseFloat(tipoEl.value);

    const erros = [];
    if (!titulo) erros.push("Informe um título/projeto.");
    if (titulo.length > 200) erros.push("O título deve ter no máximo 200 caracteres.");
    if (!data) {
        erros.push("Selecione a data.");
    } else if (Number.isNaN(new Date(data + 'T00:00:00').getTime())) {
        erros.push("Data inválida.");
    }
    if (!inicio) erros.push("Informe o horário de início.");
    if (!fim) erros.push("Informe o horário de término.");
    if (!Number.isFinite(multiplicador) || multiplicador <= 0) {
        erros.push("Selecione um tipo de adicional válido.");
    }

    if (erros.length) {
        mostrarMensagem(erros.join(' '), 'warning');
        return;
    }

    let duracaoReal;
    try {
        duracaoReal = Calculator.calcularDuracao(inicio, fim);
    } catch (err) {
        mostrarMensagem(err && err.message ? err.message : "Erro ao calcular a duração.", 'error');
        return;
    }

    if (!Number.isFinite(duracaoReal) || duracaoReal <= 0) {
        mostrarMensagem(
            "A duração informada é inválida. O horário de término deve ser diferente do de início.",
            'error'
        );
        return;
    }

    const registro = { titulo, data, inicio, fim, multiplicador, anotacao, duracaoReal };
    let banco = lerRegistros();

    let mensagemSucesso;
    if (editandoId !== null) {
        const existe = banco.some(i => i.id === editandoId);
        if (!existe) {
            mostrarMensagem(
                "O registro em edição não foi encontrado. Ele será salvo como novo.",
                'warning'
            );
            banco.push({ ...registro, id: Date.now() });
            mensagemSucesso = "Registro salvo com sucesso.";
        } else {
            banco = banco.map(i => (i.id === editandoId ? { ...registro, id: editandoId } : i));
            mensagemSucesso = "Registro atualizado com sucesso.";
        }
        editandoId = null;
        const btn = document.querySelector('.main-action');
        if (btn) btn.textContent = "Salvar Registro";
    } else {
        banco.push({ ...registro, id: Date.now() });
        mensagemSucesso = "Registro salvo com sucesso.";
    }

    if (!salvarRegistros(banco)) return;

    limparForm();
    renderizarTudo();
    showPage('dashboard');
    mostrarMensagem(mensagemSucesso, 'success');
}

// --- Renderização -----------------------------------------------------------

function renderizarTudo() {
    const data = lerRegistros();

    const salEl = document.getElementById('valorSalario');
    const hrsEl = document.getElementById('horasSemana');
    const sal = salEl ? valorNumerico(salEl.value, { min: 0, fallback: 0 }) : 0;
    const hrs = hrsEl ? valorNumerico(hrsEl.value, { min: 0.01, fallback: 44 }) : 44;
    const vHora = Calculator.calcularValorHora(sal, hrs);

    let hReais = 0, h50 = 0, h100 = 0, lucro = 0;

    const timeline = document.getElementById('timelineDashboard');
    if (!timeline) return;

    if (data.length === 0) {
        timeline.innerHTML =
            '<p style="color:var(--text-dim); text-align:center; padding:20px">' +
            'Nenhum registro ainda. Adicione o primeiro em "Registrar Horas".</p>';
        renderDash(0, 0, 0, 0);
        return;
    }

    timeline.innerHTML = [...data].reverse().map(item => {
        const duracao = valorNumerico(item && item.duracaoReal, { min: 0, fallback: 0 });
        const mult = valorNumerico(item && item.multiplicador, { min: 0, fallback: 0 });

        const itemLucro = Number.isFinite(vHora) ? duracao * mult * vHora : 0;
        hReais += duracao;
        if (mult === 1.5) h50 += duracao;
        else if (mult === 2.0) h100 += duracao;
        lucro += itemLucro;

        const dataObj = item && item.data ? new Date(item.data + 'T00:00:00') : null;
        const dataValida = dataObj && !Number.isNaN(dataObj.getTime());
        const dia = dataValida ? dataObj.getDate() : '—';
        const mes = dataValida ? dataObj.toLocaleString('pt-BR', { month: 'short' }) : '—';

        const idSeguro = valorNumerico(item && item.id, { fallback: 0 });

        return `
            <div class="timeline-item">
                <div class="date-badge">
                    <span class="day">${dia}</span>
                    <span class="month">${mes}</span>
                </div>
                <div class="item-info">
                    <h3>${escapeHtml((item && item.titulo) || 'Sem título')}</h3>
                    <p>🕒 ${escapeHtml((item && item.inicio) || '--:--')} - ${escapeHtml((item && item.fim) || '--:--')} (${duracao.toFixed(2)}h reais)</p>
                </div>
                <div class="lucro-tag" style="color:var(--red); font-weight:bold; margin-right:15px">
                    R$ ${itemLucro.toFixed(2)}
                </div>
                <div class="actions">
                    <button class="btn-view" onclick="abrirModal(${idSeguro})">Ver</button>
                    <button class="btn-view" style="background:#333" onclick="editar(${idSeguro})">Editar</button>
                    <button class="btn-del" onclick="deletar(${idSeguro})">Excluir</button>
                </div>
            </div>`;
    }).join('');

    renderDash(hReais, h50, h100, lucro);
}

function renderDash(total, p50, p100, lucro) {
    const el = document.getElementById('resumoExtras');
    if (!el) return;
    const seguro = (v) => (Number.isFinite(v) ? v : 0);
    const t = seguro(total), a = seguro(p50), b = seguro(p100), l = seguro(lucro);
    el.innerHTML = `
        <div class="card-dash"><p>Horas Reais</p><h2>${t.toFixed(2)}h</h2></div>
        <div class="card-dash" style="border-left-color: #ffa502"><p>Extras 50%</p><h2>${a.toFixed(2)}h</h2></div>
        <div class="card-dash" style="border-left-color: var(--red)"><p>Extras 100%</p><h2>${b.toFixed(2)}h</h2></div>
        <div class="card-dash" style="border-left-color: #2ed573"><p>Ganho Extra</p><h2>R$ ${l.toFixed(2)}</h2></div>
    `;
}

// --- Ações sobre registros --------------------------------------------------

function editar(id) {
    const r = lerRegistros().find(i => i.id === id);
    if (!r) {
        mostrarMensagem("Registro não encontrado para edição.", 'warning');
        return;
    }
    const setVal = (elId, valor) => {
        const el = document.getElementById(elId);
        if (el) el.value = valor;
    };
    setVal('titulo', r.titulo || '');
    setVal('dataAtividade', r.data || '');
    setVal('horaInicio', r.inicio || '');
    setVal('horaFim', r.fim || '');
    setVal('tipoDia', r.multiplicador != null ? String(r.multiplicador) : '1.5');
    setVal('anotacao', r.anotacao || '');
    editandoId = id;
    const btn = document.querySelector('.main-action');
    if (btn) btn.textContent = "Atualizar Registro";
    showPage('extras');
}

function abrirModal(id) {
    const item = lerRegistros().find(i => i.id === id);
    const modal = document.getElementById('modalDetalhes');
    const body = document.getElementById('modalBody');
    if (!item) {
        mostrarMensagem("Registro não encontrado.", 'warning');
        return;
    }
    if (!modal || !body) return;

    const duracao = valorNumerico(item.duracaoReal, { min: 0, fallback: 0 });
    body.innerHTML = `
        <p><strong>Projeto:</strong> ${escapeHtml(item.titulo || 'Sem título')}</p>
        <p><strong>Horário:</strong> ${escapeHtml(item.inicio || '--:--')} às ${escapeHtml(item.fim || '--:--')}</p>
        <p><strong>Tempo Real:</strong> ${duracao.toFixed(2)}h</p>
        <hr style="margin:10px 0; border-color:#333">
        <p><strong>Anotações:</strong> ${escapeHtml(item.anotacao || 'Nenhuma.')}</p>
    `;
    modal.style.display = 'block';
}

function deletar(id) {
    const banco = lerRegistros();
    if (!banco.some(i => i.id === id)) {
        mostrarMensagem("Registro não encontrado.", 'warning');
        return;
    }
    if (!confirm("Apagar?")) return;
    if (salvarRegistros(banco.filter(i => i.id !== id))) {
        renderizarTudo();
        mostrarMensagem("Registro apagado.", 'success');
    }
}

// --- Exportação -------------------------------------------------------------

function exportarPDF() {
    if (typeof html2pdf === 'undefined') {
        mostrarMensagem(
            "Biblioteca de PDF não carregada. Verifique sua conexão e tente novamente.",
            'error'
        );
        return;
    }
    const dash = document.getElementById('dashboard');
    if (!dash) {
        mostrarMensagem("Dashboard não encontrado para gerar o PDF.", 'error');
        return;
    }

    const originalDisplay = dash.style.display;
    dash.style.display = 'block'; // Força visibilidade para o PDF não sair branco

    const opt = {
        margin: 10,
        filename: 'relatorio-clayver.pdf',
        html2canvas: { scale: 2, backgroundColor: '#0a0a0a' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        const resultado = html2pdf().set(opt).from(dash).save();
        if (resultado && typeof resultado.then === 'function') {
            resultado
                .then(() => { dash.style.display = originalDisplay; })
                .catch(err => {
                    console.error('Falha ao gerar PDF:', err);
                    dash.style.display = originalDisplay;
                    mostrarMensagem("Falha ao gerar o PDF. Tente novamente.", 'error');
                });
        } else {
            dash.style.display = originalDisplay;
        }
    } catch (err) {
        console.error('Erro inesperado ao gerar PDF:', err);
        dash.style.display = originalDisplay;
        mostrarMensagem("Falha ao gerar o PDF. Tente novamente.", 'error');
    }
}

// --- Formulário e salário ---------------------------------------------------

function fecharModal() {
    const m = document.getElementById('modalDetalhes');
    if (m) m.style.display = 'none';
}

function calcularSalario() {
    const salEl = document.getElementById('valorSalario');
    const hrsEl = document.getElementById('horasSemana');
    const resEl = document.getElementById('resultadoSalario');
    if (!salEl || !hrsEl || !resEl) return;

    const sal = Number(salEl.value);
    const hrs = Number(hrsEl.value);

    if (!Number.isFinite(sal) || sal < 0) {
        resEl.innerHTML =
            '<h3 style="color:#ffa502">Informe um salário válido (número maior ou igual a zero).</h3>';
        renderizarTudo();
        return;
    }
    if (!Number.isFinite(hrs) || hrs <= 0) {
        resEl.innerHTML =
            '<h3 style="color:#ffa502">Informe uma quantidade de horas semanais maior que zero.</h3>';
        renderizarTudo();
        return;
    }

    const vH = Calculator.calcularValorHora(sal, hrs);
    resEl.innerHTML = `<h3 style="color:var(--purple)">Valor por Hora: R$ ${vH.toFixed(2)}</h3>`;
    renderizarTudo();
}

function limparForm() {
    ['titulo', 'dataAtividade', 'horaInicio', 'horaFim', 'anotacao'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

window.onload = () => {
    try {
        calcularSalario();
        renderizarTudo();
    } catch (err) {
        console.error('Erro ao inicializar a aplicação:', err);
        mostrarMensagem("Erro ao inicializar a aplicação. Verifique o console.", 'error');
    }
};

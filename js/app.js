let editandoId = null;

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.menu button').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.getElementById(`btn-${pageId}`)?.classList.add('active');
}

function registrarExtra() {
    const inputs = {
        titulo: document.getElementById('titulo').value,
        data: document.getElementById('dataAtividade').value,
        inicio: document.getElementById('horaInicio').value,
        fim: document.getElementById('horaFim').value,
        multiplicador: parseFloat(document.getElementById('tipoDia').value),
        anotacao: document.getElementById('anotacao').value
    };

    if (!inputs.titulo || !inputs.data || !inputs.inicio || !inputs.fim) return alert("Preencha todos os campos!");

    const duracaoReal = Calculator.calcularDuracao(inputs.inicio, inputs.fim);
    let banco = Storage.get();

    if (editandoId) {
        banco = banco.map(i => i.id === editandoId ? { ...inputs, id: editandoId, duracaoReal } : i);
        editandoId = null;
        document.querySelector('.main-action').textContent = "Salvar Registro";
    } else {
        banco.push({ ...inputs, id: Date.now(), duracaoReal });
    }

    Storage.save(banco);
    limparForm();
    renderizarTudo();
    showPage('dashboard');
}

function renderizarTudo() {
    const data = Storage.get();
    const sal = Number(document.getElementById('valorSalario').value) || 0;
    const hrs = Number(document.getElementById('horasSemana').value) || 44;
    const vHora = Calculator.calcularValorHora(sal, hrs);
    
    let hReais = 0, h50 = 0, h100 = 0, lucro = 0;

    const timeline = document.getElementById('timelineDashboard');
    timeline.innerHTML = [...data].reverse().map(item => {
        const itemLucro = (item.duracaoReal * item.multiplicador) * vHora;
        hReais += item.duracaoReal;
        if(item.multiplicador === 1.5) h50 += item.duracaoReal;
        else h100 += item.duracaoReal;
        lucro += itemLucro;

        const date = new Date(item.data + 'T00:00:00');
        return `
            <div class="timeline-item">
                <div class="date-badge">
                    <span class="day">${date.getDate()}</span>
                    <span class="month">${date.toLocaleString('pt-BR', { month: 'short' })}</span>
                </div>
                <div class="item-info">
                    <h3>${item.titulo}</h3>
                    <p>🕒 ${item.inicio} - ${item.fim} (${item.duracaoReal.toFixed(2)}h reais)</p>
                </div>
                <div class="lucro-tag" style="color:var(--red); font-weight:bold; margin-right:15px">
                    R$ ${itemLucro.toFixed(2)}
                </div>
                <div class="actions">
                    <button class="btn-view" onclick="abrirModal(${item.id})">Ver</button>
                    <button class="btn-view" style="background:#333" onclick="editar(${item.id})">Editar</button>
                    <button class="btn-del" onclick="deletar(${item.id})">Excluir</button>
                </div>
            </div>`;
    }).join('');

    renderDash(hReais, h50, h100, lucro);
}

function editar(id) {
    const r = Storage.get().find(i => i.id === id);
    if(r) {
        document.getElementById('titulo').value = r.titulo;
        document.getElementById('dataAtividade').value = r.data;
        document.getElementById('horaInicio').value = r.inicio;
        document.getElementById('horaFim').value = r.fim;
        document.getElementById('tipoDia').value = r.multiplicador;
        document.getElementById('anotacao').value = r.anotacao || "";
        editandoId = id;
        document.querySelector('.main-action').textContent = "Atualizar Registro";
        showPage('extras');
    }
}

function renderDash(total, p50, p100, lucro) {
    document.getElementById('resumoExtras').innerHTML = `
        <div class="card-dash"><p>Horas Reais</p><h2>${total.toFixed(2)}h</h2></div>
        <div class="card-dash" style="border-left-color: #ffa502"><p>Extras 50%</p><h2>${p50.toFixed(2)}h</h2></div>
        <div class="card-dash" style="border-left-color: var(--red)"><p>Extras 100%</p><h2>${p100.toFixed(2)}h</h2></div>
        <div class="card-dash" style="border-left-color: #2ed573"><p>Ganho Extra</p><h2>R$ ${lucro.toFixed(2)}</h2></div>
    `;
}

function abrirModal(id) {
    const item = Storage.get().find(i => i.id === id);
    if(item) {
        document.getElementById('modalBody').innerHTML = `
            <p><strong>Projeto:</strong> ${item.titulo}</p>
            <p><strong>Horário:</strong> ${item.inicio} às ${item.fim}</p>
            <p><strong>Tempo Real:</strong> ${item.duracaoReal.toFixed(2)}h</p>
            <hr style="margin:10px 0; border-color:#333">
            <p><strong>Anotações:</strong> ${item.anotacao || 'Nenhuma.'}</p>
        `;
        document.getElementById('modalDetalhes').style.display = 'block';
    }
}

function exportarPDF() {
    const dash = document.getElementById('dashboard');
    const originalDisplay = dash.style.display;
    dash.style.display = 'block'; // Força visibilidade para o PDF não sair branco

    const opt = { 
        margin: 10, 
        filename: 'relatorio-clayver.pdf', 
        html2canvas: { scale: 2, backgroundColor: '#0a0a0a' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(dash).save().then(() => {
        dash.style.display = originalDisplay;
    });
}

function fecharModal() { document.getElementById('modalDetalhes').style.display = 'none'; }
function calcularSalario() { 
    const vH = Calculator.calcularValorHora(document.getElementById('valorSalario').value, document.getElementById('horasSemana').value);
    document.getElementById('resultadoSalario').innerHTML = `<h3 style="color:var(--purple)">Valor por Hora: R$ ${vH.toFixed(2)}</h3>`;
    renderizarTudo(); 
}
function deletar(id) { if(confirm("Apagar?")) { Storage.save(Storage.get().filter(i => i.id !== id)); renderizarTudo(); } }
function limparForm() { ['titulo', 'dataAtividade', 'horaInicio', 'horaFim', 'anotacao'].forEach(id => document.getElementById(id).value = ""); }

window.onload = () => { calcularSalario(); renderizarTudo(); };
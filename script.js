/**
 * PORTAL DO PROFESSOR 2026 - ARQUITETURA DE CÓDIGO FONTE EXPANDIDA
 * SISTEMA OPERACIONAL MÓVEL PARA LANÇAMENTO DE AVALIAÇÕES E NOTAS
 */

const CONFIG = {
    schoolName: "EM DR CUSTÓDIO DE PAULA RODRIGUES",
    schoolNameFull: "ESCOLA MUNICIPAL DR. CUSTÓDIO DE PAULA RODRIGUES",
    turmaName: "8º ANO 800",
    ano: 2026,
    limitPoints: 25.00,
    passingScorePct: 0.60 // Média institucional de 60% para definição das cores
};

const ALUNOS_INICIAIS = [
    "ADRIELE APARECIDA MENDES ARAUJO", "ANA JULIA SILVA DE LAIA", "DAVI LUCAS PAULINO DA COSTA",
    "EMANUELLY CRISTINA DA COSTA LEVINO", "FABIELLY HIGINO DIAS", "GABRIEL COTTA QUEIROZ",
    "GLENO HENRIQUE MARTINS GOMES DE MIRANDA", "HANIELE PEREIRA ALVES", "IKARO EMANUEL DE LIMA MIRANDA",
    "JONATAS PASSOS BRAGA", "JÚLIA DA SILVA LOBATO", "LAYANE APARECIDA MENDES FERNANDES",
    "LUAN FERNANDO SILVA FIALHO", "LUIS OTAVIO DA COSTA VITOR", "MARIA EDUARDA CHAVES LIMA",
    "MARIA EDUARDA PEREIRA DE LIMA", "MARIA LUISA MENDES OLIVEIRA", "MARIA OLIVIA SILVA CHAVES",
    "MARIA SOPHIA FERNANDES DE SOUZA", "NATHAN MIRANDA ALVES", "NICOLE DE OLIVEIRA LIMA",
    "WESLEY COTA BERNARDES", "YASMIN DOS SANTOS FERREIRA"
];

// Cadastro oficial da turma: a ordem do array é a ordem de chamada/matrícula.
let ALUNOS = [];
const DATAS_MATRICULA_INICIAIS = {
    "ADRIELE APARECIDA MENDES ARAUJO": "09/02/2022",
    "LUIS OTAVIO DA COSTA VITOR": "07/02/2023",
    "HANIELE PEREIRA ALVES": "07/02/2023",
    "JONATAS PASSOS BRAGA": "07/02/2023",
    "JÚLIA DA SILVA LOBATO": "04/02/2026"
};

// Ordem Reorganizada das Disciplinas
const DISCIPLINAS = [
    "Língua Portuguesa", "Educação Física", "Arte", "Língua Inglesa", 
    "Matemática", "Ciências", "História", "Geografia", "Ensino Religioso"
];

const ICONS_DISC = { 
    "Arte": "fa-palette", "Ensino Religioso": "fa-hands-asl-interpreting", 
    "Língua Portuguesa": "fa-language", "Matemática": "fa-calculator", 
    "História": "fa-landmark", "Ciências": "fa-flask", 
    "Língua Inglesa": "fa-atlas", "Geografia": "fa-globe-americas", 
    "Educação Física": "fa-running" 
};

const DB_KEY = "sigenotas_v4_mobile2026";
let db = {};

// Variáveis voláteis de navegação interna
let selectedMateria = "";
let selectedBimestre = "1";
let selectedAtividadeId = "";
let myChartInstance = null;

// Regras de fechamento anual solicitadas: os valores são limites de faltas; uma falta acima já gera recuperação final.
const DIAS_LETIVOS_ANO = 200;
const LIMITES_FALTAS_DISCIPLINA = {
    "Matemática": 49,
    "Língua Portuguesa": 59,
    "História": 19,
    "Geografia": 29,
    "Ensino Religioso": 9,
    "Arte": 9,
    "Educação Física": 19,
    "Língua Inglesa": 19,
    "Ciências": 29
};

// Rascunhos ficam somente na memória até o clique em "Salvar Lançamento".
let draftNotasLancamento = {};
let draftRecBimestral = {};
let draftRecAnual = {};

// Inicialização Primária do Sistema
document.addEventListener("DOMContentLoaded", () => {
    initDatabaseEngine();
    renderMateriaBlocks();
    renderLancamentoSeletorHome();
    updateGlobalBimestreUI();
    applyThemeLoad();
});

function gerarNumeroMatricula(ano, ordem) {
    return `${ano}${CONFIG.turmaName.match(/\d{3}/)?.[0] || '800'}${String(ordem).padStart(2, '0')}`;
}

function obterDataMatriculaInicial(aluno) {
    return DATAS_MATRICULA_INICIAIS[aluno] || "05/02/2024";
}

function inicializarCadastroAlunos() {
    if (!Array.isArray(db.alunosCadastro)) {
        db.alunosCadastro = ALUNOS_INICIAIS.map((nome, index) => {
            const data = obterDataMatriculaInicial(nome);
            const ano = Number(data.split('/')[2]);
            return { nome, dataMatricula: data, dataNascimento: "", matricula: gerarNumeroMatricula(ano, index + 1) };
        });
    } else {
        // Migração segura: garante cadastro completo dos alunos antigos sem alterar notas.
        const nomesExistentes = new Set(db.alunosCadastro.map(a => a.nome));
        ALUNOS_INICIAIS.forEach(nome => {
            if (!nomesExistentes.has(nome)) {
                const ordem = db.alunosCadastro.length + 1;
                const data = obterDataMatriculaInicial(nome);
                const ano = Number(data.split('/')[2]);
                db.alunosCadastro.push({ nome, dataMatricula: data, dataNascimento: "", matricula: gerarNumeroMatricula(ano, ordem) });
            }
        });
        db.alunosCadastro.forEach((a, index) => {
            if (!a.dataMatricula) a.dataMatricula = obterDataMatriculaInicial(a.nome);
            if (a.dataNascimento === undefined) a.dataNascimento = "";
            const ano = Number(String(a.dataMatricula).split('/')[2]) || CONFIG.ano;
            a.matricula = gerarNumeroMatricula(ano, index + 1);
        });
    }
    ALUNOS = db.alunosCadastro.map(a => a.nome);
    saveStorage();
}

function getCadastroAluno(nome) {
    return (db.alunosCadastro || []).find(a => a.nome === nome) || { nome, dataMatricula: "", dataNascimento: "", matricula: "" };
}

function formatarDataMatricula(data) {
    if (!data) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) return data;
    const d = new Date(data + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return data;
    return d.toLocaleDateString('pt-BR');
}

function formatarDataNascimento(data) {
    return formatarDataMatricula(data);
}

function dataBRParaISO(data) {
    if (!data) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
    const m = String(data).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

function renderCadastroAlunos() {
    const corpo = document.getElementById('table-cadastro-alunos-corpo');
    if (!corpo) return;
    corpo.innerHTML = ALUNOS.map((aluno, index) => {
        const c = getCadastroAluno(aluno);
        return `<tr>
            <td>${String(index + 1).padStart(2, '0')}</td>
            <td><strong>${escapeHtml(c.matricula)}</strong></td>
            <td><strong>${escapeHtml(aluno)}</strong></td>
            <td>${formatarDataMatricula(c.dataMatricula)}</td>
            <td>${formatarDataNascimento(c.dataNascimento)}</td>
            <td class="student-actions-cell">
                <button class="btn-table-edit" onclick="editarAluno('${escapeAttr(aluno)}')"><i class="fas fa-pen"></i> Alterar</button>
                <button class="btn-table-delete" onclick="excluirAluno('${escapeAttr(aluno)}')"><i class="fas fa-trash"></i> Excluir</button>
            </td>
        </tr>`;
    }).join('');
}

function abrirCadastroAlunos() {
    navigate('cadastro-alunos');
    renderCadastroAlunos();
}

function cadastrarNovoAluno(event) {
    event.preventDefault();
    const nomeInput = document.getElementById('novo-aluno-nome');
    const dataInput = document.getElementById('novo-aluno-data');
    const nascimentoInput = document.getElementById('novo-aluno-nascimento');
    const nome = (nomeInput.value || '').trim().replace(/\s+/g, ' ').toUpperCase();
    if (!nome) return alert('Informe o nome completo do aluno.');
    if (ALUNOS.some(a => a.toUpperCase() === nome)) return alert('Este aluno já está cadastrado.');

    const data = dataInput.value ? formatarDataMatricula(dataInput.value) : new Date().toLocaleDateString('pt-BR');
    const nascimento = nascimentoInput?.value ? formatarDataMatricula(nascimentoInput.value) : '';
    const ordem = (db.alunosCadastro || []).length + 1;
    const ano = Number(data.split('/')[2]) || CONFIG.ano;
    const cadastro = { nome, dataMatricula: data, dataNascimento: nascimento, matricula: gerarNumeroMatricula(ano, ordem) };
    db.alunosCadastro.push(cadastro);
    ALUNOS.push(nome);

    if (typeof renderLancamentoSeletorHome === 'function') renderLancamentoSeletorHome('');
    DISCIPLINAS.forEach(m => {
        for (let b = 1; b <= 4; b++) {
            (db.disciplinas[m][b].atividades || []).forEach(atv => {
                if (!atv.notas) atv.notas = {};
                if (!atv.notas[nome]) atv.notas[nome] = { notaOrig: '', notaRec: '', notaFinal: 0.0 };
            });
            if (!db.disciplinas[m][b].recuperacaoBimestral) db.disciplinas[m][b].recuperacaoBimestral = {};
        }
    });
    saveStorage();
    renderCadastroAlunos();
    renderMateriaBlocks();
    if (typeof renderBoletimIndividualList === 'function') renderBoletimIndividualList();
    event.target.reset();
    alert(`Aluno cadastrado com sucesso.\nMatrícula: ${cadastro.matricula}\nOrdem de chamada: ${String(ordem).padStart(2, '0')}`);
}

function editarAluno(nomeAtual) {
    const c = getCadastroAluno(nomeAtual);
    const modal = document.getElementById('edit-aluno-modal');
    if (!modal) return;
    document.getElementById('edit-aluno-original').value = nomeAtual;
    document.getElementById('edit-aluno-nome').value = c.nome || '';
    document.getElementById('edit-aluno-data').value = dataBRParaISO(c.dataMatricula);
    document.getElementById('edit-aluno-nascimento').value = dataBRParaISO(c.dataNascimento);
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('edit-aluno-nome')?.focus(), 50);
}

function fecharModalEditarAluno() {
    const modal = document.getElementById('edit-aluno-modal');
    if (modal) modal.style.display = 'none';
}

function salvarEdicaoAluno(event) {
    event.preventDefault();
    const nomeAtual = document.getElementById('edit-aluno-original').value;
    const c = getCadastroAluno(nomeAtual);
    const nome = (document.getElementById('edit-aluno-nome').value || '').trim().replace(/\s+/g, ' ').toUpperCase();
    const dataMatriculaISO = document.getElementById('edit-aluno-data').value;
    const dataNascimentoISO = document.getElementById('edit-aluno-nascimento').value;

    if (!nome) return alert('Informe o nome completo do aluno.');
    if (nome !== nomeAtual && ALUNOS.some(a => a.toUpperCase() === nome)) {
        return alert('Já existe outro aluno com esse nome.');
    }

    const dataMatricula = dataMatriculaISO ? formatarDataMatricula(dataMatriculaISO) : c.dataMatricula;
    const dataNascimento = dataNascimentoISO ? formatarDataMatricula(dataNascimentoISO) : '';

    c.nome = nome;
    c.dataMatricula = dataMatricula;
    c.dataNascimento = dataNascimento;

    if (nome !== nomeAtual) {
        DISCIPLINAS.forEach(m => {
            for (let b = 1; b <= 4; b++) {
                const bData = db.disciplinas[m][b];
                (bData.atividades || []).forEach(atv => {
                    if (atv.notas && Object.prototype.hasOwnProperty.call(atv.notas, nomeAtual)) {
                        atv.notas[nome] = atv.notas[nomeAtual];
                        delete atv.notas[nomeAtual];
                    }
                });
                if (bData.recuperacaoBimestral && Object.prototype.hasOwnProperty.call(bData.recuperacaoBimestral, nomeAtual)) {
                    bData.recuperacaoBimestral[nome] = bData.recuperacaoBimestral[nomeAtual];
                    delete bData.recuperacaoBimestral[nomeAtual];
                }
                if (bData.faltas && Object.prototype.hasOwnProperty.call(bData.faltas, nomeAtual)) {
                    bData.faltas[nome] = bData.faltas[nomeAtual];
                    delete bData.faltas[nomeAtual];
                }
                for (const dia of DIAS_SEMANA.map(x=>x[0])) {
                    if (db.faltasDiarias?.[b]?.[dia] && Object.prototype.hasOwnProperty.call(db.faltasDiarias[b][dia], nomeAtual)) {
                        db.faltasDiarias[b][dia][nome] = db.faltasDiarias[b][dia][nomeAtual];
                        delete db.faltasDiarias[b][dia][nomeAtual];
                    }
                }
            }
        });
        const idx = ALUNOS.indexOf(nomeAtual);
        if (idx >= 0) ALUNOS[idx] = nome;
    }

    const idx = db.alunosCadastro.findIndex(a => a.nome === nome);
    if (idx >= 0) {
        const ordem = idx + 1;
        const ano = Number(c.dataMatricula.split('/')[2]) || CONFIG.ano;
        c.matricula = gerarNumeroMatricula(ano, ordem);
    }

    saveStorage();
    fecharModalEditarAluno();
    renderCadastroAlunos();
    renderMateriaBlocks();
    if (typeof renderBoletimIndividualList === 'function') renderBoletimIndividualList();
    if (selectedAtividadeId) {
        const atv = db.disciplinas[selectedMateria]?.[selectedBimestre]?.atividades?.find(a => a.id === selectedAtividadeId);
        if (atv) renderNotasTable(atv);
    }
}


function excluirAluno(nome) {
    const aluno = getCadastroAluno(nome);
    const confirma = confirm(`Excluir o aluno "${nome}" do sistema?\n\nAs notas e faltas desse aluno também serão removidas da base local.`);
    if (!confirma) return;

    db.alunosCadastro = (db.alunosCadastro || []).filter(a => a.nome !== nome);
    ALUNOS = ALUNOS.filter(a => a !== nome);

    DISCIPLINAS.forEach(m => {
        for (let b = 1; b <= 4; b++) {
            const bData = db.disciplinas[m][b];
            (bData.atividades || []).forEach(atv => {
                if (atv.notas) delete atv.notas[nome];
            });
            if (bData.recuperacaoBimestral) delete bData.recuperacaoBimestral[nome];
            if (bData.faltas) delete bData.faltas[nome];
            for (const dia of DIAS_SEMANA.map(x=>x[0])) {
                if (db.faltasDiarias?.[b]?.[dia]) delete db.faltasDiarias[b][dia][nome];
            }
        }
        if (db.disciplinas[m].recuperacaoAnual) delete db.disciplinas[m].recuperacaoAnual[nome];
    });

    saveStorage();
    renderCadastroAlunos();
    renderMateriaBlocks();
    if (typeof renderBoletimIndividualList === 'function') renderBoletimIndividualList();
    alert('Aluno excluído com sucesso.');
}


const DIAS_SEMANA=[['segunda','SEGUNDA-FEIRA'],['terca','TERÇA-FEIRA'],['quarta','QUARTA-FEIRA'],['quinta','QUINTA-FEIRA'],['sexta','SEXTA-FEIRA']];
const GRADE_PADRAO={
 segunda:['Língua Portuguesa','Ensino Religioso','Geografia','Língua Portuguesa','História'],
 terca:['Educação Física','Língua Portuguesa','Ciências','Matemática','Língua Portuguesa'],
 quarta:['Geografia','Língua Portuguesa','Matemática','Língua Inglesa','Ciências'],
 quinta:['Matemática','Geografia','Língua Inglesa','Ciências','Matemática'],
 sexta:['História','Educação Física','Arte','Matemática','Língua Portuguesa']
};
function garantirEstruturaFaltas(){
 if(!db.gradeAulas||typeof db.gradeAulas!=='object')db.gradeAulas={};
 // A grade da turma é fixa e já definida pelo professor.
 // Ela é gravada para os quatro bimestres exatamente como informada.
 [1,2,3,4].forEach(b=>{
  if(!db.gradeAulas[b])db.gradeAulas[b]={};
  DIAS_SEMANA.forEach(([dia])=>{db.gradeAulas[b][dia]=GRADE_PADRAO[dia].slice();});
 });
 if(!db.faltasDiarias||typeof db.faltasDiarias!=='object')db.faltasDiarias={};
 if(!db.faltasPorDisciplina||typeof db.faltasPorDisciplina!=='object')db.faltasPorDisciplina={};
 [1,2,3,4].forEach(b=>{
  if(!db.gradeAulas[b])db.gradeAulas[b]={};
  if(!db.faltasDiarias[b])db.faltasDiarias[b]={};
  if(!db.faltasPorDisciplina[b])db.faltasPorDisciplina[b]={};
  DIAS_SEMANA.forEach(([dia])=>{
   db.gradeAulas[b][dia]=GRADE_PADRAO[dia].slice();
   if(!db.faltasDiarias[b][dia])db.faltasDiarias[b][dia]={};
  });
  DISCIPLINAS.forEach(d=>{
   if(!db.faltasPorDisciplina[b][d])db.faltasPorDisciplina[b][d]={};
   DIAS_SEMANA.forEach(([dia])=>{if(!db.faltasPorDisciplina[b][d][dia])db.faltasPorDisciplina[b][d][dia]={};});
  });
 });
}
function listaDisciplinasOptions(selected=''){return DISCIPLINAS.map(d=>`<option value="${escapeAttr(d)}" ${d===selected?'selected':''}>${escapeHtml(d.toUpperCase())}</option>`).join('');}
function limparSelectLancamento(id){const el=document.getElementById(id);if(el)el.value='';}
function normalizarNumeroDigitado(raw, casas=2){
    let v=String(raw ?? '').replace(/[^0-9.,]/g,'').replace(/,/g,'.');
    const p=v.indexOf('.');
    if(p>=0){
        v=v.slice(0,p+1)+v.slice(p+1).replace(/\./g,'').slice(0,casas);
    }
    return v;
}
function limitarValorInputPontos(input, maximo){
    const limite=Number(maximo);
    if(!Number.isFinite(limite)) return;
    const raw=String(input.value??'').replace(',','.').trim();
    if(raw==='') return;
    const n=Number(raw);
    if(Number.isFinite(n) && n>limite){ input.value=String(limite.toFixed(2)).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1'); }
}
function normalizarNotaPlanilha(input, maximo){
    let raw=normalizarNumeroDigitado(input.value,1);
    if(raw==='') return '';
    let n=Number(raw);
    if(!Number.isFinite(n)) n=0;
    n=Math.max(0,Math.min(Number(maximo)||0,n));
    n=Math.round(n*10)/10;
    input.value=String(n.toFixed(1));
    return input.value;
}
function totalBimestreComDadosSalvos(disciplina,bimestre,aluno){
    const bData=db.disciplinas[disciplina]?.[Number(bimestre)]||{};
    return Number((bData.atividades||[]).reduce((sum,a)=>sum+(parseFloat(a.notas?.[aluno]?.notaFinal)||0),0).toFixed(2));
}

function calcularResultadoRecuperacao(original,recuperacao,maximo){
    const orig=Number(original)||0;
    if(recuperacao===null || recuperacao===undefined || recuperacao==='') return orig;
    const rec=Math.max(0,Math.min(Number(maximo)||0,Number(recuperacao)||0));
    const corte=(Number(maximo)||0)*CONFIG.passingScorePct;
    return Number((rec>=corte ? corte : Math.max(orig,rec)).toFixed(2));
}
function classeNotaPercentual(valor,maximo){
    const corte=(Number(maximo)||0)*CONFIG.passingScorePct;
    return (Number(valor)||0)<corte ? 'nota-baixa' : 'nota-alta';
}
function draftNotaKey(disciplina,bimestre,atividade,aluno){
    return `${disciplina}\u001f${bimestre}\u001f${atividade}\u001f${aluno}`;
}
function getDraftNota(disciplina,bimestre,atividade,aluno,notaOrig='',notaRec=''){
    const k=draftNotaKey(disciplina,bimestre,atividade,aluno);
    if(!draftNotasLancamento[k]) draftNotasLancamento[k]={notaOrig,notaRec};
    return draftNotasLancamento[k];
}
function getDraftRecBim(disciplina,bimestre,aluno,valor=''){
    const k=`${disciplina}\u001f${bimestre}\u001f${aluno}`;
    if(!Object.prototype.hasOwnProperty.call(draftRecBimestral,k)) draftRecBimestral[k]=valor;
    return draftRecBimestral[k];
}
function getDraftRecAnual(disciplina,aluno,valor=''){
    const k=`${disciplina}\u001f${aluno}`;
    if(!Object.prototype.hasOwnProperty.call(draftRecAnual,k)) draftRecAnual[k]=valor;
    return draftRecAnual[k];
}
function limparRascunhosLancamento(){ draftNotasLancamento={}; draftRecBimestral={}; draftRecAnual={}; }
function salvarERetornarInicio(mensagem){
    saveStorage();
    limparRascunhosLancamento();
    navigate('home');
    if(mensagem) alert(mensagem);
}

function renderLancamentoSeletorHome(tipoInicial=''){
    const box=document.getElementById('lancamento-seletor-home');
    if(!box)return;
    const incluirRec=typeof todosOsBimestresFechados==='function' && todosOsBimestresFechados();
    box.innerHTML=`<div class="lancamento-filtros lancamento-filtros-unificados lancamento-home-filtros">
        <div class="lancamento-field tipo-field"><label for="home-tipo-lancamento">TIPO DE LANÇAMENTO</label><select id="home-tipo-lancamento" onchange="atualizarTipoLancamentoInline()"><option value="" ${tipoInicial?'':'selected'} disabled>SELECIONE</option><option value="faltas" ${tipoInicial==='faltas'?'selected':''}>LANÇAMENTO DE FALTAS</option><option value="notas" ${tipoInicial==='notas'?'selected':''}>LANÇAMENTO DE NOTAS</option>${incluirRec?`<option value="rec-anual" ${tipoInicial==='rec-anual'?'selected':''}>LANÇAR RECUPERAÇÃO ANUAL</option>`:''}</select></div>
        <div id="home-filtros-dinamicos" class="lancamento-filtros-dinamicos"></div>
        <div id="home-buscar-wrap" class="lancamento-buscar-wrap"></div>
    </div>`;
    atualizarTipoLancamentoInline();
}
function atualizarTipoLancamentoInline(){
    const tipo=document.getElementById('home-tipo-lancamento')?.value||'';
    const filtros=document.getElementById('home-filtros-dinamicos'),buscar=document.getElementById('home-buscar-wrap'),resultado=document.getElementById('lancamento-inline-resultado');
    if(!filtros||!buscar)return;
    filtros.innerHTML=`<div class="lancamento-field"><label for="inline-lancamento-bimestre">BIMESTRE</label><select id="inline-lancamento-bimestre"><option value="" selected disabled>SELECIONE</option><option value="1">1º BIMESTRE</option><option value="2">2º BIMESTRE</option><option value="3">3º BIMESTRE</option><option value="4">4º BIMESTRE</option></select></div>`;
    buscar.innerHTML='';
    if(resultado)resultado.innerHTML='';
    if(!tipo)return;
    if(tipo==='notas'){
        filtros.innerHTML+=`<div class="lancamento-field"><label for="inline-notas-disciplina">DISCIPLINA</label><select id="inline-notas-disciplina"><option value="" selected disabled>SELECIONE</option>${listaDisciplinasOptions()}</select></div>`;
        buscar.innerHTML='<button class="btn-submit-action btn-buscar-lancamento" type="button" onclick="buscarLancamentoNotasInline()"><i class="fas fa-search"></i> BUSCAR</button>';
    }else if(tipo==='rec-anual'){
        if(typeof todosOsBimestresFechados!=='function' || !todosOsBimestresFechados()){
            filtros.innerHTML='<div class="lancamento-placeholder">A RECUPERAÇÃO ANUAL SERÁ LIBERADA APÓS O FECHAMENTO DOS 4 BIMESTRES.</div>';
            return;
        }
        filtros.innerHTML=`<div class="lancamento-field"><label for="home-rec-anual-disciplina">DISCIPLINA</label><select id="home-rec-anual-disciplina"><option value="" selected disabled>SELECIONE</option>${listaDisciplinasOptions()}</select></div>`;
        buscar.innerHTML='<button class="btn-submit-action btn-buscar-lancamento" type="button" onclick="buscarRecuperacaoAnualHome()"><i class="fas fa-search"></i> BUSCAR</button>';
    }else{
        buscar.innerHTML='<button class="btn-submit-action btn-buscar-lancamento" type="button" onclick="buscarLancamentoFaltasInline()"><i class="fas fa-search"></i> BUSCAR</button>';
    }
}

function mostrarLancamentoInline(tipo=''){
    const area=document.getElementById('lancamento-inline-area');
    const header=document.getElementById('minhas-disciplinas-header');
    const grid=document.getElementById('disciplinas-grid');
    if(!area)return;
    if(header)header.style.display='none';
    if(grid)grid.style.display='none';
    area.style.display='block';
    area.innerHTML=`<div class="inline-launch-shell">
        <div class="inline-launch-top"><div><span class="lancamento-kicker">CENTRAL DE LANÇAMENTOS</span><h3>LANÇAMENTO</h3><p>Selecione o tipo e os filtros. O resultado aparecerá logo abaixo, sem trocar de página.</p></div><button type="button" class="btn-back-inline" onclick="fecharLancamentoInline()"><i class="fas fa-xmark"></i> FECHAR</button></div>
        <div id="lancamento-seletor-inline" class="lancamento-seletor-inline"></div>
        <div id="lancamento-inline-resultado" class="lancamento-result-area"></div>
    </div>`;
    const box=document.getElementById('lancamento-seletor-inline');
    box.innerHTML=`<div class="lancamento-filtros lancamento-filtros-unificados lancamento-home-filtros"><div class="lancamento-field tipo-field"><label for="inline-tipo-lancamento">TIPO DE LANÇAMENTO</label><select id="inline-tipo-lancamento" onchange="atualizarTipoLancamentoInlineTela()"><option value="" ${tipo?'':'selected'} disabled>SELECIONE</option><option value="faltas" ${tipo==='faltas'?'selected':''}>LANÇAMENTO DE FALTAS</option><option value="notas" ${tipo==='notas'?'selected':''}>LANÇAMENTO DE NOTAS</option></select></div><div id="inline-tipo-filtros" class="lancamento-filtros-dinamicos"></div><div id="inline-tipo-buscar" class="lancamento-buscar-wrap"></div></div>`;
    atualizarTipoLancamentoInlineTela();
    window.scrollTo({top:Math.max(0,area.getBoundingClientRect().top+window.scrollY-18),behavior:'smooth'});
}
function atualizarTipoLancamentoInlineTela(){
    const tipo=document.getElementById('inline-tipo-lancamento')?.value||'',filtros=document.getElementById('inline-tipo-filtros'),buscar=document.getElementById('inline-tipo-buscar'),resultado=document.getElementById('lancamento-inline-resultado');
    if(!filtros||!buscar)return;
    filtros.innerHTML='';buscar.innerHTML='';if(resultado)resultado.innerHTML='';
    if(!tipo){filtros.innerHTML='<div class="lancamento-placeholder">SELECIONE O TIPO DE LANÇAMENTO.</div>';return;}
    if(tipo==='faltas'){
        filtros.innerHTML=`<div class="lancamento-field"><label for="inline-faltas-bimestre">BIMESTRE</label><select id="inline-faltas-bimestre"><option value="" selected disabled>SELECIONE</option><option value="1">1º BIMESTRE</option><option value="2">2º BIMESTRE</option><option value="3">3º BIMESTRE</option><option value="4">4º BIMESTRE</option></select></div>`;
        buscar.innerHTML='<button class="btn-submit-action btn-buscar-lancamento" type="button" onclick="buscarLancamentoFaltasInline()"><i class="fas fa-search"></i> BUSCAR</button>';
    }else{
        filtros.innerHTML=`<div class="lancamento-field"><label for="inline-notas-bimestre">BIMESTRE</label><select id="inline-notas-bimestre"><option value="" selected disabled>SELECIONE</option><option value="1">1º BIMESTRE</option><option value="2">2º BIMESTRE</option><option value="3">3º BIMESTRE</option><option value="4">4º BIMESTRE</option></select></div><div class="lancamento-field"><label for="inline-notas-disciplina">DISCIPLINA</label><select id="inline-notas-disciplina"><option value="" selected disabled>SELECIONE</option>${listaDisciplinasOptions()}</select></div>`;
        buscar.innerHTML='<button class="btn-submit-action btn-buscar-lancamento" type="button" onclick="buscarLancamentoNotasInline()"><i class="fas fa-search"></i> BUSCAR</button>';
    }
}
function fecharLancamentoInline(){
    const area=document.getElementById('lancamento-inline-area'),header=document.getElementById('minhas-disciplinas-header'),grid=document.getElementById('disciplinas-grid');
    if(area){area.style.display='none';area.innerHTML='';}if(header)header.style.display='';if(grid)grid.style.display='';window.scrollTo({top:0,behavior:'smooth'});
}
function abrirLancamentos(){
    navigate('home');
    setTimeout(()=>{
        renderLancamentoSeletorHome('');
        const box=document.getElementById('lancamento-seletor-home');
        box?.scrollIntoView({behavior:'smooth',block:'start'});
    },30);
}
function abrirLancamentoFaltas(){
    garantirEstruturaFaltas();
    navigate('home');
    setTimeout(()=>{
        renderLancamentoSeletorHome('faltas');
        const b=document.getElementById('home-tipo-lancamento');
        if(b)b.value='faltas';
        atualizarTipoLancamentoInline();
        document.getElementById('lancamento-seletor-home')?.scrollIntoView({behavior:'smooth',block:'start'});
    },30);
}
function abrirLancamentoNotas(){
    garantirEstruturaFaltas();
    navigate('home');
    setTimeout(()=>{
        renderLancamentoSeletorHome('notas');
        const b=document.getElementById('home-tipo-lancamento');
        if(b)b.value='notas';
        atualizarTipoLancamentoInline();
        document.getElementById('lancamento-seletor-home')?.scrollIntoView({behavior:'smooth',block:'start'});
    },30);
}

function renderLancamentoFaltasInline(){
    const area=document.getElementById('lancamento-inline-area');
    if(!area)return;
    garantirEstruturaFaltas();
    area.innerHTML=`
      <div class="inline-launch-shell">
        <div class="inline-launch-top">
          <div>
            <span class="lancamento-kicker">LANÇAMENTO DE FREQUÊNCIA</span>
            <h3><i class="fas fa-calendar-check"></i> Lançamento de Faltas</h3>
            <p>Informe somente quantas vezes cada aluno faltou em cada dia. O sistema distribui automaticamente essas faltas pelas disciplinas conforme a grade fixa de 5 aulas.</p>
          </div>
          <button type="button" class="btn-back-inline" onclick="fecharLancamentoInline()"><i class="fas fa-xmark"></i> Fechar lançamento</button>
        </div>
        <div class="lancamento-filtros lancamento-filtros-unificados inline-filters">
          <div><label for="inline-faltas-bimestre">BIMESTRE</label><select id="inline-faltas-bimestre"><option value="" selected disabled>SELECIONE</option><option value="1">1º BIMESTRE</option><option value="2">2º BIMESTRE</option><option value="3">3º BIMESTRE</option><option value="4">4º BIMESTRE</option></select></div>
          <button class="btn-submit-action btn-buscar-lancamento" type="button" onclick="buscarLancamentoFaltasInline()"><i class="fas fa-search"></i> Buscar</button>
        </div>
        <div id="inline-faltas-planilha" class="lancamento-result-area"><div class="empty-state-panel">Selecione o bimestre e clique em <strong>Buscar</strong>.</div></div>
      </div>`;
}
function buscarLancamentoFaltasInline(){
    const b=Number(document.getElementById('inline-lancamento-bimestre')?.value||0),area=document.getElementById('lancamento-inline-resultado')||document.getElementById('lancamento-home-resultado');
    if(!area)return;
    if(!b){alert('Selecione o BIMESTRE antes de buscar.');return;}
    garantirEstruturaFaltas();
    const grade=DIAS_SEMANA.map(([dia,nome])=>({dia,nome,aulas:db.gradeAulas[b][dia]||GRADE_PADRAO[dia]}));
    area.innerHTML=`
      <div class="planilha-resumo frequencia-resumo"><div><strong>${b}º BIMESTRE</strong> · GRADE FIXA · GRADE FIXA</div><div class="frequencia-dia-resumo">${grade.map(x=>`<span>${x.nome}: ${x.aulas.length} AULAS</span>`).join('')}</div></div>
      <div class="frequencia-instruction"><i class="fas fa-circle-info"></i><div><strong>COMO LANÇAR:</strong> digite apenas o número de faltas do aluno naquele dia, de 0 em diante. Depois de salvar, o sistema multiplica essa quantidade pelo número de aulas de cada disciplina naquele dia. Ex.: 3 faltas em um dia com 2 aulas de PORTUGUÊS geram 6 faltas de PORTUGUÊS.</div></div>
      <div class="table-responsive-container"><table class="table-custom-format faltas-diarias-table"><thead><tr><th>ALUNO</th>${DIAS_SEMANA.map(([d,n])=>`<th>${n}</th>`).join('')}<th>TOTAL DE FALTAS LANÇADAS</th></tr></thead><tbody>
      ${ALUNOS.map(aluno=>{let total=0;const cells=DIAS_SEMANA.map(([dia])=>{const v=obterFaltaDia(b,dia,aluno);total+=v;return `<td><input class="falta-diaria-input" data-aluno="${escapeAttr(aluno)}" data-dia="${dia}" type="number" min="0" step="1" value="${v}" oninput="atualizarTotaisFaltasDiariasInline()" onkeydown="avancarCampoComEnter(event)"></td>`}).join('');return `<tr><td><strong>${escapeHtml(aluno)}</strong></td>${cells}<td class="faltas-dia-total" data-aluno="${escapeAttr(aluno)}">${total}</td></tr>`}).join('')}
      </tbody></table></div>
      <div class="save-launch-bar"><span>As faltas por disciplina são calculadas automaticamente pela grade.</span><button class="btn-submit-action" type="button" onclick="salvarFaltasDiariasInline()"><i class="fas fa-save"></i> SALVAR LANÇAMENTO</button></div>`;
}
function atualizarTotaisFaltasDiariasInline(){
    document.querySelectorAll('#lancamento-inline-resultado tbody tr').forEach(row=>{
        let total=0;row.querySelectorAll('.falta-diaria-input').forEach(i=>{total+=Math.max(0,Number(i.value)||0);});
        const out=row.querySelector('.faltas-dia-total');if(out)out.textContent=total;
    });
}
function salvarFaltasDiariasInline(){
    const b=Number(document.getElementById('inline-lancamento-bimestre')?.value||0);
    if(!b){alert('Selecione o BIMESTRE antes de salvar.');return;}
    garantirEstruturaFaltas();
    document.querySelectorAll('#lancamento-inline-resultado .falta-diaria-input').forEach(input=>{
        const aluno=input.dataset.aluno,dia=input.dataset.dia;
        const v=Math.max(0,Math.round(Number(String(input.value||'0').replace(',','.'))||0));
        if(!db.faltasDiarias[b])db.faltasDiarias[b]={};
        if(!db.faltasDiarias[b][dia])db.faltasDiarias[b][dia]={};
        db.faltasDiarias[b][dia][aluno]=v;
    });
    DIAS_SEMANA.forEach(([dia])=>{
        DISCIPLINAS.forEach(d=>{
            if(!db.faltasPorDisciplina[b][d])db.faltasPorDisciplina[b][d]={};
            if(!db.faltasPorDisciplina[b][d][dia])db.faltasPorDisciplina[b][d][dia]={};
            ALUNOS.forEach(aluno=>{
                const v=calcularFaltasDisciplinaDia(b,d,dia,aluno);
                db.faltasPorDisciplina[b][d][dia][aluno]=v;
            });
        });
    });
    salvarERetornarInicio('Lançamento de faltas salvo com sucesso.');
}
function renderLancamentoNotasInline(){
    const area=document.getElementById('lancamento-inline-area');
    if(!area)return;
    garantirEstruturaFaltas();
    area.innerHTML=`
      <div class="inline-launch-shell">
        <div class="inline-launch-top">
          <div><span class="lancamento-kicker">LANÇAMENTO ACADÊMICO</span><h3><i class="fas fa-pen-to-square"></i> Lançamento de Notas</h3><p>Selecione o bimestre e a disciplina. A planilha aparecerá abaixo, sem abrir outra tela.</p></div>
          <button type="button" class="btn-back-inline" onclick="fecharLancamentoInline()"><i class="fas fa-xmark"></i> Fechar lançamento</button>
        </div>
        <div class="lancamento-filtros lancamento-filtros-unificados inline-filters">
          <div><label for="inline-notas-bimestre">BIMESTRE</label><select id="inline-notas-bimestre"><option value="" selected disabled>SELECIONE</option><option value="1">1º BIMESTRE</option><option value="2">2º BIMESTRE</option><option value="3">3º BIMESTRE</option><option value="4">4º BIMESTRE</option></select></div>
          <div><label for="inline-notas-disciplina">DISCIPLINA</label><select id="inline-notas-disciplina"><option value="" selected disabled>SELECIONE</option>${listaDisciplinasOptions()}</select></div>
          <button class="btn-submit-action btn-buscar-lancamento" type="button" onclick="buscarLancamentoNotasInline()"><i class="fas fa-search"></i> Buscar</button>
        </div>
        <div id="inline-notas-planilha" class="lancamento-result-area"><div class="empty-state-panel">Selecione o bimestre e a disciplina e clique em <strong>Buscar</strong>.</div></div>
      </div>`;
}
function buscarLancamentoNotasInline(){
    const b=Number(document.getElementById('inline-lancamento-bimestre')?.value||0),disciplina=document.getElementById('inline-notas-disciplina')?.value||'',area=document.getElementById('lancamento-inline-resultado')||document.getElementById('lancamento-home-resultado');
    if(!area)return;
    if(!b||!disciplina){alert('Selecione o BIMESTRE e a DISCIPLINA antes de buscar.');return;}
    selectedBimestre=b;selectedMateria=disciplina;
    const bData=db.disciplinas[disciplina][b],atividades=bData.atividades||[],fechado=!!db.configGlobal.bimestresFechados[b];
    if(!atividades.length){area.innerHTML=`<div class="empty-state-panel">Nenhuma atividade avaliativa foi criada para este bimestre. <button type="button" class="btn-secondary-action" onclick="abrirCriacaoAtividadeCentral()">CRIAR ATIVIDADE</button></div>`;return;}
    limparRascunhosLancamento();
    area.innerHTML=`
      <div class="notas-central-head"><div><strong>${escapeHtml(disciplina.toUpperCase())}</strong><span>${b}º BIMESTRE · ${atividades.length} ATIVIDADE(S)</span></div><div class="notas-central-head-actions"><button class="btn-secondary-action" ${fechado?'disabled':''} onclick="abrirCriacaoAtividadeCentral()"><i class="fas fa-plus"></i> CRIAR ATIVIDADE</button><button class="btn-submit-action" ${fechado?'disabled':''} onclick="salvarLancamentoNotasInline()"><i class="fas fa-save"></i> SALVAR LANÇAMENTO</button></div></div>
      <div class="table-responsive-container"><table class="table-custom-format notas-inline-table"><thead><tr><th>ALUNO</th>${atividades.map((a,i)=>`<th><div class="atividade-inline-header"><span>ATIVIDADE ${i+1}</span><strong>${escapeHtml(a.nome.toUpperCase())}</strong><small>VALOR: ${Number(a.valor).toFixed(1)}</small><div class="atividade-header-actions"><button type="button" class="btn-grade-edit" onclick="editAtividade('${a.id}')" ${fechado?'disabled':''} title="Editar atividade"><i class="fas fa-pen"></i></button><button type="button" class="btn-grade-delete" onclick="deleteAtividade('${a.id}')" ${fechado?'disabled':''} title="Excluir atividade"><i class="fas fa-trash"></i></button></div></div></th>`).join('')}<th>NOTA FINAL DO BIMESTRE</th><th>RECUPERAÇÃO BIMESTRAL</th></tr></thead><tbody>
      ${ALUNOS.map((aluno,idx)=>{
          const rec=getDraftRecBim(disciplina,b,aluno,bData.recuperacaoBimestral?.[aluno] ?? '');
          return `<tr><td><strong>${idx+1}. ${escapeHtml(aluno)}</strong></td>${atividades.map(a=>{
              const nd=a.notas?.[aluno]||{notaOrig:'',notaRec:'',notaFinal:0},d=getDraftNota(disciplina,b,a.id,aluno,nd.notaOrig??'',nd.notaRec??'');
              const corte=Number(a.valor)*CONFIG.passingScorePct,recDisabled=(d.notaOrig!==''&&Number(d.notaOrig)>=corte)||fechado,final=calcularResultadoRecuperacao(Number(nd.notaOrig)||0,nd.notaRec,a.valor);
              return `<td class="atividade-stacked-cell"><div class="nota-field-stack"><label>NOTA</label><input class="nota-inline-input" type="text" inputmode="decimal" value="${escapeAttr(d.notaOrig??'')}" data-aluno="${escapeAttr(aluno)}" data-atv="${escapeAttr(a.id)}" data-campo="notaOrig" data-max="${a.valor}" ${fechado?'disabled':''} oninput="atualizarNotaInline(this)" onkeydown="avancarCampoComEnter(event)"></div><div class="nota-field-stack recuperacao-field"><label>RECUPERAÇÃO</label><input class="rec-inline-input" type="text" inputmode="decimal" value="${escapeAttr(d.notaRec??'')}" data-aluno="${escapeAttr(aluno)}" data-atv="${escapeAttr(a.id)}" data-campo="notaRec" data-max="${a.valor}" ${recDisabled?'disabled':''} oninput="atualizarNotaInline(this)" onkeydown="avancarCampoComEnter(event)"></div><div class="nota-field-stack nota-final-field"><label>NOTA FINAL</label><div id="inline-final-${safeId(a.id)}-${safeId(aluno)}" class="nota-final-value ${classeNotaPercentual(final,a.valor)}">${final.toFixed(1)}</div></div></td>`;
          }).join('')}<td class="nota-final-bimestre-cell"><strong id="inline-bim-${safeId(aluno)}" class="${classeNotaPercentual(totalBimestreComDadosSalvos(disciplina,b,aluno),CONFIG.limitPoints)}">${totalBimestreComDadosSalvos(disciplina,b,aluno).toFixed(2)}</strong></td><td class="rec-bim-cell"><input type="text" inputmode="decimal" maxlength="6" class="rec-bim-inline-input" value="${escapeAttr(rec)}" data-aluno="${escapeAttr(aluno)}" data-rec-bim="1" ${fechado?'disabled':''} placeholder="—" oninput="atualizarRecuperacaoBimestralDraft(this)" onkeydown="avancarCampoComEnter(event)"></td></tr>`;
      }).join('')}
      </tbody></table></div>`;
}
function atualizarNotaInline(input){
    const aluno=input.dataset.aluno,atvId=input.dataset.atv,atv=db.disciplinas[selectedMateria]?.[selectedBimestre]?.atividades?.find(a=>a.id===atvId);if(!atv)return;
    const campo=input.dataset.campo,max=Number(input.dataset.max),nd=atv.notas?.[aluno]||{notaOrig:'',notaRec:''},draft=getDraftNota(selectedMateria,selectedBimestre,atvId,aluno,nd.notaOrig??'',nd.notaRec??'');
    let exibicao=normalizarNotaPlanilha(input,max);
    draft[campo]=exibicao==='.'?'':exibicao;
    // O lançamento é apenas rascunho. Nenhuma soma/nota final visual é recalculada antes do SALVAR LANÇAMENTO.
}
function atualizarRecuperacaoBimestralDraft(input){
    const aluno=input.dataset.aluno;
    const totalSalvo=totalBimestreComDadosSalvos(selectedMateria,selectedBimestre,aluno);
    if(totalSalvo >= CONFIG.limitPoints*CONFIG.passingScorePct){
        input.value='';
        draftRecBimestral[`${selectedMateria}\u001f${selectedBimestre}\u001f${aluno}`]='';
        return;
    }
    let raw=normalizarNotaPlanilha(input,CONFIG.limitPoints);
    draftRecBimestral[`${selectedMateria}\u001f${selectedBimestre}\u001f${aluno}`]=raw;
}
function salvarLancamentoNotasInline(){
    if(!selectedMateria||!selectedBimestre){alert('Selecione o BIMESTRE e a DISCIPLINA antes de salvar.');return;}
    const bData=db.disciplinas[selectedMateria][selectedBimestre];
    if(!bData.recuperacaoBimestral)bData.recuperacaoBimestral={};
    document.querySelectorAll('#lancamento-inline-resultado .nota-inline-input, #lancamento-inline-resultado .rec-inline-input').forEach(input=>{
        const aluno=input.dataset.aluno,atv=bData.atividades.find(a=>a.id===input.dataset.atv);if(!atv)return;
        if(!atv.notas)atv.notas={};if(!atv.notas[aluno])atv.notas[aluno]={notaOrig:'',notaRec:'',notaFinal:0};
        const nd=atv.notas[aluno];
        if(String(input.value||'').trim()===''){ nd[input.dataset.campo]=''; } else { const n=Math.max(0,Math.min(Number(atv.valor),Number(String(input.value).replace(',','.'))||0)); nd[input.dataset.campo]=Math.round(n*10)/10; input.value=nd[input.dataset.campo].toFixed(1); }
    });
    (bData.atividades||[]).forEach(recalcularNotasDaAtividade);
    document.querySelectorAll('#lancamento-inline-resultado input[data-rec-bim="1"]').forEach(input=>{
        const aluno=input.dataset.aluno,raw=String(input.value||'').replace(',','.').trim(),totalSalvo=totalBimestreComDadosSalvos(selectedMateria,selectedBimestre,aluno);
        if(totalSalvo>=CONFIG.limitPoints*CONFIG.passingScorePct || raw==='') delete bData.recuperacaoBimestral[aluno];
        else bData.recuperacaoBimestral[aluno]=Math.round(Math.max(0,Math.min(CONFIG.limitPoints,Number(raw)||0))*10)/10;
    });
    salvarERetornarInicio('Lançamento de notas salvo com sucesso.');
}

function todosOsBimestresFechados(){
    return [1,2,3,4].every(b=>!!db.configGlobal?.bimestresFechados?.[b]);
}
function calcularTotalAnualComRecuperacoes(disciplina,aluno){
    let total=0;
    for(let b=1;b<=4;b++){
        const bData=db.disciplinas[disciplina]?.[b]||{};
        let soma=(bData.atividades||[]).reduce((sum,a)=>sum+(parseFloat(a.notas?.[aluno]?.notaFinal)||0),0);
        if(soma<15 && bData.recuperacaoBimestral?.[aluno]!==undefined && bData.recuperacaoBimestral[aluno]!==''){
            const rec=Number(String(bData.recuperacaoBimestral[aluno]).replace(',','.'))||0;
            soma=rec>=15?15:Math.max(soma,rec);
        }
        total+=soma;
    }
    return Number(total.toFixed(1));
}
function resultadoRecuperacaoAnual(total,rec){
    if(rec===''||rec===null||rec===undefined)return Number(total.toFixed(1));
    const r=Number(String(rec).replace(',','.'))||0;
    return r>=60?60:Number(Math.max(total,r).toFixed(1));
}
function buscarRecuperacaoAnualHome(){
    if(!todosOsBimestresFechados()){alert('A Recuperação Anual fica disponível somente após o fechamento dos 4 bimestres.');return;}
    const disciplina=document.getElementById('home-rec-anual-disciplina')?.value||'';
    if(!disciplina){alert('Selecione a DISCIPLINA antes de buscar.');return;}
    selectedMateria=disciplina;
    renderRecuperacaoAnualHome(disciplina);
}
function renderRecuperacaoAnualHome(disciplina){
    const area=document.getElementById('lancamento-inline-resultado');if(!area||!db.disciplinas[disciplina])return;
    const recObj=db.disciplinas[disciplina].recuperacaoAnual||{},linhas=[];
    ALUNOS.forEach(aluno=>{
        const total=calcularTotalAnualComRecuperacoes(disciplina,aluno),faltas=totalFaltasDisciplina(aluno,disciplina),limite=LIMITES_FALTAS_DISCIPLINA[disciplina]??Infinity,porFalta=faltas>limite;
        if(total<60||porFalta){
            const rec=recObj[aluno]===undefined?'':recObj[aluno],base=porFalta?0:total,final=resultadoRecuperacaoAnual(base,rec);
            linhas.push({aluno,total,rec,final,porFalta,base,faltas,limite});
        }
    });
    area.innerHTML=`<div class="inline-result-panel"><div class="notas-central-head"><div><strong>RECUPERAÇÃO ANUAL · ${escapeHtml(disciplina.toUpperCase())}</strong><span>VALOR MÁXIMO: 100,0 PONTOS</span></div></div><div class="table-responsive-container"><table class="table-custom-format"><thead><tr><th>ALUNO</th><th>SOMA ANUAL</th><th>FALTAS</th><th>RECUPERAÇÃO ANUAL</th><th>RESULTADO FINAL</th></tr></thead><tbody>${linhas.length?linhas.map(x=>`<tr><td><strong>${escapeHtml(x.aluno)}</strong></td><td class="${classeNotaPercentual(x.base,100)}">${x.porFalta?'0.0':x.total.toFixed(1)}</td><td>${x.faltas}</td><td><input class="nota-central-input" type="text" inputmode="decimal" maxlength="6" value="${x.rec===''?'':Number(x.rec).toFixed(1)}" data-rec-anual="1" data-aluno="${escapeAttr(x.aluno)}" data-total="${x.base}" data-max="100" oninput="atualizarRecuperacaoAnualHome(this)"></td><td id="rec-anual-home-${safeId(x.aluno)}" class="${classeNotaPercentual(x.final,100)}"><strong>${x.final.toFixed(1)}</strong></td></tr>`).join(''):`<tr><td colspan="5" style="text-align:center;padding:20px;">NENHUM ALUNO ELEGÍVEL PARA RECUPERAÇÃO ANUAL.</td></tr>`}</tbody></table></div><div class="save-launch-bar"><button class="btn-submit-action" type="button" onclick="salvarRecuperacaoAnualHome('${escapeAttr(disciplina)}')"><i class="fas fa-save"></i> SALVAR LANÇAMENTO</button></div></div>`;
}
function atualizarRecuperacaoAnualHome(input){
    const total=Number(input.dataset.total)||0;
    const raw=String(input.value||'').replace(',','.').trim();
    const rec=raw===''?'':Math.max(0,Math.min(100,Math.round((Number(raw)||0)*10)/10));
    if(raw!==''&&Number.isFinite(Number(raw)))input.value=rec;
    const final=resultadoRecuperacaoAnual(total,rec);
    const cell=document.getElementById(`rec-anual-home-${safeId(input.dataset.aluno)}`);
    if(cell){cell.className=final<60?'nota-abaixo-corte':'nota-no-corte';cell.innerHTML=`<strong>${final.toFixed(1)}</strong>`;}
}
function salvarRecuperacaoAnualHome(disciplina){
    if(!db.disciplinas[disciplina].recuperacaoAnual)db.disciplinas[disciplina].recuperacaoAnual={};
    document.querySelectorAll('#lancamento-inline-resultado input[data-rec-anual="1"]').forEach(input=>{
        const aluno=input.dataset.aluno,raw=String(input.value||'').replace(',','.').trim();
        if(raw==='')delete db.disciplinas[disciplina].recuperacaoAnual[aluno];
        else db.disciplinas[disciplina].recuperacaoAnual[aluno]=Math.max(0,Math.min(100,Math.round((Number(raw)||0)*10)/10));
    });
    salvarERetornarInicio('Recuperação anual salva com sucesso.');
}

function abrirCadastroAulas(){garantirEstruturaFaltas();limparSelectLancamento('grade-aulas-bimestre');limparSelectLancamento('grade-aulas-dia');const e=document.getElementById('grade-aulas-editor');if(e)e.innerHTML='<div class="empty-state-panel">Selecione o bimestre, o dia e clique em <strong>Buscar</strong>.</div>';navigate('cadastro-aulas');}
function renderGradeAulas(){
 garantirEstruturaFaltas();const b=Number(document.getElementById('grade-aulas-bimestre')?.value||0),dia=document.getElementById('grade-aulas-dia')?.value||'',editor=document.getElementById('grade-aulas-editor');if(!editor)return;
 if(!b||!dia){editor.innerHTML='<div class="empty-state-panel">Selecione o bimestre, o dia e clique em <strong>Buscar</strong>.</div>';return;}
 const aulas=db.gradeAulas[b][dia]||GRADE_PADRAO[dia],nomeDia=(DIAS_SEMANA.find(x=>x[0]===dia)||['','DIA'])[1];
 editor.innerHTML=`<div class="grade-editor-card"><div class="grade-editor-heading"><div><span class="lancamento-kicker">GRADE SEMANAL</span><h4>${nomeDia}</h4></div><span class="grade-count-badge">5 AULAS</span></div><div class="grade-slots-grid">${[0,1,2,3,4].map(i=>`<div class="grade-slot"><span>AULA ${i+1}</span><select id="grade-slot-${i}"><option value="" disabled ${!aulas[i]?'selected':''}>SELECIONE</option>${listaDisciplinasOptions(aulas[i]||'')}</select></div>`).join('')}</div><div class="grade-editor-footer"><span id="grade-total-disc">Confira as cinco aulas e salve.</span><button class="btn-submit-action" onclick="salvarGradeAulas()"><i class="fas fa-save"></i> SALVAR GRADE</button></div></div><div class="table-responsive-container grade-resumo-wrap"><table class="table-custom-format"><thead><tr><th>DISCIPLINA</th><th>QUANTIDADE DE AULAS</th></tr></thead><tbody>${DISCIPLINAS.map(d=>{const q=aulas.filter(x=>x===d).length;return `<tr><td>${escapeHtml(d.toUpperCase())}</td><td><strong>${q}</strong></td></tr>`}).join('')}</tbody></table></div>`;
}
function atualizarResumoGrade(){const vals=[0,1,2,3,4].map(i=>document.getElementById(`grade-slot-${i}`)?.value||'');const r=document.getElementById('grade-total-disc');if(r)r.textContent=`${vals.filter(Boolean).length} de 5 aulas preenchidas.`;}
function salvarGradeAulas(){
 garantirEstruturaFaltas();const b=Number(document.getElementById('grade-aulas-bimestre')?.value||0),dia=document.getElementById('grade-aulas-dia')?.value||'';if(!b||!dia){alert('Selecione o BIMESTRE e o DIA DA SEMANA antes de salvar.');return;}
 const vals=[0,1,2,3,4].map(i=>document.getElementById(`grade-slot-${i}`)?.value||null);if(vals.some(v=>!v)){alert('Preencha as 5 aulas antes de salvar a grade.');return;}
 db.gradeAulas[b][dia]=vals;salvarERetornarInicio('Grade de aulas salva com sucesso.');
}
function contarAulasDisciplinaNoDia(b,disciplina,dia){return(db.gradeAulas?.[b]?.[dia]||[]).filter(x=>x===disciplina).length;}
function obterFaltaDia(b,dia,aluno){return Number(db.faltasDiarias?.[b]?.[dia]?.[aluno]||0);}
function calcularFaltasDisciplinaDia(b,disciplina,dia,aluno){return obterFaltaDia(b,dia,aluno)*contarAulasDisciplinaNoDia(b,disciplina,dia);}
function calcularFaltasDisciplinaBimestre(b,disciplina,aluno){return DIAS_SEMANA.reduce((t,[dia])=>t+calcularFaltasDisciplinaDia(b,disciplina,dia,aluno),0);}
function salvarFaltasDiarias(){
 garantirEstruturaFaltas();const b=Number(document.getElementById('faltas-bimestre-select')?.value||0);if(!b){alert('Selecione o BIMESTRE antes de salvar o lançamento.');return;}
 ALUNOS.forEach(aluno=>DIAS_SEMANA.forEach(([dia])=>{const input=document.querySelector(`.falta-diaria-input[data-aluno="${CSS.escape(aluno)}"][data-dia="${dia}"]`);if(!input)return;let v=parseInt(String(input.value||'0').replace(',','.'),10);if(!Number.isFinite(v)||v<0)v=0;db.faltasDiarias[b][dia][aluno]=v;}));
 DISCIPLINAS.forEach(d=>DIAS_SEMANA.forEach(([dia])=>{db.faltasPorDisciplina[b][d][dia]={};ALUNOS.forEach(aluno=>{const v=calcularFaltasDisciplinaDia(b,d,dia,aluno);if(v)db.faltasPorDisciplina[b][d][dia][aluno]=v;});}));
 salvarERetornarInicio('Lançamento de faltas salvo com sucesso.');
}
function atualizarTotaisFaltasDiarias(){
 const b=Number(document.getElementById('faltas-bimestre-select')?.value||0);if(!b)return;
 ALUNOS.forEach(aluno=>{let total=0;DIAS_SEMANA.forEach(([dia])=>{const i=document.querySelector(`.falta-diaria-input[data-aluno="${CSS.escape(aluno)}"][data-dia="${dia}"]`);if(i)total+=Number(i.value)||0;});const c=document.querySelector(`.faltas-dia-total[data-aluno="${CSS.escape(aluno)}"]`);if(c)c.textContent=total;});
}
function buscarLancamentoFaltas(){
 garantirEstruturaFaltas();const b=Number(document.getElementById('faltas-bimestre-select')?.value||0),area=document.getElementById('faltas-planilha-area');if(!area)return;
 if(!b){area.innerHTML='<div class="empty-state-panel">Selecione o BIMESTRE e clique em <strong>Buscar</strong>.</div>';return;}
 const aulasPorDia=DIAS_SEMANA.map(([dia,nome])=>({dia,nome,qtd:(db.gradeAulas[b][dia]||[]).filter(Boolean).length}));
 area.innerHTML=`<div class="planilha-resumo frequencia-resumo"><div><strong>${b}º BIMESTRE</strong> · GRADE FIXA</div><div class="frequencia-dia-resumo">${aulasPorDia.map(x=>`<span>${x.nome.replace('-FEIRA','')}: ${x.qtd}</span>`).join('')}</div></div><div class="frequencia-instruction"><i class="fas fa-circle-info"></i><div><strong>REGRA:</strong> lance 0 ou qualquer quantidade inteira positiva de faltas por aluno em cada dia. A falta por disciplina é calculada automaticamente pela quantidade de aulas daquela disciplina no dia. Ex.: 3 faltas na terça × 2 aulas de PORTUGUÊS = 6 faltas em PORTUGUÊS.</div></div><div class="table-responsive-container"><table class="table-custom-format faltas-diarias-table"><thead><tr><th>ALUNO</th>${DIAS_SEMANA.map(([d,n])=>`<th>${n}</th>`).join('')}<th>TOTAL NO BIMESTRE</th></tr></thead><tbody>${ALUNOS.map(aluno=>{let total=0;const cells=DIAS_SEMANA.map(([dia])=>{const v=obterFaltaDia(b,dia,aluno);total+=v;return `<td><input class="falta-diaria-input" data-aluno="${escapeAttr(aluno)}" data-dia="${dia}" type="number" min="0" step="1" value="${v}" oninput="atualizarTotaisFaltasDiarias()" onkeydown="avancarCampoComEnter(event)"></td>`}).join('');return `<tr><td><strong>${escapeHtml(aluno)}</strong></td>${cells}<td class="faltas-dia-total" data-aluno="${escapeAttr(aluno)}">${total}</td></tr>`}).join('')}</tbody></table></div><div class="save-launch-bar"><span>Confira os lançamentos antes de gravar.</span><button class="btn-submit-action" onclick="salvarFaltasDiarias()"><i class="fas fa-save"></i> SALVAR LANÇAMENTO</button></div>`;
}
function obterFaltasAlunoBimestre(aluno,b){garantirEstruturaFaltas();return DISCIPLINAS.reduce((t,d)=>t+calcularFaltasDisciplinaBimestre(b,d,aluno),0);}
function obterFaltasAlunoDisciplina(aluno,disciplina,bimestre){garantirEstruturaFaltas();return calcularFaltasDisciplinaBimestre(Number(bimestre),disciplina,aluno);}
function totalFaltasDisciplina(aluno,disciplina){let t=0;for(let b=1;b<=4;b++)t+=obterFaltasAlunoDisciplina(aluno,disciplina,b);return t;}
function getNotaFinalBimestre(disciplina,bimestre,aluno){
 const bData=db.disciplinas[disciplina]?.[Number(bimestre)]||{};
 let total=(bData.atividades||[]).reduce((s,a)=>s+(parseFloat(a.notas?.[aluno]?.notaFinal)||0),0);
 const rec=bData.recuperacaoBimestral?.[aluno];
 if(total<15&&rec!==undefined&&rec!==''){
  const r=Number(String(rec).replace(',','.'))||0;
  total=r>=15?15:Math.max(total,r);
 }
 return Number(total.toFixed(1));
}
function getResultadoFinalAluno(aluno){
    const todosFechados=[1,2,3,4].every(b=>!!db.configGlobal?.bimestresFechados?.[b]);
    const detalhes={disciplinas:{},recuperacoes:[],reprovacaoDireta:false,totalFaltasAno:0,presencaGeral:100,recuperacaoFrequenciaGeral:false,resultado:'EM CURSO'};
    let totalAulasFaltadas=0;
    for(let b=1;b<=4;b++) totalAulasFaltadas+=obterFaltasAlunoBimestre(aluno,b);
    detalhes.totalFaltasAno=totalAulasFaltadas;
    // 200 dias letivos: cada falta diária lançada representa uma ausência em um dia.
    let faltasDiariasAno=0;
    for(let b=1;b<=4;b++) DIAS_SEMANA.forEach(([dia])=>{ faltasDiariasAno+=obterFaltaDia(b,dia,aluno); });
    detalhes.faltasDiariasAno=faltasDiariasAno;
    detalhes.presencaGeral=Math.max(0,100-(faltasDiariasAno/DIAS_LETIVOS_ANO*100));
    detalhes.recuperacaoFrequenciaGeral=detalhes.presencaGeral<75;

    DISCIPLINAS.forEach(d=>{
        const notaAnual=[1,2,3,4].reduce((s,b)=>s+getNotaFinalBimestre(d,b,aluno),0);
        const faltas=totalFaltasDisciplina(aluno,d);
        const limite=LIMITES_FALTAS_DISCIPLINA[d] ?? Infinity;
        const excessoFalta=faltas>limite;
        const abaixoNota=notaAnual<60;
        const recuperacao=abaixoNota||excessoFalta;
        let final=notaAnual;
        let recAplicada=false;
        const rec=db.disciplinas[d]?.recuperacaoAnual?.[aluno];
        if(excessoFalta && abaixoNota){
            detalhes.reprovacaoDireta=true;
            final=0;
        } else if(recuperacao){
            detalhes.recuperacoes.push(d);
            if(excessoFalta){
                final=rec!==undefined&&rec!=='' ? calcularResultadoRecuperacao(0,rec,100) : 0;
                recAplicada=rec!==undefined&&rec!=='';
            } else if(rec!==undefined&&rec!==''){
                final=calcularResultadoRecuperacao(notaAnual,rec,100);
                recAplicada=true;
            }
        }
        detalhes.disciplinas[d]={notaAnual,faltas,limite,excessoFalta,abaixoNota,recuperacao,recuperacaoAnual:rec??'',recAplicada,final};
    });

    const qtd=detalhes.recuperacoes.length;
    if(!todosFechados){detalhes.resultado='EM CURSO';return detalhes;}
    if(detalhes.reprovacaoDireta || qtd>4){detalhes.resultado='REPROVADO';return detalhes;}
    const aindaAbaixo=detalhes.recuperacoes.filter(d=>detalhes.disciplinas[d].final<60);
    if(aindaAbaixo.length>0){detalhes.resultado='PROGRESSÃO PARCIAL';return detalhes;}
    if(detalhes.recuperacaoFrequenciaGeral){
        // A frequência geral abaixo de 75% exige recuperação final, mas não cria uma matéria fictícia;
        // a situação permanece dependente das matérias que efetivamente possuem nota/falta recuperável.
        detalhes.resultado='RECUPERAÇÃO FINAL';
        return detalhes;
    }
    detalhes.resultado='APROVADO';
    return detalhes;
}

function abrirNotaFinalDisciplina(){
    garantirEstruturaFaltas();
    const tela=document.getElementById('screen-nota-final-disciplina');
    if(!tela){console.error('Tela de Nota Final por Disciplina não encontrada.');return;}
    const s=document.getElementById('final-disciplina-select');
    if(s){
        s.innerHTML='<option value="" selected disabled>SELECIONE</option>'+listaDisciplinasOptions();
        s.value='';
    }
    const c=document.getElementById('table-nota-final-disciplina-corpo');
    if(c)c.innerHTML='<tr><td colspan="12" class="empty-state">Selecione uma disciplina e clique em Buscar.</td></tr>';
    const t=tela.querySelector('.nota-final-disc-table');
    if(t)t.style.display='table';
    navigate('nota-final-disciplina');
}

function buscarNotaFinalDisciplina(){
    garantirEstruturaFaltas();
    const disciplina=document.getElementById('final-disciplina-select')?.value||'',corpo=document.getElementById('table-nota-final-disciplina-corpo');
    if(!corpo)return; if(!disciplina){alert('Selecione a DISCIPLINA antes de buscar.');return;}
    const tabela=document.querySelector('#screen-nota-final-disciplina .nota-final-disc-table');if(tabela)tabela.style.display='table';
    corpo.innerHTML=ALUNOS.map(aluno=>{
        const detalhe=getResultadoFinalAluno(aluno),f=detalhe.disciplinas[disciplina],notas=[1,2,3,4].map(b=>getNotaFinalBimestre(disciplina,b,aluno)),faltas=[1,2,3,4].map(b=>obterFaltasAlunoDisciplina(aluno,disciplina,b));
        const notaFinal=f.final, situacaoDisc=f.excessoFalta&&f.abaixoNota?'REPROVADO':(f.recuperacao?'RECUPERAÇÃO':'APROVADO');
        return `<tr><td><strong>${escapeHtml(aluno)}</strong></td>${notas.map((n,i)=>`<td class="${classeNotaPercentual(n,25)}">${n.toFixed(2)}</td><td>${faltas[i]}</td>`).join('')}<td class="${classeNotaPercentual(notaFinal,100)}"><strong>${notaFinal.toFixed(2)}</strong></td><td><strong>${faltas.reduce((a,v)=>a+v,0)}</strong></td><td>${situacaoDisc}</td></tr>`;
    }).join('');
}

function buscarLancamentoNotas(){
 const b=Number(document.getElementById('central-notas-bimestre')?.value||0),disciplina=document.getElementById('central-notas-disciplina')?.value||'',area=document.getElementById('central-notas-area');if(!area)return;
 if(!b||!disciplina){area.innerHTML='<div class="empty-state-panel">Selecione o BIMESTRE e a DISCIPLINA e clique em <strong>Buscar</strong>.</div>';return;}
 selectedBimestre=b;selectedMateria=disciplina;
 const bData=db.disciplinas[disciplina][b],atividades=bData.atividades||[],fechado=!!db.configGlobal.bimestresFechados[b];
 area.innerHTML=`<div class="notas-central-head"><div><strong>${escapeHtml(disciplina.toUpperCase())}</strong><span>${b}º BIMESTRE · ${atividades.length} ATIVIDADE(S)</span></div><div class="notas-central-head-actions"><button class="btn-secondary-action" ${fechado?'disabled':''} onclick="abrirCriacaoAtividadeCentral()"><i class="fas fa-plus"></i> CRIAR ATIVIDADE</button><button class="btn-submit-action" ${fechado?'disabled':''} onclick="salvarLancamentoNotasCentral()"><i class="fas fa-save"></i> SALVAR LANÇAMENTO</button></div></div><div id="central-notas-planilha"></div>`;
 if(!atividades.length){document.getElementById('central-notas-planilha').innerHTML='<div class="empty-state-panel">Nenhuma atividade criada para este bimestre. Clique em <strong>CRIAR ATIVIDADE</strong> para começar.</div>';return;}
 document.getElementById('central-notas-planilha').innerHTML=`<div class="table-responsive-container"><table class="table-custom-format notas-central-table"><thead><tr><th>NOME</th>${atividades.map((a,i)=>`<th><div class="central-atividade-head"><span>ATIVIDADE ${i+1}</span><strong>${escapeHtml(a.nome.toUpperCase())}</strong><small>VALOR: ${Number(a.valor).toFixed(1)} PTS</small></div></th>`).join('')}<th>NOTA DO<br>BIMESTRE</th><th>NOTA DA RECUPERAÇÃO<br>BIMESTRAL</th><th>NOTA OFICIAL<br>DO BIMESTRE</th></tr></thead><tbody id="central-notas-corpo"></tbody></table></div><div class="save-launch-bar"><span>Os valores digitados são rascunhos. As somas e a Nota Oficial só mudam depois de salvar.</span><button class="btn-submit-action" ${fechado?'disabled':''} type="button" onclick="salvarLancamentoNotasCentral()"><i class="fas fa-save"></i> SALVAR LANÇAMENTO</button></div>`;
 document.getElementById('central-notas-corpo').innerHTML=ALUNOS.map(aluno=>{
   const soma=totalBimestreComDadosSalvos(disciplina,b,aluno);
   const recSalva=bData.recuperacaoBimestral?.[aluno]??'';
   const precisa=soma<CONFIG.limitPoints*CONFIG.passingScorePct;
   const oficial=getNotaFinalBimestre(disciplina,b,aluno);
   return `<tr><td class="central-aluno-name"><strong>${escapeHtml(aluno)}</strong></td>${atividades.map(a=>{const nd=a.notas?.[aluno]||{notaOrig:'',notaFinal:0};return `<td><input class="nota-central-input" type="text" inputmode="decimal" value="${escapeAttr(nd.notaOrig??'')}" data-aluno="${escapeAttr(aluno)}" data-atv="${escapeAttr(a.id)}" data-max="${a.valor}" ${fechado?'disabled':''} oninput="normalizarNumeroCampo(this)" onkeydown="avancarCampoComEnter(event)"></td>`}).join('')}<td class="nota-central-total ${classeNotaPercentual(soma,CONFIG.limitPoints)}"><span class="nota-cell-label">NOTA DO BIMESTRE</span><strong>${soma.toFixed(1)}</strong></td><td class="rec-central-cell"><input class="rec-central-input" type="text" inputmode="decimal" value="${escapeAttr(recSalva)}" data-aluno="${escapeAttr(aluno)}" data-max="25" ${!precisa||fechado?'disabled':''} placeholder="—" oninput="normalizarNumeroCampo(this)" onkeydown="avancarCampoComEnter(event)"></td><td class="nota-oficial-central ${classeNotaPercentual(oficial,CONFIG.limitPoints)}"><span class="nota-oficial-label">Nota Oficial</span><strong>${oficial.toFixed(1)}</strong></td></tr>`;
 }).join('');
}
function normalizarNumeroCampo(input){ normalizarNotaPlanilha(input, Number(input.dataset.max)||25); }
function salvarLancamentoNotasCentral(){
 const b=Number(document.getElementById('central-notas-bimestre')?.value||0),disciplina=document.getElementById('central-notas-disciplina')?.value||'';if(!b||!disciplina){alert('Selecione o BIMESTRE e a DISCIPLINA antes de salvar.');return;}selectedBimestre=b;selectedMateria=disciplina;const bData=db.disciplinas[disciplina][b];
 document.querySelectorAll('#central-notas-corpo tr').forEach(row=>{row.querySelectorAll('.nota-central-input').forEach(input=>{const aluno=input.dataset.aluno,atv=bData.atividades.find(a=>a.id===input.dataset.atv),max=Number(input.dataset.max);if(!atv)return;if(!atv.notas)atv.notas={};const nd=atv.notas[aluno]||{notaOrig:'',notaRec:'',notaFinal:0},raw=String(input.value||'').replace(',','.').trim();if(raw===''){nd.notaOrig='';nd.notaFinal=0;}else{const v=Math.round(Math.max(0,Math.min(max,Number(raw)||0))*10)/10;nd.notaOrig=v;nd.notaFinal=v;}atv.notas[aluno]=nd;});const rec=row.querySelector('.rec-central-input');if(rec){const aluno=rec.dataset.aluno,raw=String(rec.value||'').replace(',','.').trim(),soma=bData.atividades.reduce((s,a)=>s+(parseFloat(a.notas?.[aluno]?.notaFinal)||0),0);if(soma<15&&raw!=='')bData.recuperacaoBimestral[aluno]=Math.round(Math.max(0,Math.min(CONFIG.limitPoints,Number(raw)||0))*10)/10;else if(raw==='')delete bData.recuperacaoBimestral[aluno];}});
 (bData.atividades||[]).forEach(a=>recalcularNotasDaAtividade(a));salvarERetornarInicio('Lançamento de notas salvo com sucesso.');
}
function salvarNotaCentral(aluno,atvId,input,max){normalizarNumeroCampo(input);}
function salvarRecCentral(aluno,input){normalizarNumeroCampo(input);}
function abrirFormularioAtividadeInline(editId=''){
    abrirModalAtividade(editId);
}
function fecharFormularioAtividadeInline(){fecharModalAtividade();}
function salvarAtividadeInline(){salvarAtividadeModal();}

function avancarCampoComEnter(e){
 if(e.key!=='Enter')return;e.preventDefault();const root=e.target.closest('.screen')||document;
 const campos=[...root.querySelectorAll('input:not([disabled]):not([type="hidden"]),select:not([disabled]),button:not([disabled])')].filter(x=>x.offsetParent!==null&&!x.classList.contains('btn-back'));
 const i=campos.indexOf(e.target);if(i>=0&&campos[i+1]){campos[i+1].focus();if(typeof campos[i+1].select==='function')campos[i+1].select();}
}

/**
 * MOTOR DE BANCO DE DADOS LOCAL E CONVERSOR DE SEGURANÇA
 */
function initDatabaseEngine() {
    let localData = localStorage.getItem(DB_KEY);
    try {
        if (!localData) {
            throw new Error("Primeiro acesso ao sistema detectado.");
        }
        db = JSON.parse(localData);
        
        // Verifica se chaves críticas de configuração existem
        if (!db.disciplinas || !db.configGlobal) {
            throw new Error("Banco desatualizado. Reestruturando tabelas...");
        }
    } catch (e) {
        console.warn(e.message);
        db = {
            configGlobal: { currentBimestre: 1, bimestresFechados: { 1:false, 2:false, 3:false, 4:false } },
            disciplinas: {}, gradeAulas: {}, faltasPorDisciplina: {}, aulasPorDia: {}, faltasDiarias: {}
        };
        
        DISCIPLINAS.forEach(d => {
            db.disciplinas[d] = {
                recuperacaoAnual: {}
            };
            for (let b = 1; b <= 4; b++) {
                db.disciplinas[d][b] = {
                    atividades: [],
                    recuperacaoBimestral: {}
                };
            }
        });
        saveStorage();
    }

    inicializarCadastroAlunos();
    garantirEstruturaFaltas();
    if (!db.aulasPorDia) db.aulasPorDia = {};
    if (!db.faltasDiarias) db.faltasDiarias = {};
    garantirEstruturaFaltas();

    // Garante compatibilidade de chaves para recuperação anual em bases migradas
    DISCIPLINAS.forEach(d => {
        if (!db.disciplinas[d]) db.disciplinas[d] = {};
        if (!db.disciplinas[d].recuperacaoAnual) db.disciplinas[d].recuperacaoAnual = {};
    });
}

function saveStorage() {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

/**
 * GERENCIADOR DE ROTAS INTERNAS (NAVEGAÇÃO SMART-MOBILE)
 */
function navigate(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    // Fechamentos automáticos de segurança ao navegar
    const side = document.getElementById('sidebar');
    const over = document.getElementById('sidebar-overlay');
    if (side.classList.contains('active')) {
        side.classList.remove('active');
        over.classList.remove('active');
    }
    
    // Gatilhos específicos de renderização por tela
    if (screenId === 'fechamento-global') {
        renderFechamentoGlobalScreen();
    } else if (screenId === 'dashboard') {
        generateAnalyticalDashboard();
    } else if (screenId === 'home') {
        updateGlobalBimestreUI();
    } else if (screenId === 'boletim-individual') {
        renderBoletimIndividualList();
    } else if (screenId === 'cadastro-aulas') {
        renderGradeAulas();
    } else if (screenId === 'ata-resultados-finais') {
        renderAtaResultadosFinais();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

function updateGlobalBimestreUI() {
    const cb = db.configGlobal.currentBimestre;
    const el = document.getElementById('global-bimestre-badge');
    if (el) {
        el.textContent = cb <= 4 ? `${cb}º Bimestre Ativo` : "Ano Letivo Encerrado";
    }
}

/**
 * CONSTRUÇÃO DA INTERFACE EM BLOCOS SOLICITADA
 */
function renderMateriaBlocks() {
    const grid = document.getElementById('disciplinas-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    DISCIPLINAS.forEach(m => {
        const icon = ICONS_DISC[m] || 'fa-book';
        const div = document.createElement('div');
        div.className = 'disciplina-card';
        div.onclick = () => selectMateriaHub(m);
        div.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${m}</span>
        `;
        grid.appendChild(div);
    });
}

function selectMateriaHub(materia) {
    selectedMateria = materia;
    document.getElementById('hub-materia-titulo').textContent = materia;
    
    // Trava o seletor do Hub no bimestre ativo do sistema
    selectedBimestre = db.configGlobal.currentBimestre.toString();
    if(db.configGlobal.currentBimestre > 4) selectedBimestre = "4";
    
    document.getElementById('hub-bimestre-select').value = selectedBimestre;
    
    updateBimestreProgressIndicator();
    checkBimestreStatusAlerta();
    checkRecuperacaoAnualButtonVisibility();
    navigate('materia-hub');
}

function changeBimestreHub() {
    selectedBimestre = document.getElementById('hub-bimestre-select').value;
    updateBimestreProgressIndicator();
    checkBimestreStatusAlerta();
}

function checkBimestreStatusAlerta() {
    const isFechado = db.configGlobal.bimestresFechados[selectedBimestre];
    const alertaContainer = document.getElementById('status-periodo-alerta');
    if (!alertaContainer) return;
    
    if (isFechado) {
        alertaContainer.innerHTML = `
            <div class="info-alert danger-alert">
                <i class="fas fa-lock"></i> ATENÇÃO: Este período foi encerrado globalmente. As notas estão congeladas apenas para leitura.
            </div>
        `;
    } else {
        alertaContainer.innerHTML = '';
    }
}

function checkRecuperacaoAnualButtonVisibility() {
    const todosFechados = [1, 2, 3, 4].every(b => db.configGlobal.bimestresFechados[b]);
    const btnRecAnual = document.getElementById('btn-hub-rec-anual');
    if (btnRecAnual) btnRecAnual.style.display = todosFechados ? 'flex' : 'none';
    if (typeof renderLancamentoSeletorHome === 'function') renderLancamentoSeletorHome('');
}

function updateBimestreProgressIndicator() {
    const bData = db.disciplinas[selectedMateria][selectedBimestre];
    const totalUtilizado = bData.atividades.reduce((sum, a) => sum + parseFloat(a.valor), 0);
    const restantes = CONFIG.limitPoints - totalUtilizado;

    const usedEl = document.getElementById('hub-points-used');
    if (usedEl) usedEl.textContent = totalUtilizado.toFixed(2);
    
    const fill = document.getElementById('hub-points-bar');
    const msg = document.getElementById('hub-points-msg');
    
    const pct = (totalUtilizado / CONFIG.limitPoints) * 100;
    if (fill) {
        fill.style.width = `${Math.min(pct, 100)}%`;
        if (pct <= 80) fill.style.backgroundColor = 'var(--success)';
        else if (pct <= 95) fill.style.backgroundColor = 'var(--warning)';
        else fill.style.backgroundColor = 'var(--danger)';
    }

    if (msg) {
        if (totalUtilizado >= CONFIG.limitPoints) {
            msg.textContent = "Limite máximo atingido para o bimestre (25.00 pontos).";
            msg.style.color = 'var(--success)';
        } else {
            msg.textContent = `Disponível para cadastro: ${restantes.toFixed(2)} pontos.`;
            msg.style.color = 'var(--text-light)';
        }
    }
}

/**
 * INTERFACES DE GERENCIAMENTO DE ATIVIDADES
 */
function openCriarAtividade() {
    // Primeiro mostra a tela e somente depois renderiza a matriz.
    // Isso evita que a tabela fique invisível quando a tela ainda está oculta.
    if (!selectedMateria) {
        alert('Selecione uma disciplina antes de abrir o quadro de atividades.');
        navigate('home');
        return;
    }

    if (!db.disciplinas[selectedMateria]) {
        alert('A disciplina selecionada não foi encontrada no banco de dados.');
        return;
    }

    if (!db.disciplinas[selectedMateria][selectedBimestre]) {
        db.disciplinas[selectedMateria][selectedBimestre] = {
            atividades: [],
            recuperacaoBimestral: {}
        };
        saveStorage();
    }

    resetAtividadeForm();
    navigate('criar-atividade');

    const isFechado = !!db.configGlobal.bimestresFechados[selectedBimestre];
    const formBox = document.getElementById('wrapper-form-atividade');
    const lockBox = document.getElementById('alerta-bloqueio-atividade');

    if (formBox) formBox.style.display = isFechado ? 'none' : 'block';
    if (lockBox) lockBox.style.display = isFechado ? 'block' : 'none';

    renderAtividadesCriadasList();
}

function resetAtividadeForm() {
    const form = document.getElementById('form-atividade');
    if (form) form.reset();

    const editId = document.getElementById('atv-edit-id');
    if (editId) editId.value = '';

    const saveBtn = document.getElementById('btn-salvar-atividade');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Gravar e Publicar';
    }

    const cancelBtn = document.getElementById('btn-cancelar-edicao');
    if (cancelBtn) cancelBtn.style.display = 'none';
}

function cancelarEdicaoAtividade() {
    resetAtividadeForm();
}

function fecharModalAtividade(){
    const modal=document.getElementById('atividade-modal');
    if(modal) modal.style.display='none';
}
function abrirModalAtividade(editId=''){
    const b=Number(selectedBimestre||document.getElementById('inline-notas-bimestre')?.value||0);
    const disciplina=selectedMateria||document.getElementById('inline-notas-disciplina')?.value||'';
    if(!b||!disciplina){alert('Selecione o BIMESTRE e a DISCIPLINA antes de criar ou editar uma atividade.');return;}
    const modal=document.getElementById('atividade-modal');
    const id=document.getElementById('atividade-modal-id');
    const nome=document.getElementById('atividade-modal-nome');
    const valor=document.getElementById('atividade-modal-valor');
    const titulo=document.getElementById('atividade-modal-title');
    const atv=(db.disciplinas[disciplina]?.[b]?.atividades||[]).find(a=>a.id===editId);
    if(id) id.value=editId||'';
    if(nome) nome.value=atv?.nome||'';
    if(valor) valor.value=atv?Number(atv.valor).toFixed(2):'';
    if(titulo) titulo.textContent=atv?'EDITAR ATIVIDADE':'CRIAR ATIVIDADE';
    if(modal){modal.style.display='flex';setTimeout(()=>nome?.focus(),50);}
}
function editAtividade(id) {
    const isFechado = db.configGlobal.bimestresFechados[selectedBimestre];
    if (isFechado) { alert('Operação negada. Este bimestre está fechado.'); return; }
    const atividades = db.disciplinas[selectedMateria]?.[selectedBimestre]?.atividades || [];
    if (!atividades.some(a=>a.id===id)) return;
    abrirModalAtividade(id);
}
function abrirCriacaoAtividadeCentral(){
    const b=Number(document.getElementById('inline-notas-bimestre')?.value||selectedBimestre||0);
    const disciplina=document.getElementById('inline-notas-disciplina')?.value||selectedMateria||'';
    if(b)selectedBimestre=b;if(disciplina)selectedMateria=disciplina;
    abrirModalAtividade('');
}
function salvarAtividadeModal(){
    const b=Number(selectedBimestre||document.getElementById('inline-notas-bimestre')?.value||0);
    const disciplina=selectedMateria||document.getElementById('inline-notas-disciplina')?.value||'';
    const editId=(document.getElementById('atividade-modal-id')?.value||'').trim();
    const nome=(document.getElementById('atividade-modal-nome')?.value||'').trim();
    const valor=Number(String(document.getElementById('atividade-modal-valor')?.value||'').replace(',','.'));
    if(!b||!disciplina||!nome||!Number.isFinite(valor)||valor<=0){alert('Informe o nome e um valor válido para a atividade.');return;}
    if(db.configGlobal.bimestresFechados[b]){alert('Operação bloqueada. Este bimestre já está fechado.');return;}
    const bData=db.disciplinas[disciplina][b];
    const totalSemEditada=(bData.atividades||[]).filter(a=>a.id!==editId).reduce((sum,a)=>sum+(Number(a.valor)||0),0);
    if(totalSemEditada+valor>CONFIG.limitPoints){alert(`Impossível salvar. A soma das atividades ultrapassaria ${CONFIG.limitPoints.toFixed(2)} pontos.`);return;}
    if(editId){const atv=(bData.atividades||[]).find(a=>a.id===editId);if(!atv)return;atv.nome=nome;atv.valor=valor;recalcularNotasDaAtividade(atv);}
    else bData.atividades.push({id:'atv_'+Date.now(),nome,valor,notas:{}});
    saveStorage();fecharModalAtividade();
    limparRascunhosLancamento();
    navigate('home');
    alert('Atividade salva com sucesso.');
}

function saveAtividade(e) {
    e.preventDefault();

    const isFechado = db.configGlobal.bimestresFechados[selectedBimestre];
    if (isFechado) {
        alert("Operação bloqueada. Este bimestre já está fechado.");
        return;
    }

    const nome = document.getElementById('atv-nome').value.trim();
    const valor = parseFloat(document.getElementById('atv-valor').value);
    const editId = document.getElementById('atv-edit-id').value.trim();

    if (!nome || !Number.isFinite(valor) || valor <= 0) {
        alert("Informe o nome e um valor válido para a atividade.");
        return;
    }

    const bData = db.disciplinas[selectedMateria][selectedBimestre];
    const atividadeEditada = editId ? bData.atividades.find(a => a.id === editId) : null;

    const totalSemEditada = bData.atividades
        .filter(a => a.id !== editId)
        .reduce((sum, a) => sum + (parseFloat(a.valor) || 0), 0);

    if (totalSemEditada + valor > CONFIG.limitPoints) {
        alert(`Impossível salvar. A somatória do bimestre ultrapassaria 25.00 pontos.\nMargem disponível: ${(CONFIG.limitPoints - totalSemEditada).toFixed(2)} pontos.`);
        return;
    }

    if (atividadeEditada) {
        atividadeEditada.nome = nome;
        atividadeEditada.valor = valor;
        recalcularNotasDaAtividade(atividadeEditada);
    } else {
        const novaAtv = {
            id: "atv_" + Date.now(),
            nome: nome,
            valor: valor,
            notas: {}
        };
        bData.atividades.push(novaAtv);
    }

    saveStorage();
    updateBimestreProgressIndicator();
    resetAtividadeForm();
    renderAtividadesCriadasList();
    navigate('home');
}

function recalcularNotasDaAtividade(atv) {
    if (!atv.notas) atv.notas = {};

    const corteMediaAtv = Number(atv.valor) * CONFIG.passingScorePct;

    ALUNOS.forEach(aluno => {
        if (!atv.notas[aluno]) {
            atv.notas[aluno] = { notaOrig: "", notaRec: "", notaFinal: 0.0 };
        }

        const nData = atv.notas[aluno];

        if (nData.notaOrig !== "") {
            let nOrig = parseFloat(nData.notaOrig);
            if (!Number.isFinite(nOrig)) nOrig = 0;
            nOrig = Math.max(0, Math.min(nOrig, Number(atv.valor)));
            nData.notaOrig = nOrig;
        }

        if (nData.notaRec !== "") {
            let nRec = parseFloat(nData.notaRec);
            if (!Number.isFinite(nRec)) nRec = 0;
            nRec = Math.max(0, Math.min(nRec, Number(atv.valor)));

            if (nData.notaOrig !== "" && parseFloat(nData.notaOrig) >= corteMediaAtv) {
                nData.notaRec = "";
            } else {
                nData.notaRec = nRec;
            }
        }

        const nOrig = parseFloat(nData.notaOrig) || 0;
        const nRec = nData.notaRec === "" ? null : (parseFloat(nData.notaRec) || 0);

        if (nRec !== null) {
            nData.notaFinal = nRec >= corteMediaAtv
                ? corteMediaAtv
                : Math.max(nOrig, nRec);
        } else {
            nData.notaFinal = nOrig;
        }
    });
}

function deleteAtividade(id) {
    const isFechado = db.configGlobal.bimestresFechados[selectedBimestre];
    if (isFechado) {
        alert("Operação negada. Período letivo trancado.");
        return;
    }

    if (confirm("Isto excluirá permanentemente a avaliação e todas as notas digitadas. Confirmar?")) {
        let bData = db.disciplinas[selectedMateria][selectedBimestre];
        bData.atividades = bData.atividades.filter(a => a.id !== id);
        saveStorage();
        updateBimestreProgressIndicator();
        resetAtividadeForm();
        renderAtividadesCriadasList();
        if(document.getElementById('inline-notas-bimestre') || document.getElementById('inline-lancamento-bimestre')) buscarLancamentoNotasInline();
    }
}

/**
 * QUADRO HORIZONTAL DE ATIVIDADES
 * Cada atividade ocupa duas colunas: Nota e Recuperação.
 * A lógica de recuperação permanece a mesma do lançamento individual.
 */
function renderAtividadesCriadasList() {
    const head = document.getElementById('atividades-grade-head');
    const body = document.getElementById('atividades-grade-body');
    if (!head || !body) return;
    head.innerHTML = '';
    body.innerHTML = '';

    const bData = db.disciplinas[selectedMateria][selectedBimestre];
    const atividades = bData.atividades || [];
    const isFechado = db.configGlobal.bimestresFechados[selectedBimestre];

    if (atividades.length === 0) {
        head.innerHTML = '<tr><th class="atividade-vazia-header"><i class="fas fa-table"></i> Nenhuma atividade criada neste bimestre</th></tr>';
        body.innerHTML = '<tr><td class="atividade-vazia-cell">Crie a primeira atividade usando o formulário acima.</td></tr>';
        return;
    }

    /*
     * Planilha principal, na ordem solicitada:
     * NOME | ATIVIDADES CRIADAS | NOTA DO BIMESTRE |
     * RECUPERAÇÃO BIMESTRAL | NOTA OFICIAL DO BIMESTRE
     *
     * Os campos de atividade e recuperação são rascunhos. Somente os valores
     * já gravados em db entram nas somas e na Nota Oficial.
     */
    const headRow = document.createElement('tr');
    headRow.innerHTML = `
        <th class="aluno-fixed-head">NOME</th>
        ${atividades.map((a, index) => `
            <th class="atividade-group-head atividade-column-head">
                <div class="atividade-header-content">
                    <div class="atividade-header-text">
                        <span class="atividade-index">ATIVIDADE ${index + 1}</span>
                        <strong class="atividade-name">${escapeHtml(a.nome)}</strong>
                        <small>Valor: ${Number(a.valor).toFixed(1)} pts</small>
                    </div>
                    <div class="atividade-header-actions">
                        <button type="button" class="btn-grade-edit" onclick="editAtividade('${a.id}')" ${isFechado ? 'disabled' : ''} title="Editar atividade"><i class="fas fa-pen"></i></button>
                        <button type="button" class="btn-grade-delete" onclick="deleteAtividade('${a.id}')" ${isFechado ? 'disabled' : ''} title="Excluir atividade"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </th>
        `).join('')}
        <th class="nota-bimestre-head">NOTA DO<br>BIMESTRE</th>
        <th class="rec-bim-matrix-head">NOTA DA RECUPERAÇÃO<br>BIMESTRAL</th>
        <th class="nota-oficial-head">NOTA OFICIAL<br>DO BIMESTRE</th>
    `;
    head.appendChild(headRow);

    ALUNOS.forEach((aluno, alunoIndex) => {
        const tr = document.createElement('tr');
        let cells = `<td class="aluno-grade-name"><span class="aluno-number">${alunoIndex + 1}.</span><strong>${escapeHtml(aluno)}</strong></td>`;

        atividades.forEach((atv) => {
            if (!atv.notas) atv.notas = {};
            if (!atv.notas[aluno]) atv.notas[aluno] = { notaOrig: '', notaRec: '', notaFinal: 0.0 };
            const nData = atv.notas[aluno];
            const valor = Number(atv.valor);
            const corte = valor * CONFIG.passingScorePct;
            const dNota = getDraftNota(selectedMateria, selectedBimestre, atv.id, aluno, nData.notaOrig ?? '', nData.notaRec ?? '');
            const recBloqueada = nData.notaOrig !== '' && parseFloat(nData.notaOrig) >= corte;
            const notaSalva = parseFloat(nData.notaFinal || 0);
            const classeSalva = classeNotaPercentual(notaSalva, valor);

            cells += `
                <td class="atividade-stacked-cell atividade-lancamento-cell">
                    <div class="nota-field-stack">
                        <label>NOTA</label>
                        <input class="matrix-nota-input" type="text" inputmode="decimal" maxlength="6"
                            value="${escapeAttr(dNota.notaOrig ?? '')}"
                            data-aluno="${escapeAttr(aluno)}" data-atv="${escapeAttr(atv.id)}" data-campo="notaOrig" data-max="${valor}"
                            ${isFechado ? 'disabled' : ''}
                            oninput="autoSaveNotaMatrix('${escapeAttr(aluno)}','${atv.id}','notaOrig',this,${valor})"
                            aria-label="Nota de ${escapeAttr(aluno)} em ${escapeAttr(atv.nome)}">
                    </div>
                    <div class="nota-field-stack recuperacao-field">
                        <label>RECUPERAÇÃO</label>
                        <input class="matrix-rec-input" type="text" inputmode="decimal" maxlength="6"
                            value="${escapeAttr(dNota.notaRec ?? '')}"
                            id="rec-matrix-${atv.id}-${safeId(aluno)}"
                            data-aluno="${escapeAttr(aluno)}" data-atv="${escapeAttr(atv.id)}" data-campo="notaRec" data-max="${valor}"
                            ${recBloqueada || isFechado ? 'disabled' : ''}
                            oninput="autoSaveNotaMatrix('${escapeAttr(aluno)}','${atv.id}','notaRec',this,${valor})"
                            aria-label="Recuperação de ${escapeAttr(aluno)} em ${escapeAttr(atv.nome)}">
                    </div>
                    <div class="nota-field-stack nota-final-field">
                        <label>NOTA SALVA</label>
                        <div class="nota-final-value ${classeSalva}">${notaSalva.toFixed(1)}</div>
                    </div>
                </td>`;
        });

        const notaBimestre = totalBimestreComDadosSalvos(selectedMateria, selectedBimestre, aluno);
        const corteBimestre = CONFIG.limitPoints * CONFIG.passingScorePct;
        const classeBimestre = classeNotaPercentual(notaBimestre, CONFIG.limitPoints);
        const recSalva = bData.recuperacaoBimestral?.[aluno] ?? '';
        const recRascunho = getDraftRecBim(selectedMateria, selectedBimestre, aluno, recSalva);
        const elegivelRecBim = notaBimestre < corteBimestre;
        const notaOficial = getNotaFinalBimestre(selectedMateria, selectedBimestre, aluno);
        const classeOficial = classeNotaPercentual(notaOficial, CONFIG.limitPoints);

        cells += `
            <td class="nota-bimestre-cell ${classeBimestre}">
                <span class="nota-cell-label">NOTA DO BIMESTRE</span>
                <strong>${notaBimestre.toFixed(1)}</strong>
            </td>
            <td class="rec-bim-matrix-cell">
                <span class="nota-cell-label">RECUPERAÇÃO BIMESTRAL</span>
                <input class="rec-bim-matrix-input" type="text" inputmode="decimal" maxlength="5"
                    value="${escapeAttr(recRascunho)}" data-aluno="${escapeAttr(aluno)}" data-rec-bim="1" data-max="25"
                    ${(!elegivelRecBim || isFechado) ? 'disabled' : ''}
                    placeholder="—" title="Recuperação bimestral: até 25,0 pontos"
                    oninput="autoSaveRecuperacaoBimestralMatrix(this)" onkeydown="avancarCampoComEnter(event)">
            </td>
            <td class="nota-oficial-cell ${classeOficial}">
                <span class="nota-oficial-label">Nota Oficial</span>
                <strong>${notaOficial.toFixed(1)}</strong>
            </td>`;

        tr.innerHTML = cells;
        body.appendChild(tr);
    });

    const oldBar = document.getElementById('matrix-notas-save-bar');
    if (oldBar) oldBar.remove();
    if (!isFechado) {
        const wrap = document.querySelector('#screen-materia-hub .atividades-grade-wrapper');
        if (wrap) {
            const bar = document.createElement('div');
            bar.id = 'matrix-notas-save-bar';
            bar.className = 'save-launch-bar matrix-notas-save-bar';
            bar.innerHTML = '<span>Os valores digitados são rascunhos. As somas e a Nota Oficial só mudam depois de salvar.</span><button class="btn-submit-action" type="button" onclick="salvarNotasMatrix()"><i class="fas fa-save"></i> SALVAR LANÇAMENTO</button>';
            wrap.parentElement.appendChild(bar);
        }
    }
    saveStorage();
}
function safeId(value) {
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'");
}

function autoSaveNotaMatrix(aluno, atvId, campo, input, valorAtv) {
    const atv = db.disciplinas[selectedMateria]?.[selectedBimestre]?.atividades?.find(a => a.id === atvId);
    if (!atv) return;
    let valStr=normalizarNotaPlanilha(input, valorAtv);
    const base=atv.notas?.[aluno]||{notaOrig:'',notaRec:''};
    const d=getDraftNota(selectedMateria,selectedBimestre,atvId,aluno,base.notaOrig??'',base.notaRec??'');
    d[campo]=valStr;
    const orig=Number(d.notaOrig)||0,corte=Number(valorAtv)*CONFIG.passingScorePct;
    const recInput=document.getElementById(`rec-matrix-${atv.id}-${safeId(aluno)}`);
    if(recInput){
        recInput.disabled=(d.notaOrig!==''&&orig>=corte)||!!db.configGlobal.bimestresFechados[selectedBimestre];
        if(recInput.disabled&&orig>=corte){d.notaRec='';recInput.value='';}
    }
    // Rascunho apenas: não grava no banco, não recalcula nota final e não altera a soma do bimestre.
}
function autoSaveRecuperacaoBimestralMatrix(input){
    const aluno=input.dataset.aluno,totalSalvo=totalBimestreComDadosSalvos(selectedMateria,selectedBimestre,aluno);
    if(totalSalvo>=CONFIG.limitPoints*CONFIG.passingScorePct){input.value='';return;}
    let raw=normalizarNotaPlanilha(input,CONFIG.limitPoints);
    draftRecBimestral[`${selectedMateria}\u001f${selectedBimestre}\u001f${aluno}`]=raw;
}
function salvarNotasMatrix(){
    const bData=db.disciplinas[selectedMateria]?.[selectedBimestre];
    if(!bData){alert('Selecione a disciplina e o bimestre antes de salvar.');return;}
    if(db.configGlobal.bimestresFechados[selectedBimestre]){alert('Operação bloqueada. Este bimestre está fechado.');return;}
    document.querySelectorAll('#atividades-grade-body .matrix-nota-input, #atividades-grade-body .matrix-rec-input').forEach(input=>{
        const aluno=input.dataset.aluno,atv=bData.atividades.find(a=>a.id===input.dataset.atv);if(!atv)return;
        if(!atv.notas)atv.notas={};if(!atv.notas[aluno])atv.notas[aluno]={notaOrig:'',notaRec:'',notaFinal:0};
        const nd=atv.notas[aluno];
        const raw=String(input.value||'').trim();
        if(raw===''){ nd[input.dataset.campo]=''; } else { const n=Math.max(0,Math.min(Number(atv.valor),Number(raw.replace(',','.'))||0)); nd[input.dataset.campo]=Math.round(n*10)/10; input.value=nd[input.dataset.campo].toFixed(1); }
    });
    (bData.atividades||[]).forEach(recalcularNotasDaAtividade);
    document.querySelectorAll('#atividades-grade-body .rec-bim-matrix-input').forEach(input=>{
        const aluno=input.dataset.aluno,raw=String(input.value||'').replace(',','.').trim(),totalSalvo=totalBimestreComDadosSalvos(selectedMateria,selectedBimestre,aluno);
        if(raw===''||totalSalvo>=CONFIG.limitPoints*CONFIG.passingScorePct)delete bData.recuperacaoBimestral[aluno];
        else bData.recuperacaoBimestral[aluno]=Math.round(Math.max(0,Math.min(CONFIG.limitPoints,Number(raw)||0))*10)/10;
    });
    salvarERetornarInicio('Lançamento de notas salvo com sucesso.');
}

function atualizarResumoAlunoMatrix(aluno) {
    const bData = db.disciplinas[selectedMateria][selectedBimestre];
    const atividades = bData.atividades || [];
    const notaFinalBimestre = atividades.reduce((sum, a) => {
        return sum + (parseFloat(a.notas?.[aluno]?.notaFinal) || 0);
    }, 0);

    const el = document.getElementById(`nota-bimestre-${safeId(aluno)}`);
    if (el) {
        el.textContent = notaFinalBimestre.toFixed(2);
        el.className = notaFinalBimestre >= (CONFIG.limitPoints * CONFIG.passingScorePct)
            ? 'nota-alta'
            : 'nota-baixa';
    }
}

/**
 * SISTEMA DINÂMICO DE LANÇAMENTO E COLORIZAÇÃO DE NOTAS
 */
function openLancarNotas(atvId) {
    selectedAtividadeId = atvId;
    const atv = db.disciplinas[selectedMateria][selectedBimestre].atividades.find(a => a.id === atvId);
    
    document.getElementById('lancar-notas-subtitulo').innerHTML = `
        Avaliação: <strong>${atv.nome}</strong> | Pontuação Máxima: <strong>${atv.valor.toFixed(2)}</strong>
    `;
    
    renderNotasTable(atv);
    navigate('lancar-notas');
}

function renderNotasTable(atv) {
    const corpo = document.getElementById('table-notas-corpo');
    if (!corpo) return;
    corpo.innerHTML = '';

    const isFechado = db.configGlobal.bimestresFechados[selectedBimestre];
    const corteMediaAtv = atv.valor * CONFIG.passingScorePct; // 60% do valor da atividade

    ALUNOS.forEach(aluno => {
        if (!atv.notas[aluno]) {
            atv.notas[aluno] = { notaOrig: "", notaRec: "", notaFinal: 0.0 };
        }

        const nData = atv.notas[aluno];
        const isBlockedRec = (nData.notaOrig !== "" && parseFloat(nData.notaOrig) >= corteMediaAtv);
        const bData = db.disciplinas[selectedMateria][selectedBimestre];
        const somaBimestre = (bData.atividades || []).reduce((sum, a) => sum + (parseFloat(a.notas?.[aluno]?.notaFinal) || 0), 0);
        const recBim = bData.recuperacaoBimestral?.[aluno] ?? '';
        const elegivelRecBim = somaBimestre < (CONFIG.limitPoints * CONFIG.passingScorePct);
        const notaFinalNum = parseFloat(nData.notaFinal || 0);
        const corClasse = notaFinalNum >= corteMediaAtv ? 'nota-alta' : 'nota-baixa';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${getCadastroAluno(aluno).matricula} • ${aluno}</strong><small class="student-enrollment-date">Matrícula: ${formatarDataMatricula(getCadastroAluno(aluno).dataMatricula)}${getCadastroAluno(aluno).dataNascimento ? ` • Nasc.: ${formatarDataNascimento(getCadastroAluno(aluno).dataNascimento)}` : ""}</small></td>
            <td>
                <input type="text" inputmode="decimal" maxlength="6" 
                    value="${nData.notaOrig}" 
                    ${isFechado ? 'disabled' : ''} 
                    data-campo="notaOrig" oninput="autoSaveNotaEngine('${aluno}', 'notaOrig', this, ${atv.valor})" onkeydown="avancarCampoComEnter(event)">
            </td>
            <td>
                <input type="text" inputmode="decimal" maxlength="6" 
                    value="${nData.notaRec}" 
                    id="rec-in-${aluno.replace(/ /g, '_')}" 
                    ${isBlockedRec || isFechado ? 'disabled' : ''} 
                    data-campo="notaRec" oninput="autoSaveNotaEngine('${aluno}', 'notaRec', this, ${atv.valor})" onkeydown="avancarCampoComEnter(event)">
            </td>
            <td id="final-disp-${aluno.replace(/ /g, '_')}" class="${corClasse}">
                ${notaFinalNum.toFixed(1)}
            </td>
            <td class="rec-bim-cell">
                <input type="text" inputmode="decimal" maxlength="6" class="rec-bim-inline-input"
                    value="${recBim}" data-aluno="${escapeAttr(aluno)}" data-rec-bim="1"
                    ${(!elegivelRecBim || isFechado) ? 'disabled' : ''}
                    placeholder="—" title="Recuperação bimestral: até 25,00 pontos"
                    oninput="autoSaveRecuperacaoBimestralInline(this)" onkeydown="avancarCampoComEnter(event)">
            </td>
        `;
        corpo.appendChild(tr);
    });
}

function autoSaveRecuperacaoBimestralInline(input) {
    const aluno=input.dataset.aluno,totalSalvo=totalBimestreComDadosSalvos(selectedMateria,selectedBimestre,aluno);
    if(totalSalvo>=CONFIG.limitPoints*CONFIG.passingScorePct){input.value='';return;}
    let raw=normalizarNotaPlanilha(input,CONFIG.limitPoints);
    draftRecBimestral[`${selectedMateria}\u001f${selectedBimestre}\u001f${aluno}`]=raw;
}

function autoSaveNotaEngine(aluno, campo, input, valorAtv) {
    const atv = db.disciplinas[selectedMateria]?.[selectedBimestre]?.atividades?.find(a => a.id === selectedAtividadeId);
    if(!atv) return;
    let valStr=normalizarNumeroDigitado(input.value,2); input.value=valStr; limitarValorInputPontos(input,valorAtv); valStr=input.value;
    const base=atv.notas?.[aluno]||{notaOrig:'',notaRec:''};
    const d=getDraftNota(selectedMateria,selectedBimestre,atv.id,aluno,base.notaOrig??'',base.notaRec??'');
    d[campo]=valStr;
    const orig=Number(d.notaOrig)||0, corte=Number(valorAtv)*CONFIG.passingScorePct;
    const recInput=document.getElementById(`rec-in-${aluno.replace(/ /g,'_')}`);
    if(recInput){recInput.disabled=(d.notaOrig!==''&&orig>=corte)||!!db.configGlobal.bimestresFechados[selectedBimestre];if(recInput.disabled&&orig>=corte){d.notaRec='';recInput.value='';}}
    // Não recalcula/exibe nova soma até o SALVAR LANÇAMENTO.
}
function salvarNotasAtividadeSelecionada(){
    const atv=db.disciplinas[selectedMateria]?.[selectedBimestre]?.atividades?.find(a=>a.id===selectedAtividadeId);
    if(!atv){alert('Atividade não encontrada.');return;}
    const isFechado=!!db.configGlobal.bimestresFechados[selectedBimestre]; if(isFechado){alert('Operação bloqueada. Este bimestre está fechado.');return;}
    document.querySelectorAll('#table-notas-corpo tr').forEach(row=>{
        const first=row.querySelector('td'); if(!first)return;
        const orig=row.querySelector('input[data-campo="notaOrig"]'),rec=row.querySelector('input[data-campo="notaRec"]');
        const aluno=orig?.dataset?.aluno || rec?.dataset?.aluno; if(!aluno)return;
        if(!atv.notas)atv.notas={}; if(!atv.notas[aluno])atv.notas[aluno]={notaOrig:'',notaRec:'',notaFinal:0};
        const nd=atv.notas[aluno]; nd.notaOrig=orig&&String(orig.value).trim()!==''?Math.max(0,Math.min(Number(atv.valor),Number(String(orig.value).replace(',','.'))||0)):''; nd.notaRec=rec&&String(rec.value).trim()!==''?Math.max(0,Math.min(Number(atv.valor),Number(String(rec.value).replace(',','.'))||0)):'';
    });
    recalcularNotasDaAtividade(atv);
    const bData=db.disciplinas[selectedMateria][selectedBimestre];
    if(!bData.recuperacaoBimestral)bData.recuperacaoBimestral={};
    document.querySelectorAll('#table-notas-corpo input[data-rec-bim="1"]').forEach(input=>{
        const aluno=input.dataset.aluno,raw=String(input.value||'').replace(',','.').trim(),totalSalvo=totalBimestreComDadosSalvos(selectedMateria,selectedBimestre,aluno);
        if(raw==='' || totalSalvo>=CONFIG.limitPoints*CONFIG.passingScorePct)delete bData.recuperacaoBimestral[aluno];
        else bData.recuperacaoBimestral[aluno]=Math.round(Math.max(0,Math.min(CONFIG.limitPoints,Number(raw)||0))*10)/10;
    });
    salvarERetornarInicio('Lançamento de notas salvo com sucesso.');
}

/**
 * VISÃO GERAL DE NOTAS (SOMA DIRETA E RECUPERAÇÃO ANUAL)
 */
function openVerNotas() {
    const corpo=document.getElementById('table-visao-corpo');if(!corpo)return;corpo.innerHTML='';
    ALUNOS.forEach(aluno=>{
        const detalhe=getResultadoFinalAluno(aluno),somas={1:getNotaFinalBimestre(selectedMateria,1,aluno),2:getNotaFinalBimestre(selectedMateria,2,aluno),3:getNotaFinalBimestre(selectedMateria,3,aluno),4:getNotaFinalBimestre(selectedMateria,4,aluno)},final=detalhe.disciplinas[selectedMateria]?.final ?? somas[1]+somas[2]+somas[3]+somas[4];
        const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(aluno)}</strong></td><td class="${classeNotaPercentual(somas[1],25)}">${somas[1].toFixed(2)}</td><td class="${classeNotaPercentual(somas[2],25)}">${somas[2].toFixed(2)}</td><td class="${classeNotaPercentual(somas[3],25)}">${somas[3].toFixed(2)}</td><td class="${classeNotaPercentual(somas[4],25)}">${somas[4].toFixed(2)}</td><td class="${classeNotaPercentual(final,100)}" style="font-size:0.9rem;">${final.toFixed(1)}</td>`;corpo.appendChild(tr);
    });
    navigate('ver-notas');
}

/**
 * SEÇÃO DE RECUPERAÇÃO BIMESTRAL INTEGRADA
 */
function openRecuperacaoBimestral() {
    const corpo=document.getElementById('table-rec-bim-corpo'); if(!corpo)return;
    const bData=db.disciplinas[selectedMateria][selectedBimestre],isFechado=!!db.configGlobal.bimestresFechados[selectedBimestre];
    limparRascunhosLancamento(); corpo.innerHTML='';
    ALUNOS.forEach(aluno=>{
        const notaOrigBimestre=bData.atividades.reduce((sum,a)=>sum+(parseFloat(a.notas?.[aluno]?.notaFinal)||0),0);
        if(notaOrigBimestre<CONFIG.limitPoints*CONFIG.passingScorePct){
            const current=getDraftRecBim(selectedMateria,selectedBimestre,aluno,bData.recuperacaoBimestral?.[aluno] ?? '');
            const final=calcularResultadoRecuperacao(notaOrigBimestre,current,CONFIG.limitPoints);
            const tr=document.createElement('tr');
            tr.innerHTML=`<td><strong>${escapeHtml(aluno)}</strong></td><td class="${classeNotaPercentual(notaOrigBimestre,CONFIG.limitPoints)}">${notaOrigBimestre.toFixed(2)}</td><td><input type="text" inputmode="decimal" maxlength="6" value="${escapeAttr(current)}" ${isFechado?'disabled':''} data-aluno="${escapeAttr(aluno)}" data-max="25" class="rec-bim-screen-input" oninput="atualizarRecBimestralScreen(this)" onkeydown="avancarCampoComEnter(event)"></td><td id="rec-bim-final-${safeId(aluno)}" class="${classeNotaPercentual(final,CONFIG.limitPoints)}">${final.toFixed(1)}</td>`;
            corpo.appendChild(tr);
        }
    });
    if(corpo.innerHTML==='')corpo.innerHTML=`<tr><td colspan="4" style="text-align:center;color:var(--text-light);padding:20px;">Nenhum aluno em recuperação neste bimestre. Todos atingiram média ≥ 15,00.</td></tr>`;
    const table=corpo.closest('table');
    if(table&&!document.getElementById('btn-salvar-rec-bim-screen')&&!isFechado){
        const bar=document.createElement('div');bar.className='save-launch-bar';bar.innerHTML='<span>Confira os lançamentos antes de gravar.</span><button id="btn-salvar-rec-bim-screen" class="btn-submit-action" type="button" onclick="salvarRecBimestralScreen()"><i class="fas fa-save"></i> SALVAR LANÇAMENTO</button>';table.parentElement.appendChild(bar);
    }
    navigate('rec-bimestral');
}
function atualizarRecBimestralScreen(input){
    const raw0=normalizarNumeroDigitado(input.value,2); input.value=raw0; limitarValorInputPontos(input,CONFIG.limitPoints); const raw=input.value;
    draftRecBimestral[`${selectedMateria}\u001f${selectedBimestre}\u001f${input.dataset.aluno}`]=raw;
    // Não altera a nota final exibida antes do salvamento.
}
function salvarRecBimestralScreen(){
    const bData=db.disciplinas[selectedMateria][selectedBimestre]; if(!bData.recuperacaoBimestral)bData.recuperacaoBimestral={};
    document.querySelectorAll('#table-rec-bim-corpo .rec-bim-screen-input').forEach(input=>{
        const aluno=input.dataset.aluno,raw=String(input.value||'').replace(',','.').trim(),notaOrigBimestre=(bData.atividades||[]).reduce((sum,a)=>sum+(parseFloat(a.notas?.[aluno]?.notaFinal)||0),0);
        if(raw==='' || notaOrigBimestre>=CONFIG.limitPoints*CONFIG.passingScorePct)delete bData.recuperacaoBimestral[aluno];
        else bData.recuperacaoBimestral[aluno]=Math.round(Math.max(0,Math.min(CONFIG.limitPoints,Number(raw)||0))*10)/10;
    });
    salvarERetornarInicio('Recuperação bimestral salva com sucesso.');
}

/**
 * SEÇÃO DE RECUPERAÇÃO ANUAL (LIBERADA APÓS O FECHAMENTO DE TODOS OS BIMESTRES)
 */
function openRecuperacaoAnual() {
    const todosFechados=[1,2,3,4].every(b=>db.configGlobal.bimestresFechados[b]);if(!todosFechados){alert('A Recuperação Anual fica disponível somente após o fechamento de todos os 4 bimestres.');return;}
    const corpo=document.getElementById('table-rec-anual-corpo');if(!corpo)return;
    const recAnualObj=db.disciplinas[selectedMateria].recuperacaoAnual||{};limparRascunhosLancamento();corpo.innerHTML='';
    ALUNOS.forEach(aluno=>{
        const totalAnual=calcularTotalAnualComRecuperacoes(selectedMateria,aluno),faltas=totalFaltasDisciplina(aluno,selectedMateria),limite=LIMITES_FALTAS_DISCIPLINA[selectedMateria]??Infinity,porFalta=faltas>limite;
        if(totalAnual<60||porFalta){
            const current=getDraftRecAnual(selectedMateria,aluno,recAnualObj[aluno]!==undefined?recAnualObj[aluno]:''),base=porFalta?0:totalAnual,final=calcularResultadoRecuperacao(base,current,100);
            const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${escapeHtml(aluno)}</strong></td><td class="${classeNotaPercentual(base,100)}">${base.toFixed(2)}</td><td>${faltas}</td><td><input type="text" inputmode="decimal" maxlength="7" value="${escapeAttr(current)}" data-aluno="${escapeAttr(aluno)}" class="rec-anual-screen-input" data-total="${base}" oninput="atualizarRecAnualScreen(this)" onkeydown="avancarCampoComEnter(event)"></td><td id="rec-anual-final-${safeId(aluno)}" class="${classeNotaPercentual(final,100)}">${final.toFixed(1)}</td>`;corpo.appendChild(tr);
        }
    });
    if(corpo.innerHTML==='')corpo.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:20px;">Nenhum aluno em recuperação anual nesta disciplina.</td></tr>';
    const table=corpo.closest('table');if(table&&!document.getElementById('btn-salvar-rec-anual-screen')){const bar=document.createElement('div');bar.className='save-launch-bar';bar.innerHTML='<span>Confira os lançamentos antes de gravar.</span><button id="btn-salvar-rec-anual-screen" class="btn-submit-action" type="button" onclick="salvarRecAnualScreen()"><i class="fas fa-save"></i> SALVAR LANÇAMENTO</button>';table.parentElement.appendChild(bar);}
    navigate('rec-anual');
}
function atualizarRecAnualScreen(input){
    const raw=normalizarNumeroDigitado(input.value,2);input.value=raw;draftRecAnual[`${selectedMateria}\u001f${input.dataset.aluno}`]=raw;
    const total=Number(input.dataset.total)||0,final=calcularResultadoRecuperacao(total,raw,100),cell=document.getElementById(`rec-anual-final-${safeId(input.dataset.aluno)}`);
    if(cell){cell.textContent=final.toFixed(1);cell.className=classeNotaPercentual(final,100);}
}
function salvarRecAnualScreen(){
    if(!db.disciplinas[selectedMateria].recuperacaoAnual)db.disciplinas[selectedMateria].recuperacaoAnual={};
    document.querySelectorAll('#table-rec-anual-corpo .rec-anual-screen-input').forEach(input=>{const aluno=input.dataset.aluno,raw=String(input.value||'').replace(',','.').trim();if(raw==='')delete db.disciplinas[selectedMateria].recuperacaoAnual[aluno];else db.disciplinas[selectedMateria].recuperacaoAnual[aluno]=Math.max(0,Math.min(100,Number(raw)||0));});
    salvarERetornarInicio('Recuperação anual salva com sucesso.');
}

/**
 * OPERAÇÃO CENTRAL DE FECHAMENTO E REABERTURA GLOBAL
 */
function renderFechamentoGlobalScreen() {
    const currentActiveBim = db.configGlobal.currentBimestre;
    const txtBim = document.getElementById('admin-current-bimestre-text');
    
    if (txtBim) {
        txtBim.textContent = currentActiveBim <= 4 ? `${currentActiveBim}º Bimestre Ativo` : "Ano Letivo Encerrado Completamente";
    }

    // Atualiza o estado visual dos passos na tela com a opção de Reabrir
    for (let b = 1; b <= 4; b++) {
        const stepBox = document.getElementById(`step-b${b}`);
        const statusTxt = document.getElementById(`txt-status-b${b}`);
        const actionCol = document.getElementById(`action-step-b${b}`);
        const isFechado = db.configGlobal.bimestresFechados[b];
        
        if (stepBox && statusTxt) {
            stepBox.className = "timeline-step-box";
            if (actionCol) actionCol.innerHTML = '';

            if (isFechado) {
                stepBox.classList.add('completed');
                stepBox.querySelector('.step-indicator').innerHTML = '<i class="fas fa-check-circle" style="color:var(--success)"></i>';
                statusTxt.textContent = "Fechado - Todas as matérias bloqueadas";

                // Adiciona o botão de reabertura caso seja o último bimestre fechado
                if (b === currentActiveBim - 1 || (currentActiveBim > 4 && b === 4)) {
                    if (actionCol) {
                        const btnReabrir = document.createElement('button');
                        btnReabrir.className = "btn-reabrir-step";
                        btnReabrir.innerHTML = `<i class="fas fa-lock-open"></i> Reabrir`;
                        btnReabrir.onclick = () => executeReabrirBimestreProcedure(b);
                        actionCol.appendChild(btnReabrir);
                    }
                }
            } else if (b === currentActiveBim) {
                stepBox.classList.add('active-step');
                stepBox.querySelector('.step-indicator').innerHTML = '<i class="fas fa-unlock-alt" style="color:var(--primary)"></i>';
                statusTxt.textContent = "Aberto para digitação e alterações gerais";
            } else {
                stepBox.classList.add('locked');
                stepBox.querySelector('.step-indicator').innerHTML = '<i class="fas fa-lock" style="color:var(--text-light)"></i>';
                statusTxt.textContent = "Aguardando encerramento do período anterior";
            }
        }
    }

    // Injeção dinâmica do botão de fechamento unificado
    const btnContainer = document.getElementById('container-botao-fechamento');
    if (!btnContainer) return;
    btnContainer.innerHTML = '';

    if (currentActiveBim <= 4) {
        const btn = document.createElement('button');
        btn.className = "btn-submit-action";
        btn.style.backgroundColor = "var(--danger)";
        btn.innerHTML = `<i class="fas fa-lock"></i> Fechar ${currentActiveBim}º Bimestre Global (Bloquear Tudo)`;
        btn.onclick = () => executeGlobalClosureProcedure(currentActiveBim);
        btnContainer.appendChild(btn);
    } else {
        btnContainer.innerHTML = `
            <div class="info-alert" style="border-left-color: var(--success); background-color: rgba(16,185,129,0.1); color: var(--success);">
                <i class="fas fa-graduation-cap"></i> Ano Letivo de 2026 encerrado com sucesso! Todos os relatórios e recuperações estão consolidados.
            </div>
        `;
    }
}

function executeGlobalClosureProcedure(bimestreParaFechar) {
    const msgConfirm = `ATENÇÃO PROFESSORA!\nDeseja fechar o ${bimestreParaFechar}º Bimestre de TODAS as matérias simultaneamente?\n\nEsta ação congelará as notas atuais e abrirá o próximo período.`;
    
    if (confirm(msgConfirm)) {
        db.configGlobal.bimestresFechados[bimestreParaFechar] = true;
        db.configGlobal.currentBimestre = bimestreParaFechar + 1;
        saveStorage();
        if (typeof renderLancamentoSeletorHome === 'function') renderLancamentoSeletorHome('');
        alert(`Sucesso! O ${bimestreParaFechar}º Bimestre foi trancado em todas as disciplinas.`);
        renderFechamentoGlobalScreen();
    }
}

function executeReabrirBimestreProcedure(bimestreParaReabrir) {
    const msgConfirm = `Deseja reabrir o ${bimestreParaReabrir}º Bimestre para edições em todas as disciplinas?`;
    
    if (confirm(msgConfirm)) {
        db.configGlobal.bimestresFechados[bimestreParaReabrir] = false;
        db.configGlobal.currentBimestre = bimestreParaReabrir;
        saveStorage();
        if (typeof renderLancamentoSeletorHome === 'function') renderLancamentoSeletorHome('');
        alert(`O ${bimestreParaReabrir}º Bimestre foi reaberto com sucesso!`);
        renderFechamentoGlobalScreen();
    }
}

/**
 * EXPORTAÇÃO EM FORMATO DE TABELA - UMA FOLHA EXCLUSIVA POR ALUNO
 */
function exportBoletimCompletoPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    let imgLogo = null;
    const imgEl = document.getElementById('img-brasao-base64');
    if (imgEl && imgEl.complete && imgEl.naturalWidth !== 0) {
        try {
            const canvas = document.createElement("canvas");
            canvas.width = imgEl.naturalWidth; canvas.height = imgEl.naturalHeight;
            canvas.getContext("2d").drawImage(imgEl, 0, 0);
            imgLogo = canvas.toDataURL("image/png");
        } catch(e) { console.error("Erro no processamento do Brasão", e); }
    }

    const todosFechados = [1, 2, 3, 4].every(b => db.configGlobal.bimestresFechados[b]);

    ALUNOS.forEach((aluno, index) => {
        if (index > 0) doc.addPage();

        // Cabeçalho Oficial Estruturado
        if (imgLogo) doc.addImage(imgLogo, 'PNG', 14, 12, 18, 18);
        doc.setFont("helvetica", "bold"); doc.setFontSize(13);
        doc.text(CONFIG.schoolName, 36, 18);
        doc.setFontSize(9); doc.setFont("helvetica", "normal");
        doc.text(`Turma: ${CONFIG.turmaName}  |  Ano: ${CONFIG.ano}  |  Filtro por Disciplina: ${selectedMateria.toUpperCase()}`, 36, 24);
        
        doc.setLineWidth(0.3); doc.setDrawColor(71, 85, 105);
        doc.line(14, 32, 196, 32);

        doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        doc.text(`BOLETIM DE APROVEITAMENTO EM TABELA CONSOLIDADA`, 14, 40);
        doc.setFont("helvetica", "normal"); doc.setFontSize(10);
        doc.text(`Estudante: `, 14, 46); doc.setFont("helvetica", "bold"); doc.text(aluno, 34, 46);

        const tableBody = [];
        let totalAcumuladoGeral = 0;

        for (let b = 1; b <= 4; b++) {
            const bData = db.disciplinas[selectedMateria][b];
            
            bData.atividades.forEach(a => {
                const nD = a.notas[aluno] || { notaOrig: 0, notaRec: "", notaFinal: 0 };
                tableBody.push([
                    `${b}º Bimestre`,
                    a.nome,
                    a.valor.toFixed(2),
                    nD.notaOrig !== "" ? parseFloat(nD.notaOrig).toFixed(2) : "0.00",
                    nD.notaRec !== "" ? parseFloat(nD.notaRec).toFixed(2) : "---",
                    parseFloat(nD.notaFinal).toFixed(2)
                ]);
            });

            let totalBimVal = bData.atividades.reduce((sum, a) => sum + (parseFloat(a.notas[aluno]?.notaFinal) || 0), 0);
            let rbVal = "---";
            let finalBimVal = totalBimVal;

            if (totalBimVal < 15.00 && bData.recuperacaoBimestral[aluno] !== undefined) {
                let recB = parseFloat(bData.recuperacaoBimestral[aluno]) || 0;
                rbVal = recB.toFixed(2);
                if (recB >= 15.00) finalBimVal = 15.00;
                else finalBimVal = Math.max(totalBimVal, recB);
            }

            totalAcumuladoGeral += finalBimVal;

            // Injeta subtotal estruturado do bimestre na tabela
            tableBody.push([
                { content: `SOMA FECHAMENTO DO ${b}º BIMESTRE`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
                { content: "25,00", styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
                { content: totalBimVal.toFixed(2), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
                { content: rbVal, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
                // Azul da tabela pdf corrigido para [43, 78, 128] que equivale a #2b353e
                { content: finalBimVal.toFixed(2), styles: { fontStyle: 'bold', fillColor: [224, 242, 254], textColor: [43, 78, 128] } }
            ]);
        }

        // Recuperação Anual na Tabela PDF
        let finalComRecAnualPDF = totalAcumuladoGeral;
        let recAnualVal = db.disciplinas[selectedMateria]?.recuperacaoAnual?.[aluno];
        if (todosFechados && totalAcumuladoGeral < 60.00 && recAnualVal !== undefined && recAnualVal !== "") {
            let rAnualNum = parseFloat(recAnualVal) || 0;
            if (rAnualNum >= 60.00) finalComRecAnualPDF = 60.00;
            else finalComRecAnualPDF = Math.max(totalAcumuladoGeral, rAnualNum);

            tableBody.push([
                { content: `RECUPERAÇÃO ANUAL`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
                { content: "100.00", styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
                { content: totalAcumuladoGeral.toFixed(2), styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
                { content: rAnualNum.toFixed(2), styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
                { content: finalComRecAnualPDF.toFixed(2), styles: { fontStyle: 'bold', fillColor: [254, 243, 199], textColor: [217, 119, 6] } }
            ]);
        }

        // Rodapé final de fechamento anual dentro da matriz de tabelas
        tableBody.push([
            { content: `PONTUAÇÃO ACUMULADA DA DISCIPLINA NO ANO`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [15, 23, 42], textColor: [255, 255, 255] } },
            { content: "100.00", styles: { fontStyle: 'bold', fillColor: [15, 23, 42], textColor: [255, 255, 255] } },
            { content: "", colSpan: 2, styles: { fillColor: [15, 23, 42] } },
            { content: finalComRecAnualPDF.toFixed(2), styles: { fontStyle: 'bold', fillColor: [47, 107, 80], textColor: [255, 255, 255], fontSize: 10 } }
        ]);

        doc.autoTable({
            startY: 52,
            head: [['Período', 'Atividade Cadastrada', 'Valor Máx.', 'Nota Aluno', 'Nota Rec.', 'Aproveitamento']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
            styles: { fontSize: 6.7, halign: 'center', valign: 'middle' },
            columnStyles: { 0: { halign: 'left', cellWidth: 26 }, 1: { halign: 'left' } }
        });

        let finalY = doc.lastAutoTable.finalY + 35;
        if(finalY > 260) { doc.addPage(); finalY = 40; }
        
        doc.setLineWidth(0.2); doc.setDrawColor(148, 163, 184);
        doc.line(20, finalY, 90, finalY); doc.line(120, finalY, 190, finalY);
        doc.setFontSize(8.5); doc.text("Assinatura do(a) Docente", 38, finalY + 5);
        doc.text("Assinatura da Coordenação / Direção", 132, finalY + 5);
    });

    doc.save(`boletins_tabelados_${selectedMateria.toLowerCase()}_2026.pdf`);
}

function abrirAtaResultadosFinais(){
    navigate('ata-resultados-finais');
    renderAtaResultadosFinais();
}
function renderAtaResultadosFinais(){
    const head=document.getElementById('ata-resultados-head'),body=document.getElementById('ata-resultados-corpo');if(!head||!body)return;
    head.innerHTML=`<tr><th rowspan="2">Nº</th><th rowspan="2" class="ata-aluno">NOME DO(A) ALUNO(A)</th>${DISCIPLINAS.map(d=>`<th colspan="2" class="ata-subject-head">${escapeHtml(d.toUpperCase())}</th>`).join('')}<th rowspan="2">RESULTADO FINAL</th></tr><tr>${DISCIPLINAS.map(()=>'<th class="ata-res-col">RES.</th><th class="ata-fal-col">FAL.</th>').join('')}</tr>`;
    body.innerHTML=ALUNOS.map((aluno,i)=>{
        const r=getResultadoFinalAluno(aluno);
        const cols=DISCIPLINAS.map(d=>{const f=r.disciplinas[d];return `<td class="${classeNotaPercentual(f.final,100)}">${Number(f.final).toFixed(2)}</td><td>${f.faltas}</td>`;}).join('');
        return `<tr><td>${i+1}</td><td class="ata-aluno"><strong>${escapeHtml(aluno)}</strong></td>${cols}<td class="${r.resultado==='APROVADO'?'nota-alta':(r.resultado==='REPROVADO'?'nota-baixa':'')}"><strong>${r.resultado}</strong></td></tr>`;
    }).join('');
}
function gerarAtaResultadosFinaisPDF(){
    const {jsPDF}=window.jspdf;if(!jsPDF){alert('O gerador de PDF não está disponível.');return;}
    const doc=new jsPDF('l','mm','a3');
    let imgLogo=null;const imgEl=document.getElementById('img-brasao-base64');
    if(imgEl&&imgEl.complete&&imgEl.naturalWidth!==0){try{const canvas=document.createElement('canvas');canvas.width=imgEl.naturalWidth;canvas.height=imgEl.naturalHeight;canvas.getContext('2d').drawImage(imgEl,0,0);imgLogo=canvas.toDataURL('image/png');}catch(e){}}
    if(imgLogo)doc.addImage(imgLogo,'PNG',12,10,18,18);
    doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('ATA DE RESULTADO FINAL',36,16);
    doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text('SECRETARIA MUNICIPAL DE EDUCAÇÃO',36,21);doc.text(CONFIG.schoolNameFull,36,26);
    doc.text(`ANO: ${CONFIG.ano} · TURMA: ${CONFIG.turmaName}`,36,31);
    doc.text('Endereço: Praça Tiradentes, nº 88, Centro · Abre Campo - MG · CEP 35365-000',36,36);
    const head1=['Nº','NOME DO(A) ALUNO(A)'];DISCIPLINAS.forEach(d=>head1.push(d.toUpperCase(),''));head1.push('RESULTADO FINAL');
    const head2=['',''];DISCIPLINAS.forEach(()=>head2.push('RES.','FAL.'));head2.push('');
    const body=ALUNOS.map((aluno,i)=>{const r=getResultadoFinalAluno(aluno);const row=[String(i+1),aluno];DISCIPLINAS.forEach(d=>{const f=r.disciplinas[d];row.push(f.final.toFixed(1),String(f.faltas));});row.push(r.resultado);return row;});
    doc.autoTable({startY:43,head:[head1,head2],body,theme:'grid',styles:{fontSize:5.4,cellPadding:1.5,halign:'center',valign:'middle',overflow:'ellipsize'},headStyles:{fontSize:5.3,fontStyle:'bold',halign:'center',valign:'middle'},columnStyles:{0:{cellWidth:8},1:{cellWidth:46,halign:'left',fontStyle:'bold',overflow:'ellipsize'}},didParseCell:data=>{if(data.section==='body'){const idx=data.column.index;if(idx>=2&&idx<2+DISCIPLINAS.length*2&&idx%2===0&&parseFloat(data.cell.raw)<60)data.cell.styles.textColor=[176,0,0];const last=2+DISCIPLINAS.length*2;if(idx===last){if(data.cell.raw==='REPROVADO')data.cell.styles.textColor=[176,0,0];else if(data.cell.raw==='APROVADO')data.cell.styles.textColor=[17,17,17];}}}});
    const y=(doc.lastAutoTable?.finalY||190)+8;doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.text(`Critérios registrados no sistema: 200 dias letivos; frequência geral mínima de 75%; limites de faltas por disciplina e recuperação final conforme regras cadastradas.`,12,y);
    doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')} · Portal do Professor`,410,y,{align:'right'});
    doc.save(`ata_resultados_finais_${CONFIG.ano}_${String(CONFIG.turmaName).replace(/\s+/g,'_')}.pdf`);
}

/**
 * SISTEMA COMPLEMENTAR ANALÍTICO DE ESTATÍSTICAS (MÉDIAS DE RENDIMENTO)
 */
function generateAnalyticalDashboard() {
    const deck = document.getElementById('analytics-deck');
    if (!deck) return;
    deck.innerHTML = '';

    let totalNotasGerais = 0;
    let totalLancamentos = 0;
    let alunosAbaixoMedia = 0;

    ALUNOS.forEach(aluno => {
        DISCIPLINAS.forEach(m => {
            for (let b = 1; b <= 4; b++) {
                const atvs = db.disciplinas[m][b].atividades;
                atvs.forEach(a => {
                    const score = parseFloat(a.notas[aluno]?.notaFinal || 0);
                    totalNotasGerais += score;
                    totalLancamentos++;
                    if (score < (a.valor * CONFIG.passingScorePct)) alunosAbaixoMedia++;
                });
            }
        });
    });

    const mediaGeralTurma = totalLancamentos > 0 ? (totalNotasGerais / totalLancamentos) : 0;

    deck.innerHTML = `
        <div class="disciplina-card" style="padding:15px; background:var(--primary-light); border-color:var(--primary)">
            <span style="font-size:0.75rem; color:var(--text-light)">Média Geral da Turma</span>
            <h4 style="font-size:1.6rem; color:var(--primary)">${mediaGeralTurma.toFixed(2)}</h4>
        </div>
        <div class="disciplina-card" style="padding:15px; background:rgba(16,185,129,0.1); border-color:#10b981">
            <span style="font-size:0.75rem; color:var(--text-light)">Total de Notas Lançadas</span>
            <h4 style="font-size:1.6rem; color:#10b981">${totalLancamentos}</h4>
        </div>
    `;

    // Injeção de Gráfico de Rendimento Coletivo via ChartJS
    setTimeout(() => {
        const ctx = document.getElementById('main-analytics-chart');
        if (!ctx) return;
        if (myChartInstance) myChartInstance.destroy();

        const dataMedias = DISCIPLINAS.map(m => {
            let somaM = 0, qtdM = 0;
            ALUNOS.forEach(a => {
                for(let b=1; b<=4; b++) {
                    db.disciplinas[m][b].atividades.forEach(atv => {
                        somaM += parseFloat(atv.notas[a]?.notaFinal || 0);
                        qtdM++;
                    });
                }
            });
            return qtdM > 0 ? (somaM / qtdM) : 0;
        });

        myChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: DISCIPLINAS,
                datasets: [{
                    label: 'Média de Notas por Componente Curricular',
                    data: dataMedias,
                    backgroundColor: '#2b353e', // Corrigido para o novo azul
                    borderRadius: 0 // Bordas Retas no Gráfico também
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, max: 25 } }
            }
        });
    }, 100);
}

/**
 * SISTEMA COMPLEMENTAR UTILIÁRIO (FILTROS, MODELOS E BACKUPS)
 */
function filterTable(tbodyId, query) {
    const rows = document.getElementById(tbodyId).getElementsByTagName('tr');
    const cleanQuery = query.toUpperCase();
    for (let i = 0; i < rows.length; i++) {
        const td = rows[i].getElementsByTagName('td')[0];
        if (td) {
            const txt = td.textContent || td.innerText;
            rows[i].style.display = txt.toUpperCase().indexOf(cleanQuery) > -1 ? "" : "none";
        }
    }
}

function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    const icon = document.getElementById('theme-icon');
    if (body.classList.contains('dark-mode')) {
        if(icon) icon.className = "fas fa-sun";
        localStorage.setItem("theme_sige", "dark");
    } else {
        if(icon) icon.className = "fas fa-moon";
        localStorage.setItem("theme_sige", "light");
    }
}

function applyThemeLoad() {
    if (localStorage.getItem("theme_sige") === "dark") {
        document.body.classList.add('dark-mode');
        const icon = document.getElementById('theme-icon');
        if(icon) icon.className = "fas fa-sun";
    }
}

function openAjudaModal() { document.getElementById('help-modal').style.display = 'flex'; }
function closeAjudaModal() { document.getElementById('help-modal').style.display = 'none'; }

function exportBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const dlNode = document.createElement('a');
    dlNode.setAttribute("href", dataStr);
    dlNode.setAttribute("download", `portal_professor_backup_portal_professor_2026.json`);
    dlNode.click();
}

function importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const parsed = JSON.parse(evt.target.result);
            if (parsed.disciplinas && parsed.configGlobal) {
                db = parsed;
                saveStorage();
                alert("Base de dados importada e sincronizada com sucesso!");
                location.reload();
            } else {
                alert("Erro: Arquivo JSON incompatível com o Portal do Professor.");
            }
        } catch(err) { alert("Arquivo corrompido ou inválido."); }
    };
    reader.readAsText(file);
}

function cleanAllSystemData() {
    if (confirm("⚠️ ALERTA MÁXIMO:\nDeseja deletar todas as informações do aparelho? Isso limpará o histórico completo de 2026.")) {
        localStorage.removeItem(DB_KEY);
        location.reload();
    }
}


/*******************************************************************************
 * MÓDULO: BOLETIM INDIVIDUAL
 ******************************************************************************/

function renderBoletimIndividualList() {
    const corpo = document.getElementById('table-boletim-corpo');
    if (!corpo) return;
    corpo.innerHTML = '';

    ALUNOS.forEach(aluno => {
        const tr = document.createElement('tr');
        const ficha = obterFichaRendimentoAluno(aluno);
        const totais = DISCIPLINAS.map(m => ficha[m].totalAnual);
        const mediaGeral = totais.length ? totais.reduce((a,b)=>a+b,0) / (totais.length * 4) : 0;
        const cadastro = getCadastroAluno(aluno);
        tr.innerHTML = `
            <td class="boletim-student-cell">
                <div class="boletim-student-avatar"><i class="fas fa-user-graduate"></i></div>
                <div><strong>${cadastro.matricula} • ${aluno}</strong><small>${CONFIG.turmaName} · Média geral: <b>${mediaGeral.toFixed(2)}</b></small></div>
            </td>
            <td class="boletim-actions-cell">
                <button class="btn-action-atv boletim-pdf-btn" onclick="gerarBoletimPDF('${aluno}')"><i class="fas fa-file-pdf"></i><span>Gerar boletim</span></button>
            </td>
        `;
        corpo.appendChild(tr);
    });
}

function obterFichaRendimentoAluno(aluno) {
    const ficha={};
    const todosFechados=[1,2,3,4].every(b=>db.configGlobal.bimestresFechados[b]);
    const resultado=getResultadoFinalAluno(aluno);
    DISCIPLINAS.forEach(m=>{
        ficha[m]={somas:{1:0,2:0,3:0,4:0},faltas:{1:0,2:0,3:0,4:0},totalFaltas:0,totalAnual:0,media:0,situacao:''};
        for(let b=1;b<=4;b++){ficha[m].somas[b]=getNotaFinalBimestre(m,b,aluno);ficha[m].faltas[b]=obterFaltasAlunoDisciplina(aluno,m,b);ficha[m].totalFaltas+=ficha[m].faltas[b];}
        const det=resultado.disciplinas[m];
        ficha[m].totalAnual=det.final; ficha[m].media=ficha[m].totalAnual/4;
        if(!todosFechados)ficha[m].situacao='Em Curso';
        else if(det.excessoFalta&&det.abaixoNota)ficha[m].situacao='Reprovado';
        else if(det.recuperacao&&det.final<60)ficha[m].situacao='Recuperação';
        else ficha[m].situacao='Aprovado';
    });
    return ficha;
}

function adicionarPaginaBoletim(doc, aluno, imgLogo) {
    // Boletim redesenhado em A4 paisagem para melhor leitura da tabela anual.
    const W = 297, H = 210;
    doc.setFillColor(248, 249, 250); doc.rect(0, 0, W, H, 'F');
    doc.setDrawColor(43, 78, 128); doc.setLineWidth(1.2); doc.roundedRect(8, 8, W-16, H-16, 3, 3);
    doc.setDrawColor(212, 175, 55); doc.setLineWidth(0.45); doc.roundedRect(10, 10, W-20, H-20, 2, 2);

    if (imgLogo) doc.addImage(imgLogo, 'PNG', 16, 16, 22, 22);
    doc.setFont('helvetica','bold'); doc.setTextColor(37,42,48); doc.setFontSize(13);
    doc.text('PREFEITURA MUNICIPAL DE ABRE CAMPO', 45, 20);
    doc.setFontSize(8.5); doc.setTextColor(90,100,110); doc.text('SECRETARIA MUNICIPAL DE EDUCAÇÃO', 45, 25);
    doc.setFontSize(10.5); doc.setTextColor(43,78,128); doc.text(CONFIG.schoolNameFull, 45, 31);

    doc.setFillColor(43,78,128); doc.roundedRect(15, 40, 267, 13, 2, 2, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.setTextColor(255,255,255);
    doc.text('BOLETIM DE RENDIMENTO ESCOLAR', 22, 48.5);
    doc.setFontSize(8); doc.text(`ANO LETIVO ${CONFIG.ano}`, 275, 48.5, {align:'right'});

    const cadastro = getCadastroAluno(aluno);
    doc.setFillColor(255,255,255); doc.setDrawColor(210,216,222); doc.setLineWidth(.35); doc.roundedRect(15,57,267,22,2,2,'FD');
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(95,105,115);
    doc.text('ESTUDANTE',22,65); doc.text('MATRÍCULA',170,65); doc.text('TURMA',225,65);
    doc.setFontSize(10); doc.setTextColor(37,42,48); doc.text(aluno,22,72); doc.setFontSize(8.5); doc.text(String(cadastro.matricula),170,72); doc.text(CONFIG.turmaName,225,72);

    const ficha = obterFichaRendimentoAluno(aluno);
    const body = DISCIPLINAS.map(m=>{const f=ficha[m];return [m,f.somas[1].toFixed(1),String(f.faltas[1]),f.somas[2].toFixed(1),String(f.faltas[2]),f.somas[3].toFixed(1),String(f.faltas[3]),f.somas[4].toFixed(1),String(f.faltas[4]),f.totalAnual.toFixed(1),f.media.toFixed(1),String(f.totalFaltas),f.situacao];});
    doc.autoTable({
        startY:84, margin:{left:15,right:15}, head:[['COMPONENTE CURRICULAR','1º BIM.','FALT.','2º BIM.','FALT.','3º BIM.','FALT.','4º BIM.','FALT.','TOTAL ANUAL','MÉDIA','FALTAS','SITUAÇÃO']], body,
        theme:'grid', tableWidth:'auto',
        headStyles:{fillColor:[52,58,64],textColor:[255,255,255],fontStyle:'bold',fontSize:6.4,halign:'center',valign:'middle',cellPadding:2},
        bodyStyles:{fontSize:6.8,textColor:[37,42,48],cellPadding:2.1,halign:'center',valign:'middle'},
        alternateRowStyles:{fillColor:[247,248,249]},
        columnStyles:{0:{halign:'left',fontStyle:'bold',cellWidth:54},1:{cellWidth:18},2:{cellWidth:13},3:{cellWidth:18},4:{cellWidth:13},5:{cellWidth:18},6:{cellWidth:13},7:{cellWidth:18},8:{cellWidth:13},9:{cellWidth:21,fontStyle:'bold'},10:{cellWidth:20,fontStyle:'bold'},11:{cellWidth:16},12:{cellWidth:28,fontStyle:'bold'}},
        didParseCell:data=>{if(data.section==='body'){if([1,3,5,7].includes(data.column.index)&&parseFloat(data.cell.raw)<15)data.cell.styles.textColor=[180,70,70];if(data.column.index===12){data.cell.styles.textColor=data.cell.raw==='Aprovado'?[47,107,80]:[176,0,0];}if([9,10].includes(data.column.index)&&parseFloat(data.cell.raw)<60){data.cell.styles.textColor=[176,0,0];}}}
    });

    const y = Math.min((doc.lastAutoTable?.finalY||155)+8, 174);
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(90,100,110);
    doc.text('Legenda: notas bimestrais valem até 25,0 pontos. Recuperações bimestrais são aplicadas conforme as regras do sistema.',15,y);
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(37,42,48);
    doc.text('ASSINATURAS',15,y+10);
    const labels=['RESPONSÁVEL','PROFESSOR(A)','DIREÇÃO','SECRETARIA'];
    labels.forEach((label,i)=>{const x=15+i*68;doc.setDrawColor(145,153,161);doc.setLineWidth(.3);doc.line(x,y+22,x+52,y+22);doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(90,100,110);doc.text(label,x+26,y+26,{align:'center'});});
    doc.setFontSize(6.5); doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')} · Portal do Professor`,282,197,{align:'right'});
}


function exportarTodosBoletinsPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("Biblioteca PDF ainda não foi carregada. Tente novamente.");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    let imgLogo = null;
    const imgEl = document.getElementById('img-brasao-base64');
    if (imgEl && imgEl.complete && imgEl.naturalWidth) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = imgEl.naturalWidth; canvas.height = imgEl.naturalHeight;
            canvas.getContext('2d').drawImage(imgEl, 0, 0);
            imgLogo = canvas.toDataURL('image/png');
        } catch (e) {}
    }
    ALUNOS.forEach((aluno, index) => {
        if (index > 0) doc.addPage();
        adicionarPaginaBoletim(doc, aluno, imgLogo);
    });
    doc.save('boletins_2026_todos_os_alunos.pdf');
}
function gerarBoletimPDF(aluno) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    
    let imgLogo = null;
    const imgEl = document.getElementById('img-brasao-base64');
    if (imgEl && imgEl.complete && imgEl.naturalWidth !== 0) {
        try {
            const canvas = document.createElement("canvas");
            canvas.width = imgEl.naturalWidth; canvas.height = imgEl.naturalHeight;
            canvas.getContext("2d").drawImage(imgEl, 0, 0);
            imgLogo = canvas.toDataURL("image/png");
        } catch(e) { console.error("Erro ao converter brasão para base64", e); }
    }

    adicionarPaginaBoletim(doc, aluno, imgLogo);
    doc.save(`boletim_2026_${aluno.replace(/ /g, '_')}.pdf`);
}

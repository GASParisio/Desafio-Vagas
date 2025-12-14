// --- CONSTANTES E CONFIGURAÇÕES ---
const CONFIG = {
    SUPABASE_URL: 'https://htoeymqqwaliexijmyei.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0b2V5bXFxd2FsaWV4aWpteWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MDg0NTAsImV4cCI6MjA4MTE4NDQ1MH0.Fweb9NFy6stz8TfM-FLlDZUoC9N_A-2WV-ji0RxfJQU'
};

const client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
let estadoUsuario = { profile: null, id: null };
let modalEdicaoBS = null; // Para controlar o modal via JS
let modalCandidatosBS = null;

// --- CAMADA DE SERVIÇO (DADOS) ---
const VagaService = {
    async listar() {
        return await client.from('vagas').select('*').order('created_at', { ascending: false });
    },
    async criar(vaga) {
        return await client.from('vagas').insert(vaga);
    },
    async atualizar(id, vaga) {
        return await client.from('vagas').update(vaga).eq('id', id);
    },
    async excluir(id) {
        return await client.from('vagas').delete().eq('id', id);
    },
    async candidatar(vagaId, userId) {
        return await client.from('candidaturas').insert({ vaga_id: vagaId, user_id: userId, status: 'Pendente' });
    },
    async buscarMinhasCandidaturas(userId) {
        return await client.from('candidaturas').select('vaga_id, status, feedback').eq('user_id', userId);
    }
};

const CandidatoService = {
    async listarPorVaga(vagaId) {
        return await client.from('candidaturas').select('*, profiles(email)').eq('vaga_id', vagaId);
    },
    async atualizarStatus(id, status, feedback) {
        const payload = { status };
        if (feedback) payload.feedback = feedback;
        return await client.from('candidaturas').update(payload).eq('id', id);
    },
    // [NOVO] Função para atualizar apenas o feedback
    async atualizarFeedback(id, novoFeedback) {
        return await client.from('candidaturas').update({ feedback: novoFeedback }).eq('id', id);
    }
};

// --- CAMADA DE VIEW (INTERFACE) ---
const UI = {
    formatarMoeda: (valor) => valor ? `R$ ${parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Salário a combinar',
    
    toggleLoading: (btn, loading, textoOriginal = '') => {
        if (loading) {
            btn.dataset.textoOriginal = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processando...';
            btn.disabled = true;
        } else {
            btn.innerHTML = textoOriginal || btn.dataset.textoOriginal;
            btn.disabled = false;
        }
    },

    gerarHTMLBotaoAcao: (vaga, minhasCandidaturas) => {
        // Se for ADMIN
        if (estadoUsuario.profile.role === 'admin') {
            return `
                <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                    <button onclick="Handlers.verCandidatos('${vaga.id}')" class="btn btn-primary btn-sm"><i class="bi bi-people"></i> Candidatos</button>
                    <button onclick="Handlers.prepararEdicao('${vaga.id}')" class="btn btn-outline-secondary btn-sm"><i class="bi bi-pencil"></i></button>
                    <button onclick="Handlers.excluirVaga('${vaga.id}')" class="btn btn-outline-danger btn-sm"><i class="bi bi-trash"></i></button>
                </div>`;
        }
        
        // Se for USUÁRIO COMUM
        const app = minhasCandidaturas[vaga.id];
        if (app) {
            const configStatus = {
                'Aprovado': { cor: 'success', icon: '🎉' },
                'Reprovado': { cor: 'danger', icon: '❌' },
                'Pendente': { cor: 'warning', icon: '⏳' }
            };
            const s = configStatus[app.status] || configStatus['Pendente'];
            
            let html = `<button class="btn btn-${s.cor} btn-sm w-100 fw-bold" disabled>${s.icon} ${app.status}</button>`;
            if (app.feedback) {
                html += `<div class="alert alert-light border mt-3 p-2 mb-0 shadow-sm"><small class="text-muted fw-bold">FEEDBACK:</small><br>${app.feedback}</div>`;
            }
            return html;
        }

        return `<button onclick="Handlers.candidatar('${vaga.id}', this)" class="btn btn-primary btn-sm w-100 fw-bold">Candidatar-se agora</button>`;
    },

    renderizarCardVaga: (vaga, minhasCandidaturas) => {
        return `
            <div class="col-md-6 mb-4">
                <div class="card h-100 border-0">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title text-primary fw-bold mb-0">${vaga.titulo}</h5>
                            <span class="badge bg-light text-dark border">${vaga.modalidade || 'Remoto'}</span>
                        </div>
                        <h6 class="card-subtitle mb-3 text-muted small"><i class="bi bi-building"></i> Empresa Confidencial</h6>
                        <p class="card-text flex-grow-1">${vaga.descricao}</p>
                        <div class="mt-3 pt-3 border-top">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <small class="text-success fw-bold"><i class="bi bi-cash-stack"></i> ${UI.formatarMoeda(vaga.salario)}</small>
                            </div>
                            ${UI.gerarHTMLBotaoAcao(vaga, minhasCandidaturas)}
                        </div>
                    </div>
                </div>
            </div>`;
    },

    renderizarListaCandidatos: (candidaturas, vagaId) => {
        const lista = document.getElementById('lista-candidatos');
        if (candidaturas.length === 0) {
            lista.innerHTML = '<div class="text-center text-muted py-4"><i class="bi bi-inbox fs-1"></i><p>Ainda sem candidatos.</p></div>';
            return;
        }

        lista.innerHTML = '';
        candidaturas.forEach(c => {
            const emailCandidato = c.profiles ? c.profiles.email : 'Email oculto';
            const statusReal = c.status || 'Pendente';
            
            let corStatus = 'secondary';
            if (statusReal === 'Aprovado') corStatus = 'success';
            if (statusReal === 'Reprovado') corStatus = 'danger';
            if (statusReal === 'Pendente') corStatus = 'warning';

            // [NOVO] Proteção de aspas para o botão de editar
            const feedbackTexto = c.feedback || '';
            const feedbackSeguro = feedbackTexto.replace(/"/g, '&quot;');

            const item = document.createElement('li');
            item.className = 'list-group-item d-flex justify-content-between align-items-center flex-wrap p-3';
            
            // [NOVO] HTML atualizado com o botão de editar (lápis)
            item.innerHTML = `
                <div>
                    <div class="fw-bold text-dark">${emailCandidato}</div>
                    <small class="text-muted"><i class="bi bi-calendar"></i> ${new Date(c.created_at).toLocaleDateString()}</small>
                    
                    ${c.feedback ? `
                        <div class="mt-2 p-2 bg-light border rounded position-relative">
                            <small class="text-muted fw-bold d-block">Feedback:</small>
                            <span class="text-dark fst-italic">"${c.feedback}"</span>
                            
                            <button 
                                onclick="Handlers.editarFeedback('${c.id}', '${vagaId}', this.getAttribute('data-feed'))" 
                                data-feed="${feedbackSeguro}"
                                class="btn btn-link btn-sm text-decoration-none position-absolute top-0 end-0" 
                                title="Editar Feedback">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="d-flex align-items-center gap-3 mt-2 mt-md-0">
                    <span class="badge bg-${corStatus}">${statusReal}</span>
                    <div class="btn-group shadow-sm" role="group">
                        <button onclick="Handlers.atualizarCandidatura('${c.id}', 'Aprovado', '${vagaId}')" class="btn btn-outline-success btn-sm" title="Aprovar"><i class="bi bi-check-lg"></i></button>
                        <button onclick="Handlers.atualizarCandidatura('${c.id}', 'Reprovado', '${vagaId}')" class="btn btn-outline-danger btn-sm" title="Reprovar"><i class="bi bi-x-lg"></i></button>
                    </div>
                </div>
            `;
            lista.appendChild(item);
        });
    }
};

// --- CONTROLADORES DE EVENTOS (HANDLERS) ---
const Handlers = {
    async iniciarSistema() {
        const sessionRaw = localStorage.getItem('session');
        if (!sessionRaw) return window.location.href = 'index.html';

        const session = JSON.parse(sessionRaw);
        const { error } = await client.auth.setSession(session);

        if (error) {
            localStorage.removeItem('session');
            return window.location.href = 'index.html';
        }

        // Configura Modais do Bootstrap
        modalEdicaoBS = new bootstrap.Modal(document.getElementById('modalEdicao'));
        modalCandidatosBS = new bootstrap.Modal(document.getElementById('modalCandidatos'));

        await Handlers.carregarPerfil(session.user.id);
    },

    async carregarPerfil(userId) {
        const { data, error } = await client.from('profiles').select('*').eq('id', userId).single();
        estadoUsuario.profile = error ? { role: 'user' } : data;
        estadoUsuario.id = userId;

        document.getElementById('user-email').innerText = estadoUsuario.profile.email || 'Usuário';
        if (estadoUsuario.profile.role === 'admin') {
            document.getElementById('admin-panel').style.display = 'block';
        }
        Handlers.carregarVagas();
    },

    async carregarVagas() {
        const container = document.getElementById('lista-vagas');
        container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-primary"></div></div>';

        const { data: vagas, error } = await VagaService.listar();
        if (error) return container.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        if (vagas.length === 0) return container.innerHTML = '<div class="alert alert-light text-center">Nenhuma vaga disponível</div>';

        // Busca candidaturas se não for admin
        let minhasCandidaturas = {};
        if (estadoUsuario.profile.role !== 'admin') {
            const { data } = await VagaService.buscarMinhasCandidaturas(estadoUsuario.id);
            if (data) data.forEach(app => minhasCandidaturas[app.vaga_id] = app);
        }

        container.innerHTML = vagas.map(v => UI.renderizarCardVaga(v, minhasCandidaturas)).join('');
        window.listaVagasAtual = vagas; 
    },

    // --- FUNÇÕES DE USUÁRIO ---
    async candidatar(vagaId, btn) {
        UI.toggleLoading(btn, true);
        const { error } = await VagaService.candidatar(vagaId, estadoUsuario.id);
        
        if (error) {
            if (error.code === '23505') alert("Você já se candidatou!");
            else alert('Erro: ' + error.message);
            UI.toggleLoading(btn, false);
        } else {
            btn.innerHTML = '⏳ Pendente';
            btn.className = 'btn btn-warning btn-sm w-100 fw-bold';
        }
    },

    // --- FUNÇÕES DE ADMIN ---
    async criarVaga(e) {
        e.preventDefault();
        const salario = document.getElementById('salario').value;
        const novaVaga = {
            titulo: document.getElementById('titulo').value,
            descricao: document.getElementById('descricao').value,
            modalidade: document.getElementById('modalidade').value,
            salario: salario ? parseFloat(salario) : null,
            user_id: estadoUsuario.id
        };

        const { error } = await VagaService.criar(novaVaga);
        if (error) {
            alert('Erro ao criar: ' + error.message);
        } else {
            alert('Vaga publicada com sucesso!');
            document.getElementById('form-nova-vaga').reset();
            Handlers.carregarVagas();
        }
    },

    async excluirVaga(id) {
        if (confirm('Tem certeza que deseja excluir esta vaga?')) {
            const { error } = await VagaService.excluir(id);
            if (!error) Handlers.carregarVagas();
            else alert('Erro ao excluir: ' + error.message);
        }
    },

    prepararEdicao(id) {
        const vaga = window.listaVagasAtual.find(v => v.id === id);
        if (vaga) {
            document.getElementById('edit-id').value = vaga.id;
            document.getElementById('edit-titulo').value = vaga.titulo;
            document.getElementById('edit-descricao').value = vaga.descricao;
            document.getElementById('edit-modalidade').value = vaga.modalidade;
            document.getElementById('edit-salario').value = vaga.salario || ''; 
            modalEdicaoBS.show();
        }
    },

    async salvarEdicao(e) {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const salario = document.getElementById('edit-salario').value;
        
        const vagaAtualizada = {
            titulo: document.getElementById('edit-titulo').value,
            descricao: document.getElementById('edit-descricao').value,
            modalidade: document.getElementById('edit-modalidade').value,
            salario: salario ? parseFloat(salario) : null
        };

        const { error } = await VagaService.atualizar(id, vagaAtualizada);
        if (error) {
            alert('Erro: ' + error.message);
        } else {
            alert('Vaga atualizada!');
            modalEdicaoBS.hide();
            Handlers.carregarVagas();
        }
    },

    async verCandidatos(vagaId) {
        modalCandidatosBS.show();
        const lista = document.getElementById('lista-candidatos');
        lista.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>';

        const { data, error } = await CandidatoService.listarPorVaga(vagaId);
        if (error) lista.innerHTML = `<div class="alert alert-danger">Erro: ${error.message}</div>`;
        else UI.renderizarListaCandidatos(data, vagaId);
    },

    async atualizarCandidatura(candidaturaId, novoStatus, vagaId) {
        let feedbackMsg = prompt(`Feedback para o candidato (Opcional):`);
        if (feedbackMsg === null) return; 

        const { error } = await CandidatoService.atualizarStatus(candidaturaId, novoStatus, feedbackMsg);
        
        if (error) alert('Erro ao atualizar: ' + error.message);
        else {
            // Recarrega a lista de candidatos
            const { data } = await CandidatoService.listarPorVaga(vagaId);
            UI.renderizarListaCandidatos(data, vagaId);
        }
    },

    // [NOVO] Função para gerenciar a edição do feedback
    async editarFeedback(candidaturaId, vagaId, feedbackAtual) {
        const novoTexto = prompt("Edite o feedback para este candidato:", feedbackAtual);
        
        if (novoTexto === null) return; 

        const { error } = await CandidatoService.atualizarFeedback(candidaturaId, novoTexto);
        
        if (error) {
            alert('Erro ao editar feedback: ' + error.message);
        } else {
            const { data } = await CandidatoService.listarPorVaga(vagaId);
            UI.renderizarListaCandidatos(data, vagaId);
        }
    }
};

// --- EVENT LISTENERS GLOBAIS ---
document.addEventListener('DOMContentLoaded', () => {
    Handlers.iniciarSistema();

    // Attach form listeners
    const formNovaVaga = document.getElementById('form-nova-vaga');
    if(formNovaVaga) formNovaVaga.addEventListener('submit', Handlers.criarVaga);

    const formEditarVaga = document.getElementById('form-editar-vaga');
    if(formEditarVaga) formEditarVaga.addEventListener('submit', Handlers.salvarEdicao);
});

document.getElementById('btn-logout').addEventListener('click', async () => {
    await client.auth.signOut();
    localStorage.removeItem('session');
    window.location.href = 'index.html';
});

// Expondo Handlers para o HTML poder chamar via onclick=""
window.Handlers = Handlers;
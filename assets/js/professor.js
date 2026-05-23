// assets/js/professor.js
// Depende de aluno.js: usuarioLogado(), tokenAtual(), mostrarAviso()
// Carregado em: pages/professor.html

(function () {
    const usuario = usuarioLogado();
    if (!usuario || usuario.perfil !== "professor") return;

    function api(caminho, opcoes) {
        const token = tokenAtual();
        return fetch(caminho, {
            ...opcoes,
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": "Bearer " + token } : {}),
                ...((opcoes && opcoes.headers) || {})
            }
        });
    }

    async function iniciar() {
        await carregarTurmas();
    }

    async function carregarTurmas() {
        try {
            const resp  = await api("/api/turmas");
            const dados = await resp.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            if (dados.turmas.length) {
                    const primeiraId = dados.turmas[0].id;
                    // Carrega desempenho da primeira turma automaticamente
                    await carregarDesempenho(primeiraId, dados.turmas[0].nome);
                    await carregarAtividades();
                    // Carrega análise IA e progresso de trilhas
                    await carregarResumoIATurma(primeiraId);
                    await carregarProgressoTrilhas(primeiraId);
                }
        } catch (erro) {
            mostrarAviso("Erro ao carregar turmas: " + erro.message);
        }
    }

    async function carregarDesempenho(turmaId, turmaNome) {
        const container  = document.getElementById("desempenho-container");
        const elNome     = document.querySelector("[data-desempenho-turma-nome]");
        if (!container) return;
        if (elNome) elNome.textContent = turmaNome;

        try {
            const resp  = await api("/api/turmas/" + turmaId + "/desempenho");
            const dados = await resp.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            if (!dados.desempenho.length) {
                container.innerHTML = "<p><em>Nenhum aluno matriculado nesta turma.</em></p>";
                return;
            }

            container.innerHTML = `
                <table class="tabela-desempenho">
                    <thead>
                        <tr>
                            <th>Aluno</th>
                            <th>Entregas</th>
                            <th>Média acerto</th>
                            <th>Streak</th>
                            <th>Pontuação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dados.desempenho.map(a => `
                            <tr>
                                <td>${a.nome}</td>
                                <td>${a.total_entregues}</td>
                                <td>${a.media_acerto_pct !== null ? a.media_acerto_pct + "%" : "--"}</td>
                                <td>${a.streak_atual} dia(s)</td>
                                <td>${a.pontuacao} pts</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            `;
        } catch (erro) {
            if (container) container.innerHTML = "<p class='erro-inline'>Erro ao carregar desempenho.</p>";
            mostrarAviso("Erro ao carregar desempenho: " + erro.message);
        }
    }

    async function carregarAtividades() {
        const listaEl = document.querySelector(".professor-lista");
        if (!listaEl) return;

        try {
            const resp  = await api("/api/atividades");
            const dados = await resp.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            if (!dados.atividades.length) {
                listaEl.innerHTML = "<p><em>Nenhuma atividade criada ainda.</em></p>";
                return;
            }

            listaEl.innerHTML = dados.atividades.slice(0, 5).map(a => `
                <article class="item-atividade">
                    <div>
                        <div class="linha-meta">
                            <strong>${a.titulo}</strong>
                            <span class="etiqueta">${a.total_entregas} entrega(s)</span>
                        </div>
                        <p>${a.turma_nome} · ${a.total_questoes} questão(ões)${a.prazo ? " · Prazo: " + new Date(a.prazo).toLocaleDateString("pt-BR") : ""}</p>
                    </div>
                    <a class="botao botao-pequeno" href="atividades.html">Gerenciar</a>
                </article>
            `).join("");
        } catch (erro) {
            mostrarAviso("Erro ao carregar atividades: " + erro.message);
        }
    }

    // ── Resumo IA da turma ────────────────────────────────────────────────────
    async function carregarResumoIATurma(turmaId) {
        const container = document.getElementById('resumo-ia-turma');
        if (!container) return;

        container.innerHTML = '<p><em>Gerando análise da turma com IA…</em></p>';

        try {
            const resp  = await api('/api/ia/resumo-turma/' + turmaId);
            const dados = await resp.json();

            if (dados.status !== 'ok') {
                container.innerHTML = '<p><em>Não foi possível gerar a análise agora.</em></p>';
                return;
            }

            const { analise } = dados;

            const atencaoHTML = Array.isArray(analise.alunos_atencao) && analise.alunos_atencao.length
                ? '<ul>' + analise.alunos_atencao.map(a =>
                    `<li><strong>${escHtmlProf(a.nome)}</strong> — ${escHtmlProf(a.situacao)}</li>`
                  ).join('') + '</ul>'
                : '<p><em>Todos os alunos estão com desempenho satisfatório.</em></p>';

            container.innerHTML = `
                <p>${escHtmlProf(analise.resumo || '')}</p>
                ${analise.recomendacao_professor
                    ? `<p style="margin-top:.8rem"><strong>Recomendação:</strong> ${escHtmlProf(analise.recomendacao_professor)}</p>`
                    : ''}
                <div class="linha-titulo" style="margin-top:1rem"><h4>Alunos que precisam de atenção</h4></div>
                ${atencaoHTML}
            `;
        } catch {
            container.innerHTML = '<p><em>Não foi possível carregar a análise de IA.</em></p>';
        }
    }

    // ── Progresso individual nas trilhas (PROF-02) ────────────────────────────
    async function carregarProgressoTrilhas(turmaId) {
        const container = document.getElementById('progresso-trilhas-container');
        if (!container) return;

        container.innerHTML = '<p><em>Carregando progresso nas trilhas…</em></p>';

        try {
            const resp  = await api('/api/ia/progresso-trilhas/' + turmaId);
            const dados = await resp.json();

            if (dados.status !== 'ok') throw new Error(dados.message);

            if (!dados.progresso.length) {
                container.innerHTML = '<p><em>Nenhum aluno com progresso em trilhas nesta turma.</em></p>';
                return;
            }

            // Agrupar por aluno
            const porAluno = {};
            dados.progresso.forEach(linha => {
                if (!porAluno[linha.aluno_id]) {
                    porAluno[linha.aluno_id] = { nome: linha.aluno_nome, trilhas: [] };
                }
                porAluno[linha.aluno_id].trilhas.push({
                    trilha:     linha.trilha_titulo,
                    disciplina: linha.disciplina,
                    pct:        linha.progresso_pct || 0,
                    concluidas: linha.etapas_concluidas,
                    total:      linha.total_etapas
                });
            });

            container.innerHTML = Object.values(porAluno).map(aluno => `
                <div style="margin-bottom:1rem">
                    <strong>${escHtmlProf(aluno.nome)}</strong>
                    ${aluno.trilhas.map(t => `
                        <div style="margin-left:1rem;margin-top:.3rem">
                            <span>${escHtmlProf(t.trilha)}</span>
                            <span style="margin-left:.5rem;opacity:.7">${t.concluidas}/${t.total} etapas</span>
                            <div class="barra" style="margin-top:.2rem">
                                <span style="width:${t.pct}%"></span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `).join('');
        } catch (erro) {
            container.innerHTML = '<p class="erro-inline">Erro ao carregar progresso nas trilhas.</p>';
            mostrarAviso('Erro ao carregar progresso: ' + erro.message);
        }
    }

    function escHtmlProf(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    iniciar();
})();

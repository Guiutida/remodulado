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
                // Carrega desempenho da primeira turma automaticamente
                await carregarDesempenho(dados.turmas[0].id, dados.turmas[0].nome);
                await carregarAtividades();
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

    iniciar();
})();

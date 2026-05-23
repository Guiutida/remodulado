// assets/js/turma.js — Dual-view: professor vê lista de turmas; aluno vê sua turma.
// Depende de aluno.js: usuarioLogado(), tokenAtual(), mostrarAviso()

(function () {
    // ─────────── helpers ───────────

    function api(caminho, opcoes = {}) {
        const token = tokenAtual();
        return fetch(caminho, {
            ...opcoes,
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": `Bearer ${token}` } : {}),
                ...(opcoes.headers || {})
            }
        });
    }

    function mostrarErro(msg) {
        mostrarAviso(msg, "erro");
    }

    // ─────────── roteador de perfil ───────────

    const usuario = usuarioLogado();
    if (!usuario) return;

    const viewProfessor = document.getElementById("view-professor");
    const viewAluno = document.getElementById("view-aluno");

    if (usuario.perfil === "professor") {
        if (viewProfessor) viewProfessor.style.display = "";
        iniciarProfessor();
    } else {
        if (viewAluno) viewAluno.style.display = "";
        iniciarAluno();
    }

    // ═══════════════════════════════════════════
    // VIEW PROFESSOR
    // ═══════════════════════════════════════════

    function iniciarProfessor() {
        carregarTurmasProfessor();
        configurarFormCriar();
    }

    async function carregarTurmasProfessor() {
        const lista = document.getElementById("lista-turmas-professor");
        const vazio = document.getElementById("sem-turmas");
        if (!lista) return;

        try {
            const resposta = await api("/api/turmas");
            const dados = await resposta.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            if (!dados.turmas.length) {
                if (vazio) vazio.style.display = "";
                return;
            }
            if (vazio) vazio.style.display = "none";
            lista.innerHTML = dados.turmas.map(turma => `
                <article class="cartao-painel cartao-turma" data-turma-id="${turma.id}">
                    <div class="linha-titulo">
                        <div>
                            <span>${turma.disciplina}</span>
                            <h2>${turma.nome}</h2>
                        </div>
                        <span class="etiqueta codigo-turma">${turma.codigo}</span>
                    </div>
                    <p>${turma.total_alunos} aluno(s) matriculado(s)</p>
                    <div class="linha-meta">
                        <button class="botao botao-pequeno" data-acao="ver-membros" data-id="${turma.id}" data-nome="${turma.nome}">
                            Ver membros
                        </button>
                    </div>
                </article>
            `).join("");

            lista.querySelectorAll("[data-acao='ver-membros']").forEach(btn => {
                btn.addEventListener("click", () => abrirModalMembros(btn.dataset.id, btn.dataset.nome));
            });
        } catch (erro) {
            mostrarErro("Erro ao carregar turmas: " + erro.message);
        }
    }

    function configurarFormCriar() {
        const form = document.getElementById("form-criar-turma");
        if (!form) return;
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nome = form.querySelector("[name='nome']")?.value.trim();
            const disciplina = form.querySelector("[name='disciplina']")?.value.trim();
            if (!nome || !disciplina) return mostrarErro("Preencha nome e disciplina.");

            const btn = form.querySelector("button[type='submit']");
            if (btn) btn.disabled = true;
            try {
                const resposta = await api("/api/turmas", {
                    method: "POST",
                    body: JSON.stringify({ nome, disciplina })
                });
                const dados = await resposta.json();
                if (dados.status !== "ok") throw new Error(dados.message);
                form.reset();
                mostrarAviso(`Turma criada! Código: ${dados.turma.codigo}`, "sucesso");
                await carregarTurmasProfessor();
            } catch (erro) {
                mostrarErro("Erro ao criar turma: " + erro.message);
            } finally {
                if (btn) btn.disabled = false;
            }
        });
    }

    async function abrirModalMembros(turmaId, turma_nome) {
        const modal = document.getElementById("modal-membros");
        const titulo = document.getElementById("modal-membros-titulo");
        const conteudo = document.getElementById("modal-membros-conteudo");
        if (!modal || !conteudo) return;

        if (titulo) titulo.textContent = turma_nome;
        conteudo.innerHTML = "<p>Carregando...</p>";
        modal.style.display = "";

        try {
            const resposta = await api(`/api/turmas/${turmaId}/membros`);
            const dados = await resposta.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            if (!dados.membros.length) {
                conteudo.innerHTML = "<p>Nenhum aluno nesta turma ainda.</p>";
                return;
            }
            conteudo.innerHTML = `
                <ul class="lista-membros">
                    ${dados.membros.map(m => `
                        <li class="membro-item">
                            <span class="avatar-mini">${m.nome.charAt(0).toUpperCase()}</span>
                            <div>
                                <strong>${m.nome}</strong>
                                <small>${m.email}</small>
                            </div>
                            <button class="botao botao-pequeno botao-perigo"
                                data-acao="remover-membro"
                                data-turma="${turmaId}"
                                data-aluno="${m.id}"
                                data-nome="${m.nome}">
                                Remover
                            </button>
                        </li>
                    `).join("")}
                </ul>
            `;
            conteudo.querySelectorAll("[data-acao='remover-membro']").forEach(btn => {
                btn.addEventListener("click", () =>
                    removerMembro(btn.dataset.turma, btn.dataset.aluno, btn.dataset.nome, turmaId, turma_nome)
                );
            });
        } catch (erro) {
            conteudo.innerHTML = `<p class="erro-inline">${erro.message}</p>`;
        }
    }

    async function removerMembro(turmaId, alunoId, nomeAluno, turmaIdModal, turmaNomeModal) {
        if (!confirm(`Remover ${nomeAluno} da turma?`)) return;
        try {
            const resposta = await api(`/api/turmas/${turmaId}/alunos/${alunoId}`, { method: "DELETE" });
            const dados = await resposta.json();
            if (dados.status !== "ok") throw new Error(dados.message);
            mostrarAviso(`${nomeAluno} removido(a) da turma.`, "sucesso");
            await abrirModalMembros(turmaIdModal, turmaNomeModal);
            await carregarTurmasProfessor();
        } catch (erro) {
            mostrarErro("Erro ao remover membro: " + erro.message);
        }
    }

    // fechar modal
    document.addEventListener("click", (e) => {
        if (e.target.matches("[data-fechar-modal='membros']")) {
            const modal = document.getElementById("modal-membros");
            if (modal) modal.style.display = "none";
        }
    });

    // ═══════════════════════════════════════════
    // VIEW ALUNO
    // ═══════════════════════════════════════════

    function iniciarAluno() {
        carregarTurmaAluno();
        configurarFormEntrar();
    }

    async function carregarTurmaAluno() {
        const secaoSemTurma = document.getElementById("secao-sem-turma");
        const secaoComTurma = document.getElementById("secao-com-turma");

        try {
            const resposta = await api("/api/aluno/turma");
            const dados = await resposta.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            if (!dados.turma) {
                if (secaoSemTurma) secaoSemTurma.style.display = "";
                if (secaoComTurma) secaoComTurma.style.display = "none";
                return;
            }

            const turma = dados.turma;
            if (secaoSemTurma) secaoSemTurma.style.display = "none";
            if (secaoComTurma) secaoComTurma.style.display = "";

            const elNome = document.getElementById("turma-nome");
            const elDisciplina = document.getElementById("turma-disciplina");
            const elCodigo = document.getElementById("turma-codigo");
            const elTotal = document.getElementById("turma-total-alunos");

            if (elNome) elNome.textContent = turma.nome;
            if (elDisciplina) elDisciplina.textContent = turma.disciplina;
            if (elCodigo) elCodigo.textContent = turma.codigo;
            if (elTotal) elTotal.textContent = turma.total_alunos;
        } catch (erro) {
            mostrarErro("Erro ao buscar turma: " + erro.message);
        }
    }

    function configurarFormEntrar() {
        const form = document.getElementById("form-entrar-turma");
        if (!form) return;
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const codigo = form.querySelector("[name='codigo']")?.value.trim().toUpperCase();
            if (!codigo) return mostrarErro("Digite o código de acesso.");

            const btn = form.querySelector("button[type='submit']");
            if (btn) btn.disabled = true;
            try {
                const resposta = await api("/api/turmas/entrar", {
                    method: "POST",
                    body: JSON.stringify({ codigo })
                });
                const dados = await resposta.json();
                if (dados.status !== "ok") throw new Error(dados.message);
                form.reset();
                mostrarAviso(`Entrou na turma: ${dados.turma.nome}!`, "sucesso");
                await carregarTurmaAluno();
            } catch (erro) {
                mostrarErro(erro.message);
            } finally {
                if (btn) btn.disabled = false;
            }
        });
    }
})();

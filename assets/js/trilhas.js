// assets/js/trilhas.js — Dual-view: professor gerencia trilhas; aluno acompanha progresso.
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
        showError(msg);
    }

    function renderBarra(percentual) {
        const p = percentual ?? 0;
        return `<div class="barra" title="${p}% concluído"><span style="width:${p}%"></span></div>`;
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
        configurarFormCriarTrilha();
    }

    // carrega turmas para o select do form
    async function carregarTurmasProfessor() {
        const select = document.getElementById("trilha-turma-select");
        if (!select) return;
        try {
            showLoading();
            const resposta = await api("/api/turmas");
            const dados = await resposta.json();
            if (dados.status !== "ok") throw new Error(dados.message);
            if (!dados.turmas.length) {
                select.innerHTML = '<option value="">Nenhuma turma cadastrada</option>';
                select.disabled = true;
            } else {
                select.innerHTML = '<option value="">Selecione a turma</option>' +
                    dados.turmas.map(t => `<option value="${t.id}">${t.nome} — ${t.disciplina}</option>`).join("");
            }
            await carregarTrilhasProfessor();
        } catch {
            mostrarErro("Não foi possível carregar turmas.");
        } finally {
            hideLoading();
        }
    }

    async function carregarTrilhasProfessor() {
        const lista = document.getElementById("lista-trilhas-professor");
        const vazio = document.getElementById("sem-trilhas-professor");
        if (!lista) return;
        try {
            showLoading();
            const resposta = await api("/api/trilhas/minhas");
            const dados = await resposta.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            if (!dados.trilhas.length) {
                if (vazio) vazio.style.display = "";
                lista.innerHTML = "";
                return;
            }
            if (vazio) vazio.style.display = "none";
            lista.innerHTML = dados.trilhas.map(tr => `
                <article class="cartao-painel cartao-trilha">
                    <div class="linha-titulo">
                        <div>
                            <span>${tr.disciplina} — ${tr.turma_nome}</span>
                            <h2>${tr.titulo}</h2>
                        </div>
                        <span class="etiqueta">${tr.total_etapas} etapa(s)</span>
                    </div>
                    <div class="linha-meta">
                        <button class="botao botao-pequeno" data-acao="gerenciar-trilha" data-id="${tr.id}" data-titulo="${tr.titulo}">
                            Gerenciar etapas
                        </button>
                    </div>
                </article>
            `).join("");

            lista.querySelectorAll("[data-acao='gerenciar-trilha']").forEach(btn => {
                btn.addEventListener("click", () => abrirModalEtapas(btn.dataset.id, btn.dataset.titulo));
            });
        } catch {
            mostrarErro("Não foi possível carregar trilhas.");
        } finally {
            hideLoading();
        }
    }

    function configurarFormCriarTrilha() {
        const form = document.getElementById("form-criar-trilha");
        if (!form) return;
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const turma_id = form.querySelector("[name='turma_id']")?.value;
            const titulo = form.querySelector("[name='titulo']")?.value.trim();
            const disciplina = form.querySelector("[name='disciplina']")?.value.trim();
            const descricao = form.querySelector("[name='descricao']")?.value.trim();

            if (!turma_id || !titulo || !disciplina) {
                return mostrarErro("Selecione a turma e preencha título e disciplina.");
            }
            const btn = form.querySelector("button[type='submit']");
            if (btn) btn.disabled = true;
            try {
                showLoading();
                const resposta = await api("/api/trilhas", {
                    method: "POST",
                    body: JSON.stringify({ turma_id: parseInt(turma_id, 10), titulo, disciplina, descricao })
                });
                const dados = await resposta.json();
                if (dados.status !== "ok") throw new Error(dados.message);
                form.reset();
                showSuccess(`Trilha "${dados.trilha.titulo}" criada!`);
                await carregarTrilhasProfessor();
            } catch {
                mostrarErro("Não foi possível criar trilha. Tente novamente.");
            } finally {
                hideLoading();
                if (btn) btn.disabled = false;
            }
        });
    }

    async function abrirModalEtapas(trilhaId, trilhaTitulo) {
        const modal = document.getElementById("modal-etapas");
        const titulo = document.getElementById("modal-etapas-titulo");
        const lista = document.getElementById("modal-etapas-lista");
        if (!modal || !lista) return;

        if (titulo) titulo.textContent = trilhaTitulo;
        modal.dataset.trilhaId = trilhaId;
        modal.style.display = "";

        await recarregarEtapasModal(trilhaId);
        configurarFormAdicionarEtapa(trilhaId);
    }

    async function recarregarEtapasModal(trilhaId) {
        const lista = document.getElementById("modal-etapas-lista");
        if (!lista) return;
        try {
            showLoading();
            const resposta = await api(`/api/trilhas/${trilhaId}`);
            const dados = await resposta.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            if (!dados.etapas.length) {
                lista.innerHTML = "<p>Nenhuma etapa ainda. Adicione a primeira!</p>";
                return;
            }
            lista.innerHTML = `
                <ol class="lista-etapas">
                    ${dados.etapas.map(et => `
                        <li class="etapa-item">
                            <span class="etapa-ordem">${et.ordem}</span>
                            <div>
                                <strong>${et.titulo}</strong>
                                <small class="etiqueta">${et.tipo}</small>
                            </div>
                        </li>
                    `).join("")}
                </ol>
            `;
        } catch {
            lista.innerHTML = "<p class='erro-inline'>Não foi possível carregar etapas.</p>";
        } finally {
            hideLoading();
        }
    }

    function configurarFormAdicionarEtapa(trilhaId) {
        const form = document.getElementById("form-adicionar-etapa");
        if (!form) return;
        const novoForm = form.cloneNode(true);
        form.parentNode.replaceChild(novoForm, form);

        novoForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const titulo = novoForm.querySelector("[name='etapa-titulo']")?.value.trim();
            const tipo = novoForm.querySelector("[name='etapa-tipo']")?.value;
            const conteudo = novoForm.querySelector("[name='etapa-conteudo']")?.value.trim();
            if (!titulo || !tipo || !conteudo) return mostrarErro("Preencha todos os campos da etapa.");

            const btn = novoForm.querySelector("button[type='submit']");
            if (btn) btn.disabled = true;
            try {
                showLoading();
                const resposta = await api(`/api/trilhas/${trilhaId}/etapas`, {
                    method: "POST",
                    body: JSON.stringify({ titulo, tipo, conteudo })
                });
                const dados = await resposta.json();
                if (dados.status !== "ok") throw new Error(dados.message);
                novoForm.reset();
                showSuccess(`Etapa "${dados.etapa.titulo}" adicionada.`);
                await recarregarEtapasModal(trilhaId);
            } catch {
                mostrarErro("Não foi possível adicionar etapa. Tente novamente.");
            } finally {
                hideLoading();
                if (btn) btn.disabled = false;
            }
        });
    }

    document.addEventListener("click", (e) => {
        if (e.target.matches("[data-fechar-modal='etapas']")) {
            const modal = document.getElementById("modal-etapas");
            if (modal) modal.style.display = "none";
        }
    });

    // ═══════════════════════════════════════════
    // VIEW ALUNO
    // ═══════════════════════════════════════════

    function iniciarAluno() {
        carregarTrilhasAluno();
    }

    async function carregarTrilhasAluno() {
        const lista = document.getElementById("lista-trilhas-aluno");
        const vazio = document.getElementById("sem-trilhas-aluno");
        const destaque = document.getElementById("destaque-trilha");
        if (!lista) return;

        try {
            showLoading();
            const resposta = await api("/api/trilhas/disponiveis");
            const dados = await resposta.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            if (!dados.trilhas.length) {
                if (vazio) vazio.style.display = "";
                if (destaque) destaque.style.display = "none";
                return;
            }
            if (vazio) vazio.style.display = "none";

            // destaque: trilha com maior progresso parcial (não 100%)
            const emAndamento = dados.trilhas.filter(tr => (tr.percentual || 0) < 100);
            const trilhaDestaque = emAndamento[0] || dados.trilhas[0];
            if (destaque && trilhaDestaque) {
                destaque.style.display = "";
                const elTitulo = destaque.querySelector("[data-destaque-titulo]");
                const elDesc = destaque.querySelector("[data-destaque-desc]");
                const elBarra = destaque.querySelector("[data-destaque-barra]");
                const elBtn = destaque.querySelector("[data-destaque-btn]");
                if (elTitulo) elTitulo.textContent = trilhaDestaque.titulo;
                if (elDesc) elDesc.textContent = trilhaDestaque.disciplina + " · " + (trilhaDestaque.percentual || 0) + "% concluído";
                if (elBarra) elBarra.innerHTML = renderBarra(trilhaDestaque.percentual);
                if (elBtn) {
                    elBtn.href = "#";
                    elBtn.dataset.acao = "abrir-trilha";
                    elBtn.dataset.id = trilhaDestaque.id;
                    elBtn.dataset.titulo = trilhaDestaque.titulo;
                }
            }

            lista.innerHTML = dados.trilhas.map(tr => `
                <article class="cartao-painel cartao-trilha">
                    <div class="linha-titulo">
                        <div>
                            <span>${tr.disciplina} — ${tr.turma_nome}</span>
                            <h2>${tr.titulo}</h2>
                        </div>
                        <span class="etiqueta">${tr.percentual ?? 0}%</span>
                    </div>
                    ${renderBarra(tr.percentual)}
                    <p>${tr.etapas_concluidas ?? 0} de ${tr.total_etapas} etapa(s)</p>
                    <div class="linha-meta">
                        <button class="botao botao-pequeno" data-acao="abrir-trilha" data-id="${tr.id}" data-titulo="${tr.titulo}">
                            Ver trilha
                        </button>
                    </div>
                </article>
            `).join("");

            document.addEventListener("click", (e) => {
                const btn = e.target.closest("[data-acao='abrir-trilha']");
                if (btn) {
                    e.preventDefault();
                    abrirModalTrilhaAluno(btn.dataset.id, btn.dataset.titulo);
                }
            });
        } catch {
            mostrarErro("Não foi possível carregar trilhas.");
        } finally {
            hideLoading();
        }
    }

    async function abrirModalTrilhaAluno(trilhaId, trilhaTitulo) {
        const modal = document.getElementById("modal-trilha-aluno");
        const titulo = document.getElementById("modal-trilha-titulo");
        const conteudo = document.getElementById("modal-trilha-conteudo");
        if (!modal || !conteudo) return;

        if (titulo) titulo.textContent = trilhaTitulo;
        modal.dataset.trilhaId = trilhaId;
        modal.style.display = "";

        try {
            showLoading();
            const resposta = await api(`/api/trilhas/${trilhaId}`);
            const dados = await resposta.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            if (!dados.etapas.length) {
                conteudo.innerHTML = "<p>Esta trilha ainda não tem etapas.</p>";
                return;
            }
            conteudo.innerHTML = `
                <ol class="lista-etapas-aluno">
                    ${dados.etapas.map(et => `
                        <li class="etapa-item ${et.concluido ? 'concluida' : ''}">
                            <input type="checkbox"
                                id="etapa-${et.id}"
                                data-trilha="${trilhaId}"
                                data-etapa="${et.id}"
                                ${et.concluido ? "checked" : ""}
                            >
                            <label for="etapa-${et.id}">
                                <strong>${et.titulo}</strong>
                                <span class="etiqueta">${et.tipo}</span>
                                <p class="conteudo-etapa">${et.conteudo}</p>
                            </label>
                        </li>
                    `).join("")}
                </ol>
            `;

            conteudo.querySelectorAll("input[type='checkbox']").forEach(cb => {
                cb.addEventListener("change", () => marcarProgresso(cb.dataset.trilha, cb.dataset.etapa, cb.checked, trilhaId, trilhaTitulo));
            });
        } catch {
            conteudo.innerHTML = "<p class='erro-inline'>Não foi possível carregar a trilha.</p>";
            showError("Não foi possível carregar a trilha.");
        } finally {
            hideLoading();
        }
    }

    async function marcarProgresso(trilhaId, etapaId, concluido, trilhaIdModal, trilhaTituloModal) {
        try {
            showLoading();
            const resposta = await api(`/api/trilhas/${trilhaId}/etapas/${etapaId}/progresso`, {
                method: "PUT",
                body: JSON.stringify({ concluido })
            });
            const dados = await resposta.json();
            if (dados.status !== "ok") throw new Error(dados.message);
            await carregarTrilhasAluno();
        } catch {
            mostrarErro("Não foi possível salvar progresso. Tente novamente.");
            await abrirModalTrilhaAluno(trilhaIdModal, trilhaTituloModal);
        } finally {
            hideLoading();
        }
    }

    document.addEventListener("click", (e) => {
        if (e.target.matches("[data-fechar-modal='trilha-aluno']")) {
            const modal = document.getElementById("modal-trilha-aluno");
            if (modal) modal.style.display = "none";
        }
    });
})();

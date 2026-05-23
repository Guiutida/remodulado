// assets/js/atividades.js
// Depende de aluno.js: usuarioLogado(), tokenAtual(), mostrarAviso()
// Carregado em: pages/atividades.html

(function () {
    const usuario = usuarioLogado();
    if (!usuario) return;

    // ─── Helper de API ────────────────────────────────────────────────────────
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

    // ─── Roteador de perfil ───────────────────────────────────────────────────
    const viewProf  = document.getElementById("view-professor");
    const viewAluno = document.getElementById("view-aluno");

    if (usuario.perfil === "professor") {
        if (viewProf)  viewProf.style.display  = "";
        if (viewAluno) viewAluno.style.display = "none";
        iniciarProfessor();
    } else {
        if (viewAluno) viewAluno.style.display  = "";
        if (viewProf)  viewProf.style.display   = "none";
        iniciarAluno();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW PROFESSOR
    // ═══════════════════════════════════════════════════════════════════════════

    let atividadeAtualId     = null;
    let atividadeAtualTitulo = "";

    function iniciarProfessor() {
        popularSelectTurmas();
        configurarFormCriarAtividade();
        configurarFormAdicionarQuestao();
        configurarTipoQuestao();
        carregarAtividadesProfessor();
        document.getElementById("btn-finalizar-questoes")
            ?.addEventListener("click", finalizarAdicaoQuestoes);
        document.getElementById("btn-fechar-entregas")
            ?.addEventListener("click", fecharEntregas);
    }

    async function popularSelectTurmas() {
        const sel = document.getElementById("atv-turma");
        if (!sel) return;
        try {
            showLoading();
            const resp  = await api("/api/turmas");
            const dados = await resp.json();
            if (dados.status !== "ok") throw new Error(dados.message);
            dados.turmas.forEach(t => {
                const opt = document.createElement("option");
                opt.value       = t.id;
                opt.textContent = t.nome + " — " + t.disciplina;
                sel.appendChild(opt);
            });
        } catch {
            showError("Não foi possível carregar turmas.");
        } finally {
            hideLoading();
        }
    }

    function configurarFormCriarAtividade() {
        const form = document.getElementById("form-criar-atividade");
        if (!form) return;

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = form.querySelector("button[type='submit']");
            if (btn) btn.disabled = true;

            const titulo    = form.querySelector("[name='titulo']")?.value.trim();
            const turma_id  = parseInt(form.querySelector("[name='turma_id']")?.value, 10);
            const descricao = form.querySelector("[name='descricao']")?.value.trim();
            const prazo     = form.querySelector("[name='prazo']")?.value || null;

            if (!titulo || !turma_id) {
                mostrarAviso("Título e turma são obrigatórios.");
                if (btn) btn.disabled = false;
                return;
            }

            try {
                showLoading();
                const resp  = await api("/api/atividades", {
                    method: "POST",
                    body: JSON.stringify({ titulo, turma_id, descricao, prazo })
                });
                const dados = await resp.json();
                if (dados.status !== "ok") throw new Error(dados.message);

                atividadeAtualId     = dados.atividade.id;
                atividadeAtualTitulo = dados.atividade.titulo;

                document.getElementById("atividade-criada-titulo").textContent = atividadeAtualTitulo;
                document.getElementById("secao-adicionar-questoes").style.display = "";
                document.getElementById("lista-questoes-adicionadas").innerHTML  = "";

                form.reset();
                mostrarAviso("Atividade criada! Adicione as questões abaixo.");
                await carregarAtividadesProfessor();
            } catch {
                showError("Não foi possível criar atividade. Tente novamente.");
            } finally {
                hideLoading();
                if (btn) btn.disabled = false;
            }
        });
    }

    function configurarTipoQuestao() {
        const sel     = document.getElementById("q-tipo");
        const areaOpc = document.getElementById("area-opcoes-mc");
        if (!sel || !areaOpc) return;

        function atualizar() {
            areaOpc.style.display = sel.value === "multipla_escolha" ? "" : "none";
        }
        sel.addEventListener("change", atualizar);
        atualizar();
    }

    function configurarFormAdicionarQuestao() {
        const form = document.getElementById("form-adicionar-questao");
        if (!form) return;

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!atividadeAtualId) return;

            const btn = form.querySelector("button[type='submit']");
            if (btn) btn.disabled = true;

            const tipo      = form.querySelector("[name='tipo']")?.value;
            const enunciado = form.querySelector("[name='enunciado']")?.value.trim();
            const gabarito  = tipo === "multipla_escolha"
                ? form.querySelector("[name='gabarito']")?.value
                : null;
            const opcoes    = tipo === "multipla_escolha"
                ? [
                    form.querySelector("[name='opcao_a']")?.value.trim(),
                    form.querySelector("[name='opcao_b']")?.value.trim(),
                    form.querySelector("[name='opcao_c']")?.value.trim(),
                    form.querySelector("[name='opcao_d']")?.value.trim()
                  ].filter(Boolean)
                : null;

            if (!enunciado) {
                mostrarAviso("Enunciado é obrigatório.");
                if (btn) btn.disabled = false;
                return;
            }

            try {
                showLoading();
                const resp  = await api("/api/atividades/" + atividadeAtualId + "/questoes", {
                    method: "POST",
                    body: JSON.stringify({ tipo, enunciado, opcoes, gabarito })
                });
                const dados = await resp.json();
                if (dados.status !== "ok") throw new Error(dados.message);

                const lista = document.getElementById("lista-questoes-adicionadas");
                if (lista) {
                    const item = document.createElement("p");
                    item.textContent = "✓ Questão " + dados.questao.ordem + " — " + tipo.replace("_", " ") + ": " + enunciado.substring(0, 60) + "...";
                    lista.appendChild(item);
                }

                form.reset();
                configurarTipoQuestao(); // re-aplica visibilidade após reset
                mostrarAviso("Questão adicionada.");
            } catch {
                showError("Não foi possível adicionar questão. Tente novamente.");
            } finally {
                hideLoading();
                if (btn) btn.disabled = false;
            }
        });
    }

    function finalizarAdicaoQuestoes() {
        document.getElementById("secao-adicionar-questoes").style.display = "none";
        atividadeAtualId     = null;
        atividadeAtualTitulo = "";
        mostrarAviso("Atividade salva com questões.");
        carregarAtividadesProfessor();
    }

    async function carregarAtividadesProfessor() {
        const lista = document.getElementById("lista-atividades-professor");
        if (!lista) return;
        try {
            showLoading();
            const resp  = await api("/api/atividades");
            const dados = await resp.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            if (!dados.atividades.length) {
                lista.innerHTML = "<p><em>Nenhuma atividade criada ainda.</em></p>";
                return;
            }

            lista.innerHTML = dados.atividades.map(a => `
                <article class="item-atividade">
                    <div>
                        <div class="linha-meta">
                            <strong>${a.titulo}</strong>
                            <span class="etiqueta">${a.total_entregas} entrega(s)</span>
                        </div>
                        <p>${a.turma_nome} · ${a.total_questoes} questão(ões)${a.prazo ? " · Prazo: " + new Date(a.prazo).toLocaleDateString("pt-BR") : ""}</p>
                    </div>
                    <button class="botao botao-pequeno" data-acao-entregas="${a.id}" data-titulo-entregas="${a.titulo}">
                        Ver entregas
                    </button>
                </article>
            `).join("");

            lista.querySelectorAll("[data-acao-entregas]").forEach(btn => {
                btn.addEventListener("click", () =>
                    abrirEntregas(btn.dataset.acaoEntregas, btn.dataset.tituloEntregas)
                );
            });
        } catch {
            lista.innerHTML = "<p class='erro-inline'>Não foi possível carregar atividades.</p>";
            showError("Não foi possível carregar atividades.");
        } finally {
            hideLoading();
        }
    }

    async function abrirEntregas(atividadeId, titulo) {
        const secao  = document.getElementById("secao-entregas");
        const lista  = document.getElementById("lista-entregas-alunos");
        const elTit  = document.getElementById("entregas-atividade-titulo");
        if (!secao || !lista) return;

        if (elTit) elTit.textContent = titulo;
        secao.style.display = "";
        secao.scrollIntoView({ behavior: "smooth" });

        try {
            showLoading();
            const resp  = await api("/api/atividades/" + atividadeId + "/entregas");
            const dados = await resp.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            if (!dados.entregas.length) {
                lista.innerHTML = "<p><em>Nenhum aluno nesta turma.</em></p>";
                return;
            }

            lista.innerHTML = `
                <table class="tabela-desempenho">
                    <thead><tr>
                        <th>Aluno</th><th>Status</th><th>Acertos</th><th>Total</th><th>Dissertativas</th><th>Enviado em</th>
                    </tr></thead>
                    <tbody>
                        ${dados.entregas.map(e => `
                            <tr>
                                <td>${e.nome}</td>
                                <td><span class="etiqueta ${e.status === "entregue" ? "status-entregue" : ""}">${e.status}</span></td>
                                <td>${e.acertos || 0}</td>
                                <td>${e.total_questoes || 0}</td>
                                <td>${e.dissertativas_pendentes || 0} aguardando</td>
                                <td>${e.enviado_em ? new Date(e.enviado_em).toLocaleString("pt-BR") : "--"}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            `;
        } catch {
            lista.innerHTML = "<p class='erro-inline'>Não foi possível carregar entregas.</p>";
            showError("Não foi possível carregar entregas.");
        } finally {
            hideLoading();
        }
    }

    function fecharEntregas() {
        const secao = document.getElementById("secao-entregas");
        if (secao) secao.style.display = "none";
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW ALUNO
    // ═══════════════════════════════════════════════════════════════════════════

    let filtroAtual = "todas";

    function iniciarAluno() {
        carregarAtividadesAluno();
        configurarFiltros();
        document.getElementById("btn-cancelar-resposta")
            ?.addEventListener("click", fecharResponder);
        document.getElementById("form-responder-atividade")
            ?.addEventListener("submit", submeterRespostas);
    }

    async function carregarAtividadesAluno() {
        try {
            showLoading();
            const resp  = await api("/api/alunos/atividades");
            const dados = await resp.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            renderizarAtividades(dados.atividades);
            atualizarContadores(dados.atividades);
        } catch {
            showError("Não foi possível carregar atividades.");
        } finally {
            hideLoading();
        }
    }

    function atualizarContadores(atividades) {
        const pendentes = atividades.filter(a => !a.status_entrega || a.status_entrega === "pendente");
        const entregues = atividades.filter(a => a.status_entrega && a.status_entrega !== "pendente");

        document.querySelectorAll("[data-total-pendentes]").forEach(el => el.textContent = pendentes.length);
        document.querySelectorAll("[data-total-entregues]").forEach(el => el.textContent = entregues.length);

        const proxima = pendentes.find(a => a.prazo);
        if (proxima) {
            const d = new Date(proxima.prazo).toLocaleDateString("pt-BR", { weekday: "short" });
            document.querySelectorAll("[data-proximo-prazo]").forEach(el => el.textContent = d);
            document.querySelectorAll("[data-proxima-atividade-titulo]").forEach(el => el.textContent = proxima.titulo);
            document.querySelectorAll("[data-proxima-atividade-desc]").forEach(el => {
                el.textContent = "Prazo: " + new Date(proxima.prazo).toLocaleDateString("pt-BR");
            });
            document.querySelectorAll("[data-link-responder]").forEach(el => {
                el.href = "#";
                el.dataset.abrirAtividade  = proxima.id;
                el.dataset.tituloAtividade = proxima.titulo;
                el.removeEventListener("click", abrirResponderHandler);
                el.addEventListener("click", abrirResponderHandler);
            });
        } else {
            document.querySelectorAll("[data-proxima-atividade-titulo]").forEach(el => el.textContent = "Tudo em dia!");
            document.querySelectorAll("[data-proxima-atividade-desc]").forEach(el => el.textContent = "Sem pendências no momento.");
        }
    }

    function abrirResponderHandler(e) {
        e.preventDefault();
        const el = e.currentTarget;
        abrirResponder(el.dataset.abrirAtividade, el.dataset.tituloAtividade);
    }

    function renderizarAtividades(atividades) {
        const lista = document.getElementById("lista-atividades-aluno");
        if (!lista) return;

        const filtradas = filtroAtual === "todas"
            ? atividades
            : filtroAtual === "pendente"
                ? atividades.filter(a => !a.status_entrega || a.status_entrega === "pendente")
                : atividades.filter(a => a.status_entrega && a.status_entrega !== "pendente");

        if (!filtradas.length) {
            lista.innerHTML = "<p><em>Nenhuma atividade encontrada.</em></p>";
            return;
        }

        lista.innerHTML = filtradas.map(a => {
            const entregue   = a.status_entrega && a.status_entrega !== "pendente";
            const etiqueta   = entregue ? "Entregue" : (a.prazo ? formatarPrazo(a.prazo) : "Pendente");
            const classeEtiq = entregue ? "etiqueta status-entregue" : "etiqueta";
            const prazoBadge = a.prazo ? "Prazo: " + new Date(a.prazo).toLocaleDateString("pt-BR") : "Sem prazo";
            return `
                <article class="item-atividade" data-grupo-atividade="${entregue ? "entregue" : "pendente"}">
                    <div>
                        <div class="linha-meta">
                            <strong>${a.titulo}</strong>
                            <span class="${classeEtiq}">${etiqueta}</span>
                        </div>
                        <p>${a.total_questoes} questão(ões) · ${prazoBadge}</p>
                        <div class="meta-atividade">
                            ${entregue ? "<span>Acertos: " + (a.total_acertos || 0) + "/" + a.total_questoes + "</span>" : ""}
                        </div>
                    </div>
                    ${!entregue
                        ? `<button class="botao botao-pequeno" data-abrir-atividade="${a.id}" data-titulo-atividade="${a.titulo}">Resolver</button>`
                        : `<button class="botao botao-pequeno botao-claro" data-ver-respostas="${a.id}" data-titulo-atividade="${a.titulo}">Revisar</button>`
                    }
                </article>
            `;
        }).join("");

        lista.querySelectorAll("[data-abrir-atividade]").forEach(btn => {
            btn.addEventListener("click", () => abrirResponder(btn.dataset.abrirAtividade, btn.dataset.tituloAtividade));
        });
        lista.querySelectorAll("[data-ver-respostas]").forEach(btn => {
            btn.addEventListener("click", () => verRespostas(btn.dataset.verRespostas, btn.dataset.tituloAtividade));
        });
    }

    function formatarPrazo(prazoStr) {
        const prazo = new Date(prazoStr);
        const hoje  = new Date();
        const diff  = Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24));
        if (diff < 0)   return "Atrasado";
        if (diff === 0) return "Hoje";
        if (diff === 1) return "Amanhã";
        if (diff <= 7)  return "Esta semana";
        return new Date(prazoStr).toLocaleDateString("pt-BR");
    }

    function configurarFiltros() {
        document.querySelectorAll("[data-filtro-atividade]").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll("[data-filtro-atividade]").forEach(b => b.classList.remove("ativo"));
                btn.classList.add("ativo");
                filtroAtual = btn.dataset.filtroAtividade;
                api("/api/alunos/atividades")
                    .then(r => r.json())
                    .then(d => { if (d.status === "ok") renderizarAtividades(d.atividades); })
                    .catch(() => showError("Não foi possível carregar. Tente novamente."));
            });
        });
    }

    async function abrirResponder(atividadeId, titulo) {
        const secao    = document.getElementById("secao-responder");
        const elTitulo = document.getElementById("responder-titulo");
        const areaQ    = document.getElementById("area-questoes-resposta");
        const feedback = document.getElementById("area-feedback-resposta");
        if (!secao || !areaQ) return;

        if (elTitulo) elTitulo.textContent = titulo;
        feedback.style.display = "none";
        secao.style.display = "";
        secao.scrollIntoView({ behavior: "smooth" });
        secao.dataset.atividadeId = atividadeId;

        try {
            showLoading();
            const resp  = await api("/api/atividades/" + atividadeId);
            const dados = await resp.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            areaQ.innerHTML = dados.atividade.questoes.map((q, i) => {
                const baseName = "resp_" + q.id;
                if (q.tipo === "multipla_escolha") {
                    const opcoes = Array.isArray(q.opcoes) ? q.opcoes : [];
                    return `
                        <fieldset data-questao-id="${q.id}">
                            <legend>${i + 1}. ${q.enunciado}</legend>
                            ${opcoes.map((op, idx) => {
                                const letra = ["a","b","c","d"][idx] || String(idx);
                                return `<label>
                                    <input type="radio" name="${baseName}" value="${letra}" required>
                                    ${op}
                                </label>`;
                            }).join("")}
                        </fieldset>
                    `;
                } else {
                    return `
                        <fieldset data-questao-id="${q.id}">
                            <legend>${i + 1}. ${q.enunciado}</legend>
                            <textarea name="${baseName}" rows="4" required placeholder="Digite sua resposta..."></textarea>
                        </fieldset>
                    `;
                }
            }).join("");
        } catch {
            areaQ.innerHTML = "<p class='erro-inline'>Não foi possível carregar questões. Tente novamente.</p>";
            showError("Não foi possível carregar questões.");
        } finally {
            hideLoading();
        }
    }

    async function submeterRespostas(e) {
        e.preventDefault();
        const secao       = document.getElementById("secao-responder");
        const areaQ       = document.getElementById("area-questoes-resposta");
        const feedback    = document.getElementById("area-feedback-resposta");
        const atividadeId = secao?.dataset.atividadeId;
        if (!atividadeId) return;

        const btn = e.target.querySelector("button[type='submit']");
        if (btn) btn.disabled = true;

        // Coleta respostas
        const respostas = [];
        areaQ.querySelectorAll("fieldset[data-questao-id]").forEach(fs => {
            const questaoId = parseInt(fs.dataset.questaoId, 10);
            const radio     = fs.querySelector("input[type='radio']:checked");
            const textarea  = fs.querySelector("textarea");
            const resposta  = radio ? radio.value : (textarea ? textarea.value.trim() : "");
            if (resposta) respostas.push({ questao_id: questaoId, resposta });
        });

        if (!respostas.length) {
            mostrarAviso("Responda ao menos uma questão.");
            if (btn) btn.disabled = false;
            return;
        }

        try {
            showLoading();
            const resp  = await api("/api/atividades/" + atividadeId + "/respostas", {
                method: "POST",
                body: JSON.stringify({ respostas })
            });
            const dados = await resp.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            // Mostra feedback
            areaQ.style.display  = "none";
            e.target.querySelector("button[type='submit']").style.display = "none";
            feedback.style.display = "";

            const acertos = dados.resultados.filter(r => r.correta === 1).length;
            const total   = dados.resultados.length;

            feedback.innerHTML = `
                <div class="cartao-painel">
                    <h3>Resultado: ${acertos} / ${total} acertos</h3>
                    ${dados.resultados.map(r => {
                        const fs = areaQ.querySelector("[data-questao-id='" + r.questao_id + "']");
                        const enunciado = fs ? fs.querySelector("legend")?.textContent : "Questão " + r.questao_id;
                        if (r.correta === null) {
                            return `<p>📝 ${enunciado} — <em>Aguardando correção</em></p>`;
                        }
                        if (r.correta === 1) {
                            return `<p>✅ ${enunciado}</p>`;
                        }
                        return `<p>❌ ${enunciado} — Gabarito: <strong>${r.gabarito_correto || "?"}</strong></p>`;
                    }).join("")}
                    <button type="button" class="botao botao-claro" id="btn-voltar-lista">Voltar para lista</button>
                </div>
            `;

            document.getElementById("btn-voltar-lista")?.addEventListener("click", () => {
                fecharResponder();
                carregarAtividadesAluno();
            });

        } catch {
            showError("Não foi possível enviar respostas. Tente novamente.");
            if (btn) btn.disabled = false;
        } finally {
            hideLoading();
        }
    }

    async function verRespostas(atividadeId, titulo) {
        const secao    = document.getElementById("secao-responder");
        const elTitulo = document.getElementById("responder-titulo");
        const areaQ    = document.getElementById("area-questoes-resposta");
        const feedback = document.getElementById("area-feedback-resposta");
        if (!secao) return;

        if (elTitulo) elTitulo.textContent = titulo + " (revisão)";
        areaQ.style.display    = "none";
        feedback.style.display = "";
        secao.style.display    = "";
        secao.scrollIntoView({ behavior: "smooth" });

        const form      = document.getElementById("form-responder-atividade");
        const submitBtn = form?.querySelector("button[type='submit']");
        if (submitBtn) submitBtn.style.display = "none";

        try {
            showLoading();
            const resp  = await api("/api/atividades/" + atividadeId + "/respostas");
            const dados = await resp.json();
            if (dados.status !== "ok") throw new Error(dados.message);

            if (!dados.respostas.length) {
                feedback.innerHTML = "<p><em>Nenhuma resposta registrada.</em></p>";
                return;
            }

            feedback.innerHTML = `
                <div class="cartao-painel">
                    <h3>Suas respostas</h3>
                    ${dados.respostas.map(r => {
                        const icone = r.correta === 1 ? "✅" : r.correta === 0 ? "❌" : "📝";
                        const label = r.correta === null ? "Aguardando correção" :
                                      r.correta === 1    ? "Correto" : "Incorreto";
                        return `<p>${icone} Questão ${r.questao_id}: <em>${r.resposta}</em> — ${label}</p>`;
                    }).join("")}
                    <button type="button" class="botao botao-claro" id="btn-voltar-lista-rev">Voltar</button>
                </div>
            `;

            document.getElementById("btn-voltar-lista-rev")?.addEventListener("click", fecharResponder);

        } catch {
            feedback.innerHTML = "<p class='erro-inline'>Não foi possível carregar respostas.</p>";
            showError("Não foi possível carregar respostas.");
        } finally {
            hideLoading();
        }
    }

    function fecharResponder() {
        const secao    = document.getElementById("secao-responder");
        const areaQ    = document.getElementById("area-questoes-resposta");
        const feedback = document.getElementById("area-feedback-resposta");
        const form     = document.getElementById("form-responder-atividade");
        const btn      = form?.querySelector("button[type='submit']");

        if (secao)    secao.style.display    = "none";
        if (areaQ)    areaQ.style.display    = "";
        if (feedback) feedback.style.display = "none";
        if (btn)      { btn.style.display = ""; btn.disabled = false; }
    }

})();

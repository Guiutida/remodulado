const botoes = document.querySelectorAll("[data-abrir]");
const paineis = document.querySelectorAll("[data-painel]");
const fundo = document.querySelector(".fundo-painel");
const fechar = document.querySelectorAll("[data-fechar]");
const prefixoConfig = "duopratic_config_";
let fotoTemporaria = "";
let funcoesConcluida = false;
let preferenciasUsuario = {};
const camposPreferenciaBanco = ["tema", "status", "foto", "notificacoes", "lembretes", "disciplina", "ritmo"];

function usuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem("duopratic_usuario")) || null;
    } catch {
        return null;
    }
}

function tokenAtual() {
    return localStorage.getItem("duopratic_token") || null;
}

function salvarUsuarioLocal(usuario) {
    if (!usuario) return;
    localStorage.setItem("duopratic_usuario", JSON.stringify(usuario));
    localStorage.setItem("duopratic_perfil", usuario.perfil);
}

function salvarPreferenciasLocal(preferencias) {
    Object.entries(preferencias).forEach(([campo, valor]) => {
        preferenciasUsuario[campo] = valor;
        localStorage.setItem(prefixoConfig + campo, valor);
    });
}

async function buscarPreferenciasBanco() {
    const usuario = usuarioLogado();
    if (!usuario?.id) return;

    try {
        const resposta = await fetch(`/api/usuarios/${usuario.id}/preferencias`, {
            headers: { "Authorization": `Bearer ${tokenAtual()}` }
        });
        if (resposta.status === 401) {
            localStorage.removeItem("duopratic_token");
            localStorage.removeItem("duopratic_usuario");
            window.location.href = "../pages/login.html";
            return;
        }
        const resultado = await resposta.json();

        if (resposta.ok) {
            salvarPreferenciasLocal(resultado.preferencias);
            aplicarTema();
            aplicarFotoPerfil();
            aplicarStatus();
            preencherCamposPreferencias();
        }
    } catch {
        mostrarAviso("Nao foi possivel carregar preferencias");
    }
}

async function salvarPreferenciaBanco(campo, valor) {
    const usuario = usuarioLogado();
    if (!usuario?.id || !camposPreferenciaBanco.includes(campo)) return;

    const resposta = await fetch(`/api/usuarios/${usuario.id}/preferencias`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tokenAtual()}`
        },
        body: JSON.stringify({ [campo]: valor })
    });
    const resultado = await resposta.json();

    if (!resposta.ok) {
        throw new Error(resultado.message || "Nao foi possivel salvar preferencias.");
    }

    salvarPreferenciasLocal(resultado.preferencias);
}

async function buscarUsuarioBanco() {
    const usuario = usuarioLogado();
    if (!usuario || !usuario.id) return;

    try {
        const resposta = await fetch(`/api/usuarios/${usuario.id}`, {
            headers: { "Authorization": `Bearer ${tokenAtual()}` }
        });
        if (resposta.status === 401) {
            localStorage.removeItem("duopratic_token");
            localStorage.removeItem("duopratic_usuario");
            window.location.href = "../pages/login.html";
            return;
        }
        const resultado = await resposta.json();

        if (resposta.ok) {
            salvarUsuarioLocal(resultado.usuario);
            aplicarNomeUsuario();
            preencherCamposConta();
        }
    } catch {
        mostrarAviso("Não foi possível atualizar dados da conta");
    }
}

async function salvarUsuarioBanco(campo, valor) {
    const usuario = usuarioLogado();
    if (!usuario || !usuario.id || !["nome", "email", "senha"].includes(campo)) return;

    const resposta = await fetch(`/api/usuarios/${usuario.id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tokenAtual()}`
        },
        body: JSON.stringify({ [campo]: valor })
    });
    const resultado = await resposta.json();

    if (!resposta.ok) {
        throw new Error(resultado.message || "Não foi possível salvar no banco.");
    }

    salvarUsuarioLocal(resultado.usuario);
}

function salvarConfig(campo, valor) {
    const usuario = usuarioLogado();

    if (campo === "nome" && usuario) {
        usuario.nome = valor;
        salvarUsuarioLocal(usuario);
    }

    if (campo === "email" && usuario) {
        usuario.email = valor;
        salvarUsuarioLocal(usuario);
    }

    preferenciasUsuario[campo] = valor;
    localStorage.setItem(prefixoConfig + campo, valor);

    if (camposPreferenciaBanco.includes(campo)) {
        salvarPreferenciaBanco(campo, valor).catch(() => {
            mostrarAviso("Preferencia salva apenas neste navegador");
        });
    }
}

function buscarConfig(campo, padrao) {
    const usuario = usuarioLogado();

    if (campo === "nome" && usuario?.nome) return usuario.nome;
    if (campo === "email" && usuario?.email) return usuario.email;
    if (preferenciasUsuario[campo] !== undefined) return preferenciasUsuario[campo];

    return localStorage.getItem(prefixoConfig + campo) || padrao;
}

function aplicarTema() {
    const tema = buscarConfig("tema", "Claro");
    document.body.classList.toggle("tema-escuro", tema === "Escuro");
}

function aplicarFotoPerfil() {
    const foto = buscarConfig("foto", "");
    const inicial = primeiroNome(buscarConfig("nome", "Guilherme")).charAt(0).toUpperCase();

    document.querySelectorAll(".avatar-aluno, .avatar-mini").forEach((avatar) => {
        avatar.classList.toggle("com-foto", !!foto);
        avatar.style.backgroundImage = foto ? `url(${foto})` : "";
        if (!foto) {
            avatar.childNodes[0].nodeValue = inicial;
        }
    });
}

function primeiroNome(nome) {
    return nome.trim().split(" ")[0] || "Guilherme";
}

function aplicarNomeUsuario() {
    const nome = buscarConfig("nome", "Guilherme Utida");

    document.querySelectorAll("[data-nome-usuario]").forEach((campo) => {
        campo.textContent = nome;
    });

    document.querySelectorAll(".cabecalho-aluno > div > span").forEach((campo) => {
        if (campo.textContent.includes("Bom estudo")) {
            campo.textContent = `Bom estudo, ${primeiroNome(nome)}`;
        }
    });

    aplicarFotoPerfil();
}

function aplicarStatus() {
    const status = buscarConfig("status", "Online");
    const cores = { Online: "#22c55e", Ausente: "#fb923c", Ocupado: "#ef4444", Offline: "#94a3b8" };

    document.querySelectorAll("[data-status-texto]").forEach((campo) => {
        campo.textContent = status;
    });

    document.querySelectorAll("[data-status-ponto], .avatar-aluno span").forEach((ponto) => {
        ponto.style.background = cores[status] || cores.Online;
    });
}

aplicarTema();
aplicarFotoPerfil();
aplicarNomeUsuario();
aplicarStatus();
buscarUsuarioBanco();
buscarPreferenciasBanco();
buscarProgressoFuncoesBanco();

function aplicarProgressoFuncoes(concluido = funcoesConcluida) {
    if (!concluido) return;

    document.querySelectorAll(".destaque-aluno, .cartao-destaque-pequeno").forEach((card) => {
        const titulo = card.querySelector("h2");
        if (!titulo || !titulo.textContent.includes("Fun")) return;

        const texto = card.querySelector("p");
        const barra = card.querySelector(".barra span");
        const botao = card.querySelector(".botao");

        if (texto) texto.textContent = "Etapa concluída. A próxima atividade já pode ser iniciada pela trilha.";
        if (barra) barra.style.width = "85%";
        if (botao) botao.textContent = "Continuar trilha";
    });

    document.querySelectorAll(".indicadores-aluno .cartao-painel").forEach((card) => {
        if (card.textContent.includes("Progresso")) {
            const valor = card.querySelector("strong");
            if (valor) valor.textContent = "85%";
        }
    });

    document.querySelectorAll(".etiqueta").forEach((etiqueta) => {
        if (etiqueta.textContent.trim() === "72%") {
            etiqueta.textContent = "85%";
        }
    });

    document.querySelectorAll(".etapas-trilha").forEach((lista) => {
        const etapas = lista.querySelectorAll("span");
        etapas.forEach((etapa, indice) => {
            etapa.classList.toggle("feito", indice < 3);
            etapa.classList.toggle("ativo", indice === 3);
        });
    });

    document.querySelectorAll("[data-atividade-funcoes]").forEach((card) => {
        card.dataset.grupoAtividade = "entregue";
        const status = card.querySelector("[data-status-funcoes]");
        const link = card.querySelector("[data-link-funcoes]");
        if (status) {
            status.textContent = "Entregue";
            status.classList.add("status-entregue");
        }
        if (link) {
            link.textContent = "Revisar";
            link.classList.add("botao-claro");
        }
    });

    document.querySelectorAll("[data-total-pendentes]").forEach((campo) => campo.textContent = "2");
    document.querySelectorAll("[data-total-entregues]").forEach((campo) => campo.textContent = "9");
    document.querySelectorAll("[data-atividade-principal]").forEach((campo) => {
        campo.textContent = "Atividade entregue. Você pode revisar o raciocínio ou continuar pela próxima tarefa.";
    });
    document.querySelectorAll("[data-botao-atividade-principal]").forEach((botao) => {
        botao.textContent = "Revisar atividade";
    });
}

async function buscarProgressoFuncoesBanco() {
    const usuario = usuarioLogado();
    if (!usuario?.id) return;

    try {
        const resposta = await fetch(`/api/alunos/${usuario.id}/progresso/funcoes`, {
            headers: { "Authorization": `Bearer ${tokenAtual()}` }
        });
        if (resposta.status === 401) {
            localStorage.removeItem("duopratic_token");
            localStorage.removeItem("duopratic_usuario");
            window.location.href = "../pages/login.html";
            return;
        }
        const resultado = await resposta.json();

        if (resposta.ok) {
            funcoesConcluida = !!resultado.concluido;
            aplicarProgressoFuncoes();
        }
    } catch {
        mostrarAviso("Nao foi possivel buscar seu progresso");
    }
}

async function marcarFuncoesConcluidaBanco() {
    const usuario = usuarioLogado();

    if (!usuario?.id) {
        funcoesConcluida = true;
        aplicarProgressoFuncoes();
        return;
    }

    const resposta = await fetch(`/api/alunos/${usuario.id}/progresso/funcoes`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${tokenAtual()}` }
    });
    const resultado = await resposta.json();

    if (!resposta.ok) {
        throw new Error(resultado.message || "Nao foi possivel salvar o progresso.");
    }

    funcoesConcluida = true;
    aplicarProgressoFuncoes();
}

function fecharPaineis() {
    paineis.forEach((painel) => painel.classList.remove("aberto"));
    document.querySelectorAll("[data-status-menu]").forEach((menu) => menu.classList.remove("aberto"));
    if (fundo) fundo.classList.remove("aberto");
}

function abrirPainel(nome) {
    const painel = document.querySelector(`[data-painel="${nome}"]`);

    if (!painel) return;

    const jaAberto = painel.classList.contains("aberto");
    fecharPaineis();

    if (!jaAberto) {
        painel.classList.add("aberto");

        if (nome !== "perfil" && fundo) {
            fundo.classList.add("aberto");
        }
    }
}

botoes.forEach((botao) => {
    botao.addEventListener("click", () => abrirPainel(botao.dataset.abrir));
});

fechar.forEach((botao) => {
    botao.addEventListener("click", fecharPaineis);
});

document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
        fecharPaineis();
    }
});

document.addEventListener("click", (evento) => {
    const clicouEmAcao = evento.target.closest(".acoes-aluno");
    const clicouEmPainel = evento.target.closest(".painel-lateral");

    if (!clicouEmAcao && !clicouEmPainel) {
        fecharPaineis();
    }
});

function mostrarAviso(texto) {
    const avisoAtual = document.querySelector(".aviso-config");

    if (avisoAtual) {
        avisoAtual.remove();
    }

    const aviso = document.createElement("div");
    aviso.className = "aviso-config";
    aviso.textContent = texto;
    document.body.appendChild(aviso);
    setTimeout(() => aviso.remove(), 1800);
}

function editarCampo(botao) {
    const campo = botao.dataset.config;
    const valorAtual = botao.textContent.trim();
    const editor = document.createElement("input");
    let fechou = false;

    editor.className = "editor-config";
    editor.type = campo === "senha" ? "password" : campo === "email" ? "email" : "text";
    editor.value = valorAtual === "********" ? "" : valorAtual;
    botao.replaceWith(editor);
    editor.focus();

    async function finalizar(salvar) {
        if (fechou) return;
        fechou = true;

        const novoValor = editor.value.trim();

        if (salvar && novoValor) {
            try {
                if (["nome", "email", "senha"].includes(campo)) {
                    await salvarUsuarioBanco(campo, novoValor);
                }

                botao.textContent = campo === "senha" ? "********" : novoValor;
                salvarConfig(campo, botao.textContent);
                if (campo === "nome") aplicarNomeUsuario();
                mostrarAviso("Configuração salva");
            } catch (erro) {
                mostrarAviso(erro.message);
            }
        }

        editor.replaceWith(botao);
    }

    editor.addEventListener("blur", () => finalizar(true));
    editor.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter") finalizar(true);
        if (evento.key === "Escape") finalizar(false);
    });
}

document.querySelectorAll(".valor-config").forEach((botao) => {
    const campo = botao.dataset.config;
    botao.textContent = buscarConfig(campo, botao.dataset.padrao);

    botao.addEventListener("click", () => {
        const opcoes = botao.dataset.opcoes;
        let valor = botao.textContent.trim();

        if (opcoes) {
            const lista = opcoes.split("|");
            const atual = lista.indexOf(valor);
            valor = lista[(atual + 1) % lista.length];
            botao.textContent = valor;
            salvarConfig(campo, valor);

            if (campo === "tema") {
                aplicarTema();
            }

            mostrarAviso("Configuração salva");
        } else {
            editarCampo(botao);
        }
    });
});

function preencherCamposConta() {
    document.querySelectorAll(".valor-config").forEach((botao) => {
        const campo = botao.dataset.config;

        if (campo === "nome" || campo === "email") {
            botao.textContent = buscarConfig(campo, botao.dataset.padrao);
        }
    });
}

function preencherCamposPreferencias() {
    document.querySelectorAll(".valor-config").forEach((botao) => {
        const campo = botao.dataset.config;

        if (camposPreferenciaBanco.includes(campo)) {
            botao.textContent = buscarConfig(campo, botao.dataset.padrao);
        }
    });

    document.querySelectorAll("[data-config-toggle]").forEach((toggle) => {
        const campo = toggle.dataset.configToggle;
        const ativo = buscarConfig(campo, "true") === "true" || buscarConfig(campo, true) === true;
        toggle.classList.toggle("ligado", ativo);
    });
}

document.querySelectorAll("[data-config-toggle]").forEach((toggle) => {
    const campo = toggle.dataset.configToggle;
    const ativo = buscarConfig(campo, "true") === "true";
    toggle.classList.toggle("ligado", ativo);

    toggle.addEventListener("click", () => {
        const ligado = !toggle.classList.contains("ligado");
        toggle.classList.toggle("ligado", ligado);
        salvarConfig(campo, ligado);
        mostrarAviso("Configuração salva");
    });
});

document.querySelectorAll("[data-status-botao]").forEach((botao) => {
    botao.addEventListener("click", (evento) => {
        evento.stopPropagation();
        const menu = botao.closest(".menu-perfil").querySelector("[data-status-menu]");
        if (menu) menu.classList.toggle("aberto");
    });
});

document.querySelectorAll("[data-status]").forEach((botao) => {
    botao.addEventListener("click", (evento) => {
        evento.stopPropagation();
        salvarConfig("status", botao.dataset.status);
        aplicarStatus();
        botao.closest("[data-status-menu]").classList.remove("aberto");
        mostrarAviso("Status atualizado");
    });
});

document.querySelectorAll(".item-foto").forEach((elemento) => {
    elemento.addEventListener("click", () => {
        abrirModalFoto();
    });
});

document.querySelectorAll("[data-input-foto]").forEach((input) => {
    input.addEventListener("change", () => {
        carregarFoto(input.files[0]);
        input.value = "";
    });
});

function abrirModalFoto() {
    const modal = document.querySelector("[data-modal-foto]");
    if (!modal) return;

    fotoTemporaria = buscarConfig("foto", "");
    atualizarModalFoto(fotoTemporaria);
    modal.classList.add("aberto");
}

function fecharModalFoto() {
    const modal = document.querySelector("[data-modal-foto]");
    if (!modal) return;

    modal.classList.remove("aberto", "com-preview");
    fotoTemporaria = "";
}

function atualizarModalFoto(foto) {
    const modal = document.querySelector("[data-modal-foto]");
    const preview = document.querySelector("[data-preview-foto]");
    const salvar = document.querySelector("[data-salvar-foto]");
    const texto = document.querySelector("[data-texto-foto]");

    if (!modal || !preview || !salvar) return;

    modal.classList.toggle("com-preview", !!foto);
    preview.src = foto || "";
    salvar.disabled = !foto;

    if (texto) {
        texto.textContent = foto ? "Corte sua foto do perfil." : "A foto do perfil deve ser um arquivo JPG, JPEG, GIF ou PNG com menos de 5 MB.";
    }
}

function carregarFoto(arquivo) {
    if (!arquivo) return;

    const formatos = ["image/jpeg", "image/png", "image/gif"];

    if (!formatos.includes(arquivo.type)) {
        mostrarAviso("Use JPG, PNG ou GIF");
        return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
        mostrarAviso("Imagem maior que 5 MB");
        return;
    }

    const leitor = new FileReader();
    leitor.onload = () => {
        fotoTemporaria = leitor.result;
        atualizarModalFoto(fotoTemporaria);
    };
    leitor.readAsDataURL(arquivo);
}

document.querySelectorAll("[data-fechar-foto], [data-cancelar-foto]").forEach((botao) => {
    botao.addEventListener("click", fecharModalFoto);
});

document.querySelectorAll("[data-escolher-foto], [data-alterar-foto]").forEach((botao) => {
    botao.addEventListener("click", (evento) => {
        evento.stopPropagation();
        const input = document.querySelector("[data-input-foto]");
        if (input) input.click();
    });
});

document.querySelectorAll("[data-excluir-foto]").forEach((botao) => {
    botao.addEventListener("click", () => {
        fotoTemporaria = "";
        salvarConfig("foto", "");
        aplicarFotoPerfil();
        atualizarModalFoto("");
        mostrarAviso("Foto removida");
    });
});

document.querySelectorAll("[data-salvar-foto]").forEach((botao) => {
    botao.addEventListener("click", () => {
        if (!fotoTemporaria) return;

        salvarConfig("foto", fotoTemporaria);
        aplicarFotoPerfil();
        fecharModalFoto();
        mostrarAviso("Foto atualizada");
    });
});

document.querySelectorAll("[data-area-upload]").forEach((area) => {
    area.addEventListener("dragover", (evento) => {
        evento.preventDefault();
        area.classList.add("arrastando");
    });

    area.addEventListener("dragleave", () => area.classList.remove("arrastando"));

    area.addEventListener("drop", (evento) => {
        evento.preventDefault();
        area.classList.remove("arrastando");
        carregarFoto(evento.dataTransfer.files[0]);
    });
});

document.querySelectorAll(".opcoes-estudo button").forEach((botao) => {
    botao.addEventListener("click", () => {
        botao.parentElement.querySelectorAll("button").forEach((item) => item.classList.remove("selecionado"));
        botao.classList.add("selecionado");
    });
});

let etapaEstudo = 1;
let feedbackMostrado = false;

function mostrarFeedbackEstudo() {
    const resposta = document.querySelector(".opcoes-estudo .selecionado");
    const feedback = document.querySelector("[data-feedback-estudo]");
    const titulo = document.querySelector("[data-feedback-titulo]");
    const texto = document.querySelector("[data-feedback-texto]");
    const botao = document.querySelector("[data-concluir-estudo]");

    if (!feedback || !titulo || !texto || !botao) return true;

    if (!resposta) {
        mostrarAviso("Escolha uma resposta antes de continuar");
        return false;
    }

    const acertou = resposta.textContent.trim() === "Aumenta";
    feedback.hidden = false;
    feedback.classList.toggle("atencao", !acertou);
    titulo.textContent = acertou ? "Boa escolha" : "Vamos ajustar esse raciocínio";
    texto.textContent = acertou
        ? "Como o número que multiplica x é positivo, y cresce quando x aumenta. Agora escreva isso com suas palavras."
        : "Observe que 2x fica maior quando x aumenta. Por isso, nessa função, y também aumenta.";
    botao.textContent = "Avançar para revisão";

    return true;
}

function atualizarEtapaEstudo() {
    const etapas = document.querySelectorAll("[data-etapas-estudo] span");
    const etapaTexto = document.querySelector("[data-etapa-texto]");
    const aulaTitulo = document.querySelector("[data-aula-titulo]");
    const aulaTexto = document.querySelector("[data-aula-texto]");
    const bloco = document.querySelector("[data-bloco-estudo]");
    const pergunta = document.querySelector("[data-pergunta-estudo]");
    const label = document.querySelector("[data-label-resposta]");
    const textoIa = document.querySelector("[data-texto-ia]");
    const proximo = document.querySelector("[data-proximo-estudo]");
    const botao = document.querySelector("[data-concluir-estudo]");

    if (!etapas.length || !botao) return;

    feedbackMostrado = false;
    document.querySelectorAll(".opcoes-estudo button").forEach((item) => item.classList.remove("selecionado"));
    document.querySelectorAll("[data-feedback-estudo]").forEach((feedback) => {
        feedback.hidden = true;
        feedback.classList.remove("atencao");
    });

    etapas.forEach((etapa, indice) => {
        etapa.classList.toggle("feito", indice < etapaEstudo);
        etapa.classList.toggle("ativo", indice === etapaEstudo);
    });

    if (etapaEstudo === 2) {
        etapaTexto.textContent = "Etapa 3 de 4";
        aulaTitulo.textContent = "Revisão rápida";
        aulaTexto.innerHTML = "Se o número que multiplica o <strong>x</strong> é positivo, a função cresce. Por isso, em <strong>y = 2x + 4</strong>, quando x aumenta, y também aumenta.";
        bloco.textContent = "Fixação";
        pergunta.textContent = "Complete a ideia principal da aula.";
        label.textContent = "Escreva uma frase curta de revisão";
        textoIa.textContent = "A IA pode comparar sua explicação com a ideia principal e apontar o que ficou claro ou confuso.";
        proximo.textContent = "Depois da revisão, a trilha registra a conclusão desta etapa.";
        botao.textContent = "Finalizar revisão";
    }

    if (etapaEstudo === 3) {
        marcarFuncoesConcluidaBanco().catch((erro) => mostrarAviso(erro.message));
        etapaTexto.textContent = "Etapa 4 de 4";
        aulaTitulo.textContent = "Etapa concluída";
        aulaTexto.textContent = "Você praticou, explicou seu raciocínio e revisou o conceito principal.";
        bloco.textContent = "Conclusão";
        pergunta.textContent = "Bom trabalho. Continue para a próxima atividade quando quiser.";
        label.textContent = "Anotação opcional";
        textoIa.textContent = "Na próxima versão, este espaço pode guardar um resumo personalizado do seu desempenho.";
        proximo.textContent = "Volte para suas trilhas para continuar estudando.";
        botao.textContent = "Voltar para trilhas";
    }
}

document.querySelectorAll("[data-concluir-estudo]").forEach((botao) => {
    botao.addEventListener("click", () => {
        if (etapaEstudo === 3) {
            window.location.href = "trilhas.html";
            return;
        }

        if (etapaEstudo === 1 && !feedbackMostrado) {
            feedbackMostrado = mostrarFeedbackEstudo();
            return;
        }

        etapaEstudo += 1;
        atualizarEtapaEstudo();
        mostrarAviso("Etapa atualizada");
    });
});

document.querySelectorAll("[data-filtro-atividade]").forEach((botao) => {
    botao.addEventListener("click", () => {
        const filtro = botao.dataset.filtroAtividade;

        document.querySelectorAll("[data-filtro-atividade]").forEach((item) => item.classList.remove("ativo"));
        botao.classList.add("ativo");

        document.querySelectorAll("[data-grupo-atividade]").forEach((card) => {
            const mostrar = filtro === "todas" || card.dataset.grupoAtividade === filtro;
            card.style.display = mostrar ? "" : "none";
        });
    });
});

function responderIa(tipo, perguntaDigitada) {
    const pergunta = perguntaDigitada || "essa dúvida";
    const respostas = {
        dica: `Pense em uma parte menor do problema: em ${pergunta}, qual informação muda primeiro? Depois observe o que acontece com o resultado.`,
        erro: `Procure o ponto em que seu raciocínio mudou de direção. Muitas vezes o erro aparece quando você pula uma etapa sem explicar o motivo.`,
        exemplo: "Pergunta parecida: se y = 3x + 2, o que acontece com y quando x aumenta? Explique antes de calcular.",
        resumo: "Resumo: identifique o que muda, compare com o resultado e escreva a relação com suas próprias palavras."
    };

    return respostas[tipo] || `Boa pergunta. Comece explicando o que você já entendeu sobre: ${pergunta}. Depois marque exatamente onde ficou confuso.`;
}

function registrarHistoricoIa(pergunta) {
    const historico = document.querySelector("[data-historico-ia]");
    if (!historico || !pergunta) return;

    const item = document.createElement("div");
    item.className = "cartao-linha";
    item.innerHTML = `<strong>Dúvida recente</strong><p>${pergunta}</p>`;
    historico.prepend(item);

    while (historico.children.length > 3) {
        historico.lastElementChild.remove();
    }
}

function enviarPerguntaIa(tipo = "geral") {
    const campo = document.querySelector("[data-pergunta-ia]");
    const resposta = document.querySelector("[data-resposta-ia]");
    if (!campo || !resposta) return;

    const pergunta = campo.value.trim();
    const texto = responderIa(tipo, pergunta);
    resposta.textContent = texto;
    registrarHistoricoIa(pergunta || texto.slice(0, 70));
    mostrarAviso("IA respondeu");
}

document.querySelectorAll("[data-atalho-ia]").forEach((botao) => {
    botao.addEventListener("click", () => enviarPerguntaIa(botao.dataset.atalhoIa));
});

document.querySelectorAll("[data-enviar-ia]").forEach((botao) => {
    botao.addEventListener("click", () => enviarPerguntaIa());
});

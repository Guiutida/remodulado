const botoes = document.querySelectorAll("[data-abrir]");
const paineis = document.querySelectorAll("[data-painel]");
const fundo = document.querySelector(".fundo-painel");
const fechar = document.querySelectorAll("[data-fechar]");
const prefixoConfig = "duopratic_config_";
let fotoTemporaria = "";

function salvarConfig(campo, valor) {
    localStorage.setItem(prefixoConfig + campo, valor);
}

function buscarConfig(campo, padrao) {
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
aplicarProgressoFuncoes();

function aplicarProgressoFuncoes() {
    const concluido = buscarConfig("funcoes_concluida", "false") === "true";

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

    function finalizar(salvar) {
        if (fechou) return;
        fechou = true;

        const novoValor = editor.value.trim();

        if (salvar && novoValor) {
            botao.textContent = campo === "senha" ? "********" : novoValor;
            salvarConfig(campo, botao.textContent);
            if (campo === "nome") aplicarNomeUsuario();
            mostrarAviso("Configuração salva");
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
        salvarConfig("funcoes_concluida", "true");
        aplicarProgressoFuncoes();
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

        etapaEstudo += 1;
        atualizarEtapaEstudo();
        mostrarAviso("Etapa atualizada");
    });
});

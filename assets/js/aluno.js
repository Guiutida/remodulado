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

    document.querySelectorAll(".avatar-aluno, .avatar-mini").forEach((avatar) => {
        avatar.classList.toggle("com-foto", !!foto);
        avatar.style.backgroundImage = foto ? `url(${foto})` : "";
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

function fecharPaineis() {
    paineis.forEach((painel) => painel.classList.remove("aberto"));
    fundo.classList.remove("aberto");
}

function abrirPainel(nome) {
    const painel = document.querySelector(`[data-painel="${nome}"]`);

    if (!painel) return;

    const jaAberto = painel.classList.contains("aberto");
    fecharPaineis();

    if (!jaAberto) {
        painel.classList.add("aberto");

        if (nome !== "perfil") {
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

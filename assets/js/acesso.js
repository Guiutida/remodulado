const formularioAcesso = document.querySelector("[data-form-acesso]");

function destinoPorPerfil(perfil) {
    return perfil === "professor" ? "professor.html" : "aluno.html";
}

function mostrarMensagem(texto) {
    const antiga = document.querySelector(".aviso-config");
    if (antiga) antiga.remove();

    const aviso = document.createElement("div");
    aviso.className = "aviso-config";
    aviso.textContent = texto;
    document.body.appendChild(aviso);
    setTimeout(() => aviso.remove(), 2200);
}

async function enviarAcesso(dados, tipo) {
    const rota = tipo === "cadastro" ? "/api/cadastro" : "/api/login";
    const baseApi = location.port === "3000" ? "" : "http://localhost:3000";
    const resposta = await fetch(baseApi + rota, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
    });

    const texto = await resposta.text();
    let resultado = {};

    try {
        resultado = texto ? JSON.parse(texto) : {};
    } catch {
        throw new Error("Abra o site pelo backend: http://localhost:3000/pages/cadastro.html");
    }

    if (!resposta.ok) {
        throw new Error(resultado.message || "Não foi possível continuar.");
    }

    return { token: resultado.token, usuario: resultado.usuario };
}

if (formularioAcesso) {
    formularioAcesso.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const dados = Object.fromEntries(new FormData(formularioAcesso));
        const tipo = formularioAcesso.dataset.tipoAcesso;
        const botao = formularioAcesso.querySelector("button");

        try {
            botao.disabled = true;
            botao.textContent = tipo === "cadastro" ? "Cadastrando..." : "Entrando...";

            const { token, usuario } = await enviarAcesso(dados, tipo);
            localStorage.setItem("duopratic_usuario", JSON.stringify(usuario));
            localStorage.setItem("duopratic_perfil", usuario.perfil);
            localStorage.setItem("duopratic_token", token);
            window.location.href = destinoPorPerfil(usuario.perfil);
        } catch (erro) {
            mostrarMensagem(erro.message);
            botao.disabled = false;
            botao.textContent = tipo === "cadastro" ? "Cadastrar" : "Entrar";
        }
    });
}

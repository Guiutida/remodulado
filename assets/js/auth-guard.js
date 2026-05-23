// Guard de autenticação para páginas protegidas.
// Incluir como PRIMEIRO script de cada página protegida.
// Uso: <body data-perfil-guard="aluno"> ou <body data-perfil-guard="professor">
// Sem valor em data-perfil-guard: verifica apenas autenticação, sem restrição de perfil.

(function guardarPagina() {
    const token = localStorage.getItem("duopratic_token");
    let usuario = null;

    try {
        usuario = JSON.parse(localStorage.getItem("duopratic_usuario"));
    } catch {
        usuario = null;
    }

    if (!token || !usuario) {
        window.location.href = "../pages/login.html";
        return;
    }

    const perfilEsperado = document.body.dataset.perfilGuard;

    if (perfilEsperado && usuario.perfil !== perfilEsperado) {
        window.location.href = usuario.perfil === "professor"
            ? "../pages/professor.html"
            : "../pages/aluno.html";
    }
})();

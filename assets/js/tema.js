const botaoTema = document.querySelector("[data-tema-toggle]");

function aplicarTemaSite() {
    const tema = localStorage.getItem("duopratic_config_tema") || "Claro";
    document.body.classList.toggle("tema-escuro", tema === "Escuro");

    if (botaoTema) {
        botaoTema.textContent = tema === "Escuro" ? "☀" : "☾";
    }
}

if (botaoTema) {
    botaoTema.addEventListener("click", () => {
        const escuro = document.body.classList.toggle("tema-escuro");
        localStorage.setItem("duopratic_config_tema", escuro ? "Escuro" : "Claro");
        aplicarTemaSite();
    });
}

aplicarTemaSite();

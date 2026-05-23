// backend/routes/atividades.js
const { Router } = require("express");
const { autenticar } = require("../middleware/auth");
const atividadesController = require("../controllers/atividadesController");

const roteador = Router();

function verificarProfessor(req, res, next) {
    if (req.usuario.perfil !== "professor") {
        return res.status(403).json({ status: "erro", message: "Apenas professores podem executar esta ação." });
    }
    next();
}

function verificarAluno(req, res, next) {
    if (req.usuario.perfil !== "aluno") {
        return res.status(403).json({ status: "erro", message: "Apenas alunos podem executar esta ação." });
    }
    next();
}

// ── Rotas sem parâmetro (literais antes de /:id) ─────────────────────────────
roteador.post("/",  autenticar, verificarProfessor, atividadesController.criarAtividade);
roteador.get("/",   autenticar, verificarProfessor, atividadesController.listarProfessor);

// ── Rotas com parâmetro ───────────────────────────────────────────────────────
roteador.post("/:id/questoes",  autenticar, verificarProfessor, atividadesController.adicionarQuestao);
roteador.get("/:id",            autenticar,                     atividadesController.getDetalhe);
// Nota: getDetalhe faz IDOR check internamente para professor e aluno

module.exports = roteador;

// backend/routes/alunos.js
const { Router } = require("express");
const { autenticar } = require("../middleware/auth");
const alunosController = require("../controllers/alunosController");

const roteador = Router();

function verificarAluno(req, res, next) {
    if (req.usuario.perfil !== "aluno") {
        return res.status(403).json({ status: "erro", message: "Apenas alunos podem executar esta ação." });
    }
    next();
}

// ── Rotas literais (antes de /:id) ───────────────────────────────────────────
roteador.get("/turma",      autenticar, verificarAluno, alunosController.getTurmaDoAluno);
roteador.get("/painel",     autenticar, verificarAluno, alunosController.getPainel);
roteador.get("/historico",  autenticar, verificarAluno, alunosController.getHistorico);
roteador.get("/atividades", autenticar, verificarAluno, alunosController.getAtividades);

// Nota: as rotas "/:id/progresso/funcoes" foram removidas — hardcoded, substituídas
//       pelos endpoints reais acima.

module.exports = roteador;

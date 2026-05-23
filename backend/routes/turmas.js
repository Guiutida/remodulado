const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const { autenticar } = require("../middleware/auth");
const turmasController = require("../controllers/turmasController");
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

const limitarEntrar = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { status: "erro", message: "Muitas tentativas. Aguarde 15 minutos." }
});

roteador.post("/", autenticar, verificarProfessor, turmasController.criar);
roteador.get("/", autenticar, verificarProfessor, turmasController.listar);
roteador.get("/:id/membros", autenticar, verificarProfessor, turmasController.getMembros);
roteador.delete("/:id/alunos/:alunoId", autenticar, verificarProfessor, turmasController.removerMembro);
roteador.post("/entrar", autenticar, verificarAluno, limitarEntrar, turmasController.entrar);

roteador.get("/:id/desempenho", autenticar, verificarProfessor, atividadesController.getDesempenhoTurma);

module.exports = roteador;

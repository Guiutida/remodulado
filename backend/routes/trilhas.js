const { Router } = require("express");
const { autenticar } = require("../middleware/auth");
const trilhasController = require("../controllers/trilhasController");

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

// rotas literais antes de rotas com parâmetros para evitar conflito de matching
roteador.post("/", autenticar, verificarProfessor, trilhasController.criar);
roteador.get("/minhas", autenticar, verificarProfessor, trilhasController.listarProfessor);
roteador.get("/disponiveis", autenticar, verificarAluno, trilhasController.listarAluno);
roteador.get("/:id", autenticar, trilhasController.getDetalhe);
roteador.post("/:id/etapas", autenticar, verificarProfessor, trilhasController.adicionarEtapa);
roteador.put("/:id/etapas/:etapaId/progresso", autenticar, verificarAluno, trilhasController.marcarProgresso);

module.exports = roteador;

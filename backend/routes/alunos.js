const { Router } = require("express");
const { autenticar } = require("../middleware/auth");
const alunosController = require("../controllers/alunosController");

const roteador = Router();

function verificarProprioAluno(req, res, next) {
    const idRequisitado = parseInt(req.params.id, 10);
    if (req.usuario.id !== idRequisitado) {
        return res.status(403).json({ status: "erro", message: "Acesso negado." });
    }
    next();
}

roteador.get("/:id/progresso/funcoes", autenticar, verificarProprioAluno, alunosController.getProgressoFuncoes);
roteador.post("/:id/progresso/funcoes", autenticar, verificarProprioAluno, alunosController.salvarProgressoFuncoes);

module.exports = roteador;

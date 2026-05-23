const { Router } = require("express");
const { autenticar } = require("../middleware/auth");
const usuariosController = require("../controllers/usuariosController");

const roteador = Router();

function verificarProprioUsuario(req, res, next) {
    const idRequisitado = parseInt(req.params.id, 10);
    if (req.usuario.id !== idRequisitado && req.usuario.perfil !== "professor") {
        return res.status(403).json({ status: "erro", message: "Acesso negado." });
    }
    next();
}

roteador.get("/:id", autenticar, verificarProprioUsuario, usuariosController.getUsuario);
roteador.put("/:id", autenticar, verificarProprioUsuario, usuariosController.atualizarUsuario);
roteador.get("/:id/preferencias", autenticar, verificarProprioUsuario, usuariosController.getPreferencias);
roteador.put("/:id/preferencias", autenticar, verificarProprioUsuario, usuariosController.atualizarPreferencias);

module.exports = roteador;

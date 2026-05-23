const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");

const roteador = Router();

const limitadorAuth = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "erro", message: "Muitas tentativas. Tente novamente em 15 minutos." }
});

roteador.post("/cadastro", limitadorAuth, authController.cadastrar);
roteador.post("/login", limitadorAuth, authController.login);

module.exports = roteador;

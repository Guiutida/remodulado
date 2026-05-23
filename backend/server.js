// backend/server.js — Entry point
require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const { validarEnv } = require('./config/env');
validarEnv(); // processo encerra aqui se vars ausentes

process.on('unhandledRejection', (razao) => {
    console.error('[UnhandledRejection]', razao);
    process.exit(1);
});

process.on('uncaughtException', (erro) => {
    console.error('[UncaughtException]', erro);
    process.exit(1);
});

const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");

const rotasAuth = require("./routes/auth");
const rotasUsuarios = require("./routes/usuarios");
const rotasAlunos = require("./routes/alunos");
const rotasTurmas = require("./routes/turmas");
const rotasTrilhas = require("./routes/trilhas");
const rotasAtividades = require("./routes/atividades");
const rotasIa         = require("./routes/ia");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const porta = process.env.PORT || 3000;
const pastaPublica = path.resolve(__dirname, "..");

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'img-src': ["'self'", 'data:']
        }
    }
}));
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.static(pastaPublica));

const pastaUploads = require('path').join(__dirname, '..', 'uploads');
require('fs').mkdirSync(pastaUploads, { recursive: true });
app.use('/uploads', express.static(pastaUploads));

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "Servidor DuoPratic online." });
});

app.get("/api/db/status", async (_req, res) => {
    try {
        const banco = require("./db");
        const [linhas] = await banco.query("SELECT 1 AS conectado");
        res.json({ status: "ok", database: "duopratic", conectado: linhas[0].conectado === 1 });
    } catch (erro) {
        res.status(500).json({
            status: "erro",
            message: "Nao foi possivel conectar ao MySQL.",
            detalhe: erro.message
        });
    }
});

app.use("/api", rotasAuth);
app.use("/api/usuarios", rotasUsuarios);
app.use("/api/alunos", rotasAlunos);
app.use("/api/aluno", rotasAlunos);
app.use("/api/turmas", rotasTurmas);
app.use("/api/trilhas", rotasTrilhas);
app.use("/api/atividades", rotasAtividades);
app.use("/api/ia", rotasIa);

app.get("/", (_req, res) => {
    res.sendFile(path.join(pastaPublica, "index.html"));
});

app.use(function handler404(req, res) {
    if (req.accepts('json')) {
        return res.status(404).json({ status: 'erro', message: 'Rota não encontrada.' });
    }
    res.status(404).send('Não encontrado');
});

app.use(errorHandler);

app.listen(porta, () => {
    console.log(`Servidor DuoPratic online na porta ${porta}`);
});

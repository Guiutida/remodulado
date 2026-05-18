const express = require("express");
const path = require("path");

const app = express();
const porta = process.env.PORT || 3000;
const pastaPublica = path.resolve(__dirname, "..");

app.use(express.json());
app.use(express.static(pastaPublica));

app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        message: "Servidor DuoPratic online."
    });
});

app.get("/", (_req, res) => {
    res.sendFile(path.join(pastaPublica, "index.html"));
});

app.listen(porta, () => {
    console.log(`Servidor DuoPratic online na porta ${porta}`);
});

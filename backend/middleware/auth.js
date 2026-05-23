// backend/middleware/auth.js
// Middleware JWT — verifica token Bearer e popula req.usuario = { id, perfil }
// Uso nas rotas: router.get("/rota", autenticar, handler)

const jwt = require("jsonwebtoken");

function autenticar(req, res, next) {
    const cabecalho = req.headers.authorization;

    if (!cabecalho || !cabecalho.startsWith("Bearer ")) {
        return res.status(401).json({ status: "erro", message: "Não autenticado." });
    }

    const token = cabecalho.slice(7); // remove "Bearer "

    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        // req.usuario agora contém: { id, perfil, iat, exp }
        next();
    } catch {
        // jwt.verify lança JsonWebTokenError se inválido, TokenExpiredError se expirado
        res.status(401).json({ status: "erro", message: "Token inválido ou expirado." });
    }
}

module.exports = { autenticar };

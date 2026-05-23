// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(erro, req, res, next) {
    if (erro.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ status: "erro", message: "Este e-mail já está cadastrado." });
    }

    res.status(erro.status || 500).json({
        status: "erro",
        message: erro.message || "Erro interno do servidor.",
        ...(process.env.NODE_ENV !== "production" && { detalhe: erro.stack })
    });
};

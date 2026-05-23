const multer = require('multer');

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(erro, req, res, next) {
    if (erro instanceof multer.MulterError) {
        if (erro.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ status: 'erro', message: 'Arquivo muito grande. O limite é 5 MB.' });
        }
        return res.status(400).json({ status: 'erro', message: 'Erro no upload do arquivo: ' + erro.message });
    }
    // Erro de tipo não permitido lançado pelo fileFilter
    if (erro.message && erro.message.includes('Tipo de arquivo não permitido')) {
        return res.status(400).json({ status: 'erro', message: erro.message });
    }

    if (erro.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ status: "erro", message: "Este e-mail já está cadastrado." });
    }

    res.status(erro.status || 500).json({
        status: "erro",
        message: erro.message || "Erro interno do servidor.",
        ...(process.env.NODE_ENV !== "production" && { detalhe: erro.stack })
    });
};

const { Router } = require("express");
const { autenticar } = require("../middleware/auth");
const usuariosController = require("../controllers/usuariosController");
const multer = require('multer');
const pathMod = require('path');
const fs = require('fs');

const UPLOADS_DIR = pathMod.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, UPLOADS_DIR); },
    filename: function (req, file, cb) {
        const ext = pathMod.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
    }
});

const uploadFoto = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const permitidos = ['image/jpeg', 'image/png', 'image/webp'];
        if (permitidos.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Tipo de arquivo não permitido. Use JPG, PNG ou WebP.'));
        }
    }
});

const roteador = Router();

function verificarProprioUsuario(req, res, next) {
    const idRequisitado = parseInt(req.params.id, 10);
    if (req.usuario.id !== idRequisitado && req.usuario.perfil !== "professor") {
        return res.status(403).json({ status: "erro", message: "Acesso negado." });
    }
    next();
}

roteador.post('/perfil/foto', autenticar, uploadFoto.single('foto'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: 'erro', message: 'Nenhum arquivo enviado.' });
        }
        const caminho = '/uploads/' + req.file.filename;
        const banco = require('../db');
        await banco.query(
            'UPDATE preferencias_usuario SET foto_perfil = ? WHERE usuario_id = ?',
            [caminho, req.usuario.id]
        );
        res.json({ status: 'ok', foto: caminho });
    } catch (erro) {
        next(erro);
    }
});

roteador.get("/:id", autenticar, verificarProprioUsuario, usuariosController.getUsuario);
roteador.put("/:id", autenticar, verificarProprioUsuario, usuariosController.atualizarUsuario);
roteador.get("/:id/preferencias", autenticar, verificarProprioUsuario, usuariosController.getPreferencias);
roteador.put("/:id/preferencias", autenticar, verificarProprioUsuario, usuariosController.atualizarPreferencias);

module.exports = roteador;

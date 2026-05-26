const banco = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = 12;

async function cadastrar(req, res) {
    const { nome, email, senha, perfil } = req.body;

    if (!nome || !email || !senha || !perfil) {
        return res.status(400).json({ status: "erro", message: "Preencha todos os campos." });
    }

    if (!["aluno", "professor"].includes(perfil)) {
        return res.status(400).json({ status: "erro", message: "Perfil inválido." });
    }

    try {
        const hash = await bcrypt.hash(senha, SALT_ROUNDS);
        const [resultado] = await banco.query(
            "INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)",
            [nome, email, hash, perfil]
        );

        res.status(201).json({
            status: "ok",
            usuario: { id: resultado.insertId, nome, email, perfil }
        });
    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ status: "erro", message: "Este e-mail já está cadastrado." });
        }
        res.status(500).json({ status: "erro", message: "Erro ao cadastrar usuário.", detalhe: erro.message });
    }
}

async function login(req, res) {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ status: "erro", message: "Preencha todos os campos." });
    }

    try {
        const [usuarios] = await banco.query(
            "SELECT id, nome, email, perfil, senha FROM usuarios WHERE email = ? LIMIT 1",
            [email]
        );

        if (!usuarios.length) {
            return res.status(401).json({ status: "erro", message: "E-mail, senha ou perfil inválidos." });
        }

        const usuario = usuarios[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            return res.status(401).json({ status: "erro", message: "E-mail, senha ou perfil inválidos." });
        }

        const token = jwt.sign(
            { id: usuario.id, perfil: usuario.perfil },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        const { senha: _descartada, ...usuarioSeguro } = usuario;
        res.json({ status: "ok", token, usuario: usuarioSeguro });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao entrar.", detalhe: erro.message });
    }
}

module.exports = { cadastrar, login };

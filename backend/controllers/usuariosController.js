const banco = require("../db");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 12;

const camposPreferencias = {
    tema: "tema",
    status: "status_usuario",
    foto: "foto_perfil",
    notificacoes: "notificacoes_turma",
    lembretes: "lembretes_estudo",
    disciplina: "disciplina_principal",
    ritmo: "ritmo_semanal"
};

function formatarPreferencias(linha) {
    return {
        tema: linha.tema,
        status: linha.status_usuario,
        foto: linha.foto_perfil || "",
        notificacoes: linha.notificacoes_turma === 1,
        lembretes: linha.lembretes_estudo,
        disciplina: linha.disciplina_principal,
        ritmo: linha.ritmo_semanal
    };
}

async function garantirPreferencias(usuarioId) {
    await banco.query(
        "INSERT IGNORE INTO preferencias_usuario (usuario_id) VALUES (?)",
        [usuarioId]
    );
}

async function getUsuario(req, res) {
    try {
        const [usuarios] = await banco.query(
            "SELECT id, nome, email, perfil FROM usuarios WHERE id = ? LIMIT 1",
            [req.params.id]
        );

        if (!usuarios.length) {
            return res.status(404).json({ status: "erro", message: "Usuário não encontrado." });
        }

        res.json({ status: "ok", usuario: usuarios[0] });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao buscar usuário.", detalhe: erro.message });
    }
}

async function atualizarUsuario(req, res) {
    const { nome, email, senha } = req.body;
    const campos = [];
    const valores = [];

    if (nome) { campos.push("nome = ?"); valores.push(nome); }
    if (email) { campos.push("email = ?"); valores.push(email); }
    if (senha) {
        campos.push("senha = ?");
        const hash = await bcrypt.hash(senha, SALT_ROUNDS);
        valores.push(hash);
    }

    if (!campos.length) {
        return res.status(400).json({ status: "erro", message: "Nenhum dado para atualizar." });
    }

    try {
        valores.push(req.params.id);
        await banco.query(`UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`, valores);

        const [usuarios] = await banco.query(
            "SELECT id, nome, email, perfil FROM usuarios WHERE id = ? LIMIT 1",
            [req.params.id]
        );

        res.json({ status: "ok", usuario: usuarios[0] });
    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ status: "erro", message: "Este e-mail já está cadastrado." });
        }
        res.status(500).json({ status: "erro", message: "Erro ao atualizar usuário.", detalhe: erro.message });
    }
}

async function getPreferencias(req, res) {
    try {
        const [usuarios] = await banco.query(
            "SELECT id FROM usuarios WHERE id = ? LIMIT 1",
            [req.params.id]
        );

        if (!usuarios.length) {
            return res.status(404).json({ status: "erro", message: "Usuário não encontrado." });
        }

        await garantirPreferencias(req.params.id);

        const [preferencias] = await banco.query(
            "SELECT * FROM preferencias_usuario WHERE usuario_id = ? LIMIT 1",
            [req.params.id]
        );

        res.json({ status: "ok", preferencias: formatarPreferencias(preferencias[0]) });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao buscar preferencias.", detalhe: erro.message });
    }
}

async function atualizarPreferencias(req, res) {
    const campos = [];
    const valores = [];

    Object.entries(req.body).forEach(([campo, valor]) => {
        const coluna = camposPreferencias[campo];
        if (!coluna) return;
        campos.push(`${coluna} = ?`);
        valores.push(campo === "notificacoes" ? (valor ? 1 : 0) : valor);
    });

    if (!campos.length) {
        return res.status(400).json({ status: "erro", message: "Nenhuma preferencia para atualizar." });
    }

    try {
        const [usuarios] = await banco.query(
            "SELECT id FROM usuarios WHERE id = ? LIMIT 1",
            [req.params.id]
        );

        if (!usuarios.length) {
            return res.status(404).json({ status: "erro", message: "Usuário não encontrado." });
        }

        await garantirPreferencias(req.params.id);
        valores.push(req.params.id);
        await banco.query(`UPDATE preferencias_usuario SET ${campos.join(", ")} WHERE usuario_id = ?`, valores);

        const [preferencias] = await banco.query(
            "SELECT * FROM preferencias_usuario WHERE usuario_id = ? LIMIT 1",
            [req.params.id]
        );

        res.json({ status: "ok", preferencias: formatarPreferencias(preferencias[0]) });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao salvar preferencias.", detalhe: erro.message });
    }
}

module.exports = { getUsuario, atualizarUsuario, getPreferencias, atualizarPreferencias };

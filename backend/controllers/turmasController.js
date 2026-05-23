const banco = require("../db");

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem ambíguos: 0/O, 1/I

async function gerarCodigoUnico() {
    for (let tentativa = 0; tentativa < 10; tentativa++) {
        let codigo = "";
        for (let i = 0; i < 6; i++) codigo += CHARS[Math.floor(Math.random() * CHARS.length)];
        const [existente] = await banco.query(
            "SELECT id FROM turmas WHERE codigo = ? LIMIT 1", [codigo]
        );
        if (!existente.length) return codigo;
    }
    throw new Error("Não foi possível gerar código único após 10 tentativas.");
}

async function verificarDonoDaTurma(turmaId, professorId) {
    const [turmas] = await banco.query(
        "SELECT id FROM turmas WHERE id = ? AND professor_id = ? LIMIT 1",
        [turmaId, professorId]
    );
    return turmas.length > 0;
}

async function criar(req, res) {
    try {
        const { nome, disciplina } = req.body;
        if (!nome || !disciplina) {
            return res.status(400).json({ status: "erro", message: "Nome e disciplina são obrigatórios." });
        }
        const codigo = await gerarCodigoUnico();
        const [resultado] = await banco.query(
            "INSERT INTO turmas (nome, disciplina, codigo, professor_id) VALUES (?, ?, ?, ?)",
            [nome.trim(), disciplina.trim(), codigo, req.usuario.id]
        );
        res.status(201).json({
            status: "ok",
            turma: { id: resultado.insertId, nome: nome.trim(), disciplina: disciplina.trim(), codigo }
        });
    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ status: "erro", message: "Conflito ao criar turma. Tente novamente." });
        }
        res.status(500).json({ status: "erro", message: "Erro ao criar turma.", detalhe: erro.message });
    }
}

async function listar(req, res) {
    try {
        const [turmas] = await banco.query(
            `SELECT t.id, t.nome, t.disciplina, t.codigo, t.criado_em,
                    COUNT(ta.id) AS total_alunos
             FROM turmas t
             LEFT JOIN turma_alunos ta ON ta.turma_id = t.id
             WHERE t.professor_id = ?
             GROUP BY t.id
             ORDER BY t.criado_em DESC`,
            [req.usuario.id]
        );
        res.json({ status: "ok", turmas });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao listar turmas.", detalhe: erro.message });
    }
}

async function getMembros(req, res) {
    try {
        const turmaId = parseInt(req.params.id, 10);
        if (!(await verificarDonoDaTurma(turmaId, req.usuario.id))) {
            return res.status(403).json({ status: "erro", message: "Acesso negado." });
        }
        const [membros] = await banco.query(
            `SELECT u.id, u.nome, u.email, ta.criado_em AS entrou_em
             FROM turma_alunos ta
             JOIN usuarios u ON u.id = ta.aluno_id
             WHERE ta.turma_id = ?
             ORDER BY ta.criado_em ASC`,
            [turmaId]
        );
        res.json({ status: "ok", membros });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao buscar membros.", detalhe: erro.message });
    }
}

async function removerMembro(req, res) {
    try {
        const turmaId = parseInt(req.params.id, 10);
        const alunoId = parseInt(req.params.alunoId, 10);
        if (!(await verificarDonoDaTurma(turmaId, req.usuario.id))) {
            return res.status(403).json({ status: "erro", message: "Acesso negado." });
        }
        const [resultado] = await banco.query(
            "DELETE FROM turma_alunos WHERE turma_id = ? AND aluno_id = ?",
            [turmaId, alunoId]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ status: "erro", message: "Aluno não encontrado nesta turma." });
        }
        res.json({ status: "ok", message: "Aluno removido da turma." });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao remover membro.", detalhe: erro.message });
    }
}

async function entrar(req, res) {
    try {
        const { codigo } = req.body;
        if (!codigo) {
            return res.status(400).json({ status: "erro", message: "Código de acesso é obrigatório." });
        }
        const [jaMembro] = await banco.query(
            "SELECT id FROM turma_alunos WHERE aluno_id = ? LIMIT 1",
            [req.usuario.id]
        );
        if (jaMembro.length) {
            return res.status(409).json({ status: "erro", message: "Você já está em uma turma. Saia da turma atual para entrar em outra." });
        }
        const [turmas] = await banco.query(
            "SELECT id, nome, disciplina FROM turmas WHERE codigo = ? LIMIT 1",
            [codigo.trim().toUpperCase()]
        );
        if (!turmas.length) {
            return res.status(404).json({ status: "erro", message: "Código de acesso inválido." });
        }
        const turma = turmas[0];
        await banco.query(
            "INSERT INTO turma_alunos (turma_id, aluno_id) VALUES (?, ?)",
            [turma.id, req.usuario.id]
        );
        res.status(201).json({ status: "ok", turma });
    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ status: "erro", message: "Você já é membro desta turma." });
        }
        res.status(500).json({ status: "erro", message: "Erro ao entrar na turma.", detalhe: erro.message });
    }
}

// getTurmaDoAluno NÃO é exportado daqui — handler canônico fica em alunosController.js
module.exports = { criar, listar, getMembros, removerMembro, entrar };

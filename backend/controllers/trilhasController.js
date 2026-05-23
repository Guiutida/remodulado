const banco = require("../db");

async function verificarDonoDaTrilha(trilhaId, professorId) {
    const [trilhas] = await banco.query(
        "SELECT id FROM trilhas WHERE id = ? AND professor_id = ? LIMIT 1",
        [trilhaId, professorId]
    );
    return trilhas.length > 0;
}

async function verificarAlunoNaTrilha(trilhaId, alunoId) {
    const [membros] = await banco.query(
        `SELECT ta.id
         FROM turma_alunos ta
         JOIN trilhas tr ON tr.turma_id = ta.turma_id
         WHERE tr.id = ? AND ta.aluno_id = ?
         LIMIT 1`,
        [trilhaId, alunoId]
    );
    return membros.length > 0;
}

async function criar(req, res) {
    try {
        const { turma_id, titulo, disciplina, descricao } = req.body;
        if (!turma_id || !titulo || !disciplina) {
            return res.status(400).json({ status: "erro", message: "turma_id, titulo e disciplina são obrigatórios." });
        }
        const [turmas] = await banco.query(
            "SELECT id FROM turmas WHERE id = ? AND professor_id = ? LIMIT 1",
            [parseInt(turma_id, 10), req.usuario.id]
        );
        if (!turmas.length) {
            return res.status(403).json({ status: "erro", message: "Turma não encontrada ou acesso negado." });
        }
        const [resultado] = await banco.query(
            "INSERT INTO trilhas (turma_id, professor_id, titulo, disciplina, descricao) VALUES (?, ?, ?, ?, ?)",
            [parseInt(turma_id, 10), req.usuario.id, titulo.trim(), disciplina.trim(), descricao?.trim() || null]
        );
        res.status(201).json({
            status: "ok",
            trilha: { id: resultado.insertId, titulo: titulo.trim(), disciplina: disciplina.trim() }
        });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao criar trilha.", detalhe: erro.message });
    }
}

async function listarProfessor(req, res) {
    try {
        const [trilhas] = await banco.query(
            `SELECT tr.id, tr.titulo, tr.disciplina, tr.ativa, tr.criado_em,
                    t.nome AS turma_nome, t.id AS turma_id,
                    COUNT(te.id) AS total_etapas
             FROM trilhas tr
             JOIN turmas t ON t.id = tr.turma_id
             LEFT JOIN trilha_etapas te ON te.trilha_id = tr.id
             WHERE tr.professor_id = ?
             GROUP BY tr.id
             ORDER BY tr.criado_em DESC`,
            [req.usuario.id]
        );
        res.json({ status: "ok", trilhas });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao listar trilhas.", detalhe: erro.message });
    }
}

async function listarAluno(req, res) {
    try {
        const alunoId = req.usuario.id;
        const [trilhas] = await banco.query(
            `SELECT tr.id, tr.titulo, tr.disciplina, tr.descricao, tr.criado_em,
                    t.nome AS turma_nome,
                    COUNT(te.id) AS total_etapas,
                    SUM(IF(pe.concluido = 1, 1, 0)) AS etapas_concluidas,
                    ROUND(
                        SUM(IF(pe.concluido = 1, 1, 0)) * 100.0
                        / NULLIF(COUNT(te.id), 0)
                    , 0) AS percentual
             FROM trilhas tr
             JOIN turmas t ON t.id = tr.turma_id
             JOIN turma_alunos ta ON ta.turma_id = t.id AND ta.aluno_id = ?
             LEFT JOIN trilha_etapas te ON te.trilha_id = tr.id
             LEFT JOIN progresso_etapa pe ON pe.etapa_id = te.id AND pe.aluno_id = ?
             WHERE tr.ativa = 1
             GROUP BY tr.id
             ORDER BY tr.criado_em DESC`,
            [alunoId, alunoId]
        );
        res.json({ status: "ok", trilhas });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao listar trilhas.", detalhe: erro.message });
    }
}

async function getDetalhe(req, res) {
    try {
        const trilhaId = parseInt(req.params.id, 10);
        const perfil = req.usuario.perfil;

        if (perfil === "professor") {
            if (!(await verificarDonoDaTrilha(trilhaId, req.usuario.id))) {
                return res.status(403).json({ status: "erro", message: "Acesso negado." });
            }
        } else {
            if (!(await verificarAlunoNaTrilha(trilhaId, req.usuario.id))) {
                return res.status(403).json({ status: "erro", message: "Acesso negado." });
            }
        }

        const alunoId = perfil === "aluno" ? req.usuario.id : null;
        const [etapas] = await banco.query(
            `SELECT te.id, te.ordem, te.titulo, te.tipo, te.conteudo,
                    COALESCE(pe.concluido, 0) AS concluido,
                    pe.concluido_em
             FROM trilha_etapas te
             LEFT JOIN progresso_etapa pe ON pe.etapa_id = te.id AND pe.aluno_id = ?
             WHERE te.trilha_id = ?
             ORDER BY te.ordem ASC`,
            [alunoId, trilhaId]
        );
        const [trilhas] = await banco.query(
            "SELECT id, titulo, disciplina, descricao, ativa FROM trilhas WHERE id = ? LIMIT 1",
            [trilhaId]
        );
        res.json({ status: "ok", trilha: trilhas[0] || null, etapas });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao buscar trilha.", detalhe: erro.message });
    }
}

async function adicionarEtapa(req, res) {
    try {
        const trilhaId = parseInt(req.params.id, 10);
        if (!(await verificarDonoDaTrilha(trilhaId, req.usuario.id))) {
            return res.status(403).json({ status: "erro", message: "Acesso negado." });
        }
        const { titulo, tipo, conteudo } = req.body;
        if (!titulo || !tipo || !conteudo) {
            return res.status(400).json({ status: "erro", message: "titulo, tipo e conteudo são obrigatórios." });
        }
        const tiposValidos = ["texto", "video", "link"];
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({ status: "erro", message: `tipo deve ser: ${tiposValidos.join(", ")}.` });
        }
        // ordem calculada no servidor: nunca aceita do body
        const [[{ proxima }]] = await banco.query(
            "SELECT COALESCE(MAX(ordem), 0) + 1 AS proxima FROM trilha_etapas WHERE trilha_id = ?",
            [trilhaId]
        );
        const [resultado] = await banco.query(
            "INSERT INTO trilha_etapas (trilha_id, ordem, titulo, tipo, conteudo) VALUES (?, ?, ?, ?, ?)",
            [trilhaId, proxima, titulo.trim(), tipo, conteudo.trim()]
        );
        res.status(201).json({
            status: "ok",
            etapa: { id: resultado.insertId, ordem: proxima, titulo: titulo.trim(), tipo }
        });
    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ status: "erro", message: "Conflito de ordem de etapa. Tente novamente." });
        }
        res.status(500).json({ status: "erro", message: "Erro ao adicionar etapa.", detalhe: erro.message });
    }
}

async function marcarProgresso(req, res) {
    try {
        const trilhaId = parseInt(req.params.id, 10);
        const etapaId = parseInt(req.params.etapaId, 10);

        if (!(await verificarAlunoNaTrilha(trilhaId, req.usuario.id))) {
            return res.status(403).json({ status: "erro", message: "Acesso negado." });
        }
        const [etapas] = await banco.query(
            "SELECT id FROM trilha_etapas WHERE id = ? AND trilha_id = ? LIMIT 1",
            [etapaId, trilhaId]
        );
        if (!etapas.length) {
            return res.status(404).json({ status: "erro", message: "Etapa não encontrada nesta trilha." });
        }
        const { concluido } = req.body;
        const flag = concluido ? 1 : 0;
        const concluido_em = flag ? new Date() : null;
        await banco.query(
            `INSERT INTO progresso_etapa (aluno_id, etapa_id, concluido, concluido_em)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE concluido = VALUES(concluido), concluido_em = VALUES(concluido_em)`,
            [req.usuario.id, etapaId, flag, concluido_em]
        );
        res.json({ status: "ok", etapa_id: etapaId, concluido: !!flag });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao registrar progresso.", detalhe: erro.message });
    }
}

module.exports = { criar, listarProfessor, listarAluno, getDetalhe, adicionarEtapa, marcarProgresso };

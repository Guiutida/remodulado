// backend/controllers/alunosController.js
const banco = require("../db");

// ─── getTurmaDoAluno ──────────────────────────────────────────────────────────
// Mantido sem alteração do PLAN original
async function getTurmaDoAluno(req, res) {
    try {
        const [turmas] = await banco.query(
            `SELECT t.id, t.nome, t.disciplina, t.codigo,
                    COUNT(ta2.id) AS total_alunos
             FROM turma_alunos ta
             JOIN turmas t ON t.id = ta.turma_id
             LEFT JOIN turma_alunos ta2 ON ta2.turma_id = t.id
             WHERE ta.aluno_id = ?
             GROUP BY t.id
             LIMIT 1`,
            [req.usuario.id]
        );
        if (!turmas.length) {
            return res.json({ status: "ok", turma: null });
        }
        res.json({ status: "ok", turma: turmas[0] });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao buscar turma.", detalhe: erro.message });
    }
}

// ─── getPainel ────────────────────────────────────────────────────────────────
// GET /api/alunos/painel
// Retorna: usuario { nome, pontuacao, streak_atual },
//          trilhas com progresso real, atividades pendentes
async function getPainel(req, res) {
    try {
        const alunoId = req.usuario.id;

        // Dados de gamificação do aluno
        const [usuarios] = await banco.query(
            "SELECT nome, pontuacao, streak_atual FROM usuarios WHERE id = ? LIMIT 1",
            [alunoId]
        );
        if (!usuarios.length) {
            return res.status(404).json({ status: "erro", message: "Usuário não encontrado." });
        }
        const usuario = usuarios[0];

        // Turma do aluno (pode ser null se não estiver em turma)
        const [turmaRows] = await banco.query(
            "SELECT turma_id FROM turma_alunos WHERE aluno_id = ? LIMIT 1",
            [alunoId]
        );
        const turmaId = turmaRows[0]?.turma_id || null;

        let trilhas = [];
        let atividades_pendentes = [];

        if (turmaId) {
            // Trilhas da turma com progresso do aluno
            // Progresso = etapas concluídas / total de etapas da trilha (%)
            // SUM(IF(...)) em vez de COUNT(...) FILTER (WHERE ...) — MySQL 8.0
            const [trilhasRows] = await banco.query(
                `SELECT tr.id, tr.titulo, tr.disciplina,
                        COUNT(te.id)                                    AS total_etapas,
                        SUM(IF(pe.concluido = 1, 1, 0))                 AS etapas_concluidas,
                        ROUND(
                            SUM(IF(pe.concluido = 1, 1, 0)) * 100.0
                            / NULLIF(COUNT(te.id), 0)
                        , 0)                                            AS progresso_pct
                 FROM trilhas tr
                 LEFT JOIN trilha_etapas te ON te.trilha_id = tr.id
                 LEFT JOIN progresso_etapa pe ON pe.etapa_id = te.id AND pe.aluno_id = ?
                 WHERE tr.turma_id = ? AND tr.ativa = 1
                 GROUP BY tr.id
                 ORDER BY tr.criado_em ASC`,
                [alunoId, turmaId]
            );
            trilhas = trilhasRows;

            // Atividades pendentes: atividades da turma onde o aluno não entregou ainda
            const [pendentesRows] = await banco.query(
                `SELECT a.id, a.titulo, a.prazo,
                        COUNT(q.id) AS total_questoes
                 FROM atividades a
                 LEFT JOIN questoes q ON q.atividade_id = a.id
                 WHERE a.turma_id = ?
                   AND NOT EXISTS (
                       SELECT 1 FROM entregas e
                       WHERE e.atividade_id = a.id AND e.aluno_id = ?
                   )
                 GROUP BY a.id
                 ORDER BY a.prazo ASC
                 LIMIT 10`,
                [turmaId, alunoId]
            );
            atividades_pendentes = pendentesRows;
        }

        res.json({
            status: "ok",
            usuario,
            trilhas,
            atividades_pendentes
        });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao carregar painel.", detalhe: erro.message });
    }
}

// ─── getHistorico ─────────────────────────────────────────────────────────────
// GET /api/alunos/historico
// Últimas 20 entregas do aluno com título da atividade, data e status
async function getHistorico(req, res) {
    try {
        const alunoId = req.usuario.id;

        const [entregas] = await banco.query(
            `SELECT e.id, a.titulo AS atividade_titulo, e.status, e.nota,
                    e.enviado_em, e.criado_em,
                    COUNT(q.id)                         AS total_questoes,
                    SUM(IF(rq.correta = 1, 1, 0))       AS total_acertos
             FROM entregas e
             JOIN atividades a ON a.id = e.atividade_id
             LEFT JOIN questoes q ON q.atividade_id = a.id
             LEFT JOIN respostas_questao rq ON rq.questao_id = q.id AND rq.aluno_id = ?
             WHERE e.aluno_id = ?
             GROUP BY e.id
             ORDER BY e.enviado_em DESC
             LIMIT 20`,
            [alunoId, alunoId]
        );

        res.json({ status: "ok", entregas });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao buscar histórico.", detalhe: erro.message });
    }
}

// ─── getAtividades ────────────────────────────────────────────────────────────
// GET /api/alunos/atividades
// Todas as atividades da turma do aluno com status de entrega
async function getAtividades(req, res) {
    try {
        const alunoId = req.usuario.id;

        const [turmaRows] = await banco.query(
            "SELECT turma_id FROM turma_alunos WHERE aluno_id = ? LIMIT 1",
            [alunoId]
        );
        if (!turmaRows.length) {
            return res.json({ status: "ok", atividades: [] });
        }
        const turmaId = turmaRows[0].turma_id;

        const [atividades] = await banco.query(
            `SELECT a.id, a.titulo, a.descricao, a.prazo, a.criado_em,
                    COUNT(q.id)                                     AS total_questoes,
                    e.status                                        AS status_entrega,
                    e.enviado_em,
                    SUM(IF(rq.correta = 1, 1, 0))                  AS total_acertos,
                    SUM(IF(rq.correta IS NOT NULL, 1, 0))           AS questoes_respondidas
             FROM atividades a
             LEFT JOIN questoes q ON q.atividade_id = a.id
             LEFT JOIN entregas e ON e.atividade_id = a.id AND e.aluno_id = ?
             LEFT JOIN respostas_questao rq ON rq.questao_id = q.id AND rq.aluno_id = ?
             WHERE a.turma_id = ?
             GROUP BY a.id
             ORDER BY a.prazo ASC, a.criado_em DESC`,
            [alunoId, alunoId, turmaId]
        );

        res.json({ status: "ok", atividades });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao buscar atividades.", detalhe: erro.message });
    }
}

module.exports = { getTurmaDoAluno, getPainel, getHistorico, getAtividades };

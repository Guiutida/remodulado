// backend/controllers/atividadesController.js
// Controlador de atividades: criação, questões e detalhamento
// Segurança: gabarito nunca exposto ao aluno, IDOR em todas as rotas,
// ordem calculada no servidor, aluno_id sempre de req.usuario.id

const banco = require("../db");

// ── Helpers IDOR (privados — não exportados) ─────────────────────────────────

// Verifica se a atividade pertence ao professor (via JOIN atividades→turmas)
async function verificarDonoAtividade(atividadeId, professorId) {
    const [rows] = await banco.query(
        `SELECT a.id FROM atividades a
         JOIN turmas t ON t.id = a.turma_id
         WHERE a.id = ? AND t.professor_id = ?
         LIMIT 1`,
        [atividadeId, professorId]
    );
    return rows.length > 0;
}

// Verifica se o aluno está matriculado na turma que tem a atividade
async function verificarAlunoNaAtividade(atividadeId, alunoId) {
    const [rows] = await banco.query(
        `SELECT a.id FROM atividades a
         JOIN turma_alunos ta ON ta.turma_id = a.turma_id
         WHERE a.id = ? AND ta.aluno_id = ?
         LIMIT 1`,
        [atividadeId, alunoId]
    );
    return rows.length > 0;
}

// ── Handlers exportados ───────────────────────────────────────────────────────

/**
 * POST /api/atividades
 * Requer perfil professor (guard na rota).
 * Body: { turma_id, titulo, descricao?, prazo? }
 */
async function criarAtividade(req, res) {
    try {
        const { turma_id, titulo, descricao, prazo } = req.body;

        if (!turma_id || !titulo) {
            return res.status(400).json({ status: "erro", message: "turma_id e titulo são obrigatórios." });
        }

        const turmaId = parseInt(turma_id, 10);
        if (isNaN(turmaId)) {
            return res.status(400).json({ status: "erro", message: "turma_id deve ser um número inteiro." });
        }

        // IDOR: verifica que a turma pertence ao professor logado
        const [turmas] = await banco.query(
            "SELECT id FROM turmas WHERE id = ? AND professor_id = ? LIMIT 1",
            [turmaId, req.usuario.id]
        );
        if (!turmas.length) {
            return res.status(403).json({ status: "erro", message: "Turma não encontrada ou acesso negado." });
        }

        const tituloSanitizado = titulo.trim();
        const descricaoSanitizada = descricao ? descricao.trim() : null;
        const prazoSanitizado = prazo || null;

        const [resultado] = await banco.query(
            "INSERT INTO atividades (turma_id, titulo, descricao, prazo) VALUES (?, ?, ?, ?)",
            [turmaId, tituloSanitizado, descricaoSanitizada, prazoSanitizado]
        );

        res.status(201).json({
            status: "ok",
            atividade: {
                id: resultado.insertId,
                turma_id: turmaId,
                titulo: tituloSanitizado,
                descricao: descricaoSanitizada,
                prazo: prazoSanitizado
            }
        });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao criar atividade.", detalhe: erro.message });
    }
}

/**
 * POST /api/atividades/:id/questoes
 * Requer perfil professor (guard na rota).
 * Body: { tipo, enunciado, opcoes?, gabarito? }
 */
async function adicionarQuestao(req, res) {
    try {
        const atividadeId = parseInt(req.params.id, 10);
        if (isNaN(atividadeId)) {
            return res.status(400).json({ status: "erro", message: "ID de atividade inválido." });
        }

        // IDOR: verifica que a atividade pertence ao professor logado
        if (!(await verificarDonoAtividade(atividadeId, req.usuario.id))) {
            return res.status(403).json({ status: "erro", message: "Atividade não encontrada ou acesso negado." });
        }

        const { tipo, enunciado, opcoes, gabarito } = req.body;

        // Validação de tipo
        if (!tipo || !["multipla_escolha", "dissertativa"].includes(tipo)) {
            return res.status(400).json({ status: "erro", message: "tipo deve ser 'multipla_escolha' ou 'dissertativa'." });
        }

        // Validação de enunciado
        if (!enunciado || !enunciado.trim()) {
            return res.status(400).json({ status: "erro", message: "enunciado é obrigatório e não pode ser vazio." });
        }

        let opcoesFinal = null;
        let gabaritoFinal = null;

        if (tipo === "multipla_escolha") {
            // opcoes deve ser array de 2 a 6 strings
            if (!Array.isArray(opcoes) || opcoes.length < 2 || opcoes.length > 6) {
                return res.status(400).json({ status: "erro", message: "opcoes deve ser um array de 2 a 6 strings para múltipla escolha." });
            }
            if (!gabarito) {
                return res.status(400).json({ status: "erro", message: "gabarito é obrigatório para múltipla escolha." });
            }
            opcoesFinal = JSON.stringify(opcoes);
            gabaritoFinal = gabarito;
        }
        // Para dissertativa: gabarito e opcoes ficam null (ignorar body)

        // ordem calculada no servidor — NUNCA do body
        const [ordemResult] = await banco.query(
            "SELECT COALESCE(MAX(ordem), 0) + 1 AS proxima FROM questoes WHERE atividade_id = ?",
            [atividadeId]
        );
        const ordem = ordemResult[0].proxima;

        const [resultado] = await banco.query(
            "INSERT INTO questoes (atividade_id, ordem, tipo, enunciado, opcoes, gabarito) VALUES (?, ?, ?, ?, ?, ?)",
            [atividadeId, ordem, tipo, enunciado.trim(), opcoesFinal, gabaritoFinal]
        );

        // gabarito nunca retornado na resposta — nem para o professor neste endpoint
        res.status(201).json({
            status: "ok",
            questao: {
                id: resultado.insertId,
                atividade_id: atividadeId,
                ordem,
                tipo,
                enunciado: enunciado.trim()
            }
        });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao adicionar questão.", detalhe: erro.message });
    }
}

/**
 * GET /api/atividades
 * Requer perfil professor (guard na rota).
 * Lista atividades cujas turmas pertencem ao professor logado.
 */
async function listarProfessor(req, res) {
    try {
        const [atividades] = await banco.query(
            `SELECT a.id, a.titulo, a.descricao, a.prazo, a.criado_em,
                    t.nome AS turma_nome, t.id AS turma_id,
                    COUNT(q.id) AS total_questoes,
                    COUNT(e.id) AS total_entregas
             FROM atividades a
             JOIN turmas t ON t.id = a.turma_id
             LEFT JOIN questoes q ON q.atividade_id = a.id
             LEFT JOIN entregas e ON e.atividade_id = a.id
             WHERE t.professor_id = ?
             GROUP BY a.id
             ORDER BY a.criado_em DESC`,
            [req.usuario.id]
        );
        res.json({ status: "ok", atividades });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao listar atividades.", detalhe: erro.message });
    }
}

/**
 * GET /api/atividades/:id
 * Disponível para professor e aluno (apenas autenticar na rota).
 * Professor: inclui gabarito nas questões.
 * Aluno: exclui gabarito das questões (segurança pedagógica).
 */
async function getDetalhe(req, res) {
    try {
        const atividadeId = parseInt(req.params.id, 10);
        if (isNaN(atividadeId)) {
            return res.status(400).json({ status: "erro", message: "ID de atividade inválido." });
        }

        const perfil = req.usuario.perfil;

        // IDOR — ramifica por perfil
        if (perfil === "professor") {
            if (!(await verificarDonoAtividade(atividadeId, req.usuario.id))) {
                return res.status(403).json({ status: "erro", message: "Atividade não encontrada ou acesso negado." });
            }
        } else {
            // aluno ou qualquer outro perfil
            if (!(await verificarAlunoNaAtividade(atividadeId, req.usuario.id))) {
                return res.status(403).json({ status: "erro", message: "Atividade não encontrada ou acesso negado." });
            }
        }

        // Busca dados da atividade
        const [atividadeRows] = await banco.query(
            `SELECT a.id, a.titulo, a.descricao, a.prazo, a.criado_em, t.nome AS turma_nome
             FROM atividades a JOIN turmas t ON t.id = a.turma_id
             WHERE a.id = ? LIMIT 1`,
            [atividadeId]
        );
        if (!atividadeRows.length) {
            return res.status(404).json({ status: "erro", message: "Atividade não encontrada." });
        }
        const atividadeData = atividadeRows[0];

        // Busca questões — gabarito incluído apenas para professor
        let questoesRows;
        if (perfil === "professor") {
            const [rows] = await banco.query(
                "SELECT id, ordem, tipo, enunciado, opcoes, gabarito FROM questoes WHERE atividade_id = ? ORDER BY ordem ASC",
                [atividadeId]
            );
            questoesRows = rows;
        } else {
            // Aluno: gabarito NUNCA incluído no SELECT
            const [rows] = await banco.query(
                "SELECT id, ordem, tipo, enunciado, opcoes FROM questoes WHERE atividade_id = ? ORDER BY ordem ASC",
                [atividadeId]
            );
            questoesRows = rows;
        }

        // Parseia opcoes de JSON string para array JS
        const questoes = questoesRows.map(q => ({
            ...q,
            opcoes: q.opcoes ? JSON.parse(q.opcoes) : null
        }));

        res.json({ status: "ok", atividade: { ...atividadeData, questoes } });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao buscar atividade.", detalhe: erro.message });
    }
}

/**
 * POST /api/atividades/:id/respostas
 * Requer perfil aluno (guard na rota).
 * Body: { respostas: [{ questao_id, resposta }] }
 * - MC: correta = 1 ou 0; gabarito_correto enviado apenas se correta === 0
 * - Dissertativa: correta = NULL (Phase 4 corrige com IA)
 * - Idempotente: ON DUPLICATE KEY UPDATE
 * - aluno_id SEMPRE de req.usuario.id — nunca do body
 */
async function responderAtividade(req, res) {
    try {
        const atividadeId = parseInt(req.params.id, 10);
        const alunoId     = req.usuario.id; // NUNCA do body

        if (!(await verificarAlunoNaAtividade(atividadeId, alunoId))) {
            return res.status(403).json({ status: "erro", message: "Acesso negado." });
        }

        const { respostas } = req.body;
        if (!Array.isArray(respostas) || respostas.length === 0) {
            return res.status(400).json({ status: "erro", message: "Array de respostas é obrigatório." });
        }

        const resultados = [];
        let acertosMC = 0;

        for (const item of respostas) {
            const questaoId = parseInt(item.questao_id, 10);
            const resposta  = String(item.resposta || "").trim();

            if (!questaoId || !resposta) continue;

            // Busca questão — inclui gabarito (uso interno do servidor, nunca retornado ao aluno)
            const [questoes] = await banco.query(
                "SELECT id, tipo, gabarito FROM questoes WHERE id = ? AND atividade_id = ? LIMIT 1",
                [questaoId, atividadeId]
            );
            if (!questoes.length) continue;

            const questao = questoes[0];
            let correta   = null; // default: dissertativa aguardando correção

            if (questao.tipo === "multipla_escolha") {
                correta = resposta.toLowerCase() === questao.gabarito.toLowerCase() ? 1 : 0;
                if (correta === 1) acertosMC++;
            }

            // Idempotente: re-submissão atualiza resposta e resultado
            await banco.query(
                `INSERT INTO respostas_questao (aluno_id, questao_id, resposta, correta)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                     resposta      = VALUES(resposta),
                     correta       = VALUES(correta),
                     respondido_em = CURRENT_TIMESTAMP`,
                [alunoId, questaoId, resposta, correta]
            );

            // Monta resultado para retornar ao aluno
            const resultado = { questao_id: questaoId, correta };
            // gabarito_correto: só para MC errada — feedback de correção
            if (questao.tipo === "multipla_escolha" && correta === 0) {
                resultado.gabarito_correto = questao.gabarito;
            }
            resultados.push(resultado);
        }

        // Registra entrega (idempotente)
        await banco.query(
            `INSERT INTO entregas (atividade_id, aluno_id, status, enviado_em)
             VALUES (?, ?, 'entregue', NOW())
             ON DUPLICATE KEY UPDATE
                 status     = 'entregue',
                 enviado_em = NOW()`,
            [atividadeId, alunoId]
        );

        // Atualiza streak e pontuação
        // streak_atual:
        //   - se ultimo_acesso = hoje        → mantém (já estudou hoje)
        //   - se ultimo_acesso = ontem       → incrementa
        //   - qualquer outra data (ou NULL)  → reinicia em 1
        await banco.query(
            `UPDATE usuarios SET
                pontuacao    = pontuacao + 10 + (5 * ?),
                streak_atual = CASE
                    WHEN DATE(ultimo_acesso) = CURDATE()                                  THEN streak_atual
                    WHEN DATE(ultimo_acesso) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)        THEN streak_atual + 1
                    ELSE 1
                END,
                ultimo_acesso = CURDATE()
             WHERE id = ?`,
            [acertosMC, alunoId]
        );

        // Busca streak_atual atualizado para incluir na resposta
        const [usuarioRows] = await banco.query(
            "SELECT streak_atual FROM usuarios WHERE id = ? LIMIT 1",
            [alunoId]
        );
        const streakAtual = usuarioRows.length ? usuarioRows[0].streak_atual : 1;
        const pontuacaoGanha = 10 + (5 * acertosMC);

        res.json({ status: "ok", pontuacao_ganha: pontuacaoGanha, streak_atual: streakAtual, resultados });

    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao registrar respostas.", detalhe: erro.message });
    }
}

/**
 * GET /api/atividades/:id/respostas
 * Requer perfil aluno (guard na rota).
 * Retorna as próprias respostas do aluno para a atividade — SEM campo gabarito.
 */
async function getRespostasAluno(req, res) {
    try {
        const atividadeId = parseInt(req.params.id, 10);
        const alunoId     = req.usuario.id;

        if (!(await verificarAlunoNaAtividade(atividadeId, alunoId))) {
            return res.status(403).json({ status: "erro", message: "Acesso negado." });
        }

        // Retorna respostas do aluno — SEM campo gabarito
        const [respostas] = await banco.query(
            `SELECT rq.questao_id, rq.resposta, rq.correta, q.tipo, rq.respondido_em
             FROM respostas_questao rq
             JOIN questoes q ON q.id = rq.questao_id
             WHERE rq.aluno_id = ? AND q.atividade_id = ?
             ORDER BY q.ordem ASC`,
            [alunoId, atividadeId]
        );

        res.json({ status: "ok", respostas });

    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao buscar respostas.", detalhe: erro.message });
    }
}

// GET /api/atividades/:id/entregas  (professor)
// Lista todos os alunos da turma com status e desempenho nesta atividade
async function getEntregas(req, res) {
    try {
        const atividadeId = parseInt(req.params.id, 10);

        if (!(await verificarDonoAtividade(atividadeId, req.usuario.id))) {
            return res.status(403).json({ status: "erro", message: "Acesso negado." });
        }

        const [entregas] = await banco.query(
            `SELECT u.id AS aluno_id, u.nome,
                    COALESCE(e.status, 'pendente')         AS status,
                    e.enviado_em,
                    COUNT(q.id)                            AS total_questoes,
                    SUM(IF(rq.correta = 1, 1, 0))          AS acertos,
                    SUM(IF(rq.correta = 0, 1, 0))          AS erros,
                    SUM(IF(rq.correta IS NULL AND q.tipo = 'dissertativa', 1, 0))
                                                           AS dissertativas_pendentes
             FROM turma_alunos ta
             JOIN usuarios u ON u.id = ta.aluno_id
             JOIN atividades a ON a.id = ?
             LEFT JOIN entregas e ON e.atividade_id = ? AND e.aluno_id = u.id
             LEFT JOIN questoes q ON q.atividade_id = ?
             LEFT JOIN respostas_questao rq ON rq.questao_id = q.id AND rq.aluno_id = u.id
             WHERE ta.turma_id = a.turma_id
             GROUP BY u.id
             ORDER BY u.nome ASC`,
            [atividadeId, atividadeId, atividadeId]
        );

        res.json({ status: "ok", entregas });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao buscar entregas.", detalhe: erro.message });
    }
}

// GET /api/turmas/:id/desempenho  (professor)
// Montado em turmas.js — aqui apenas o handler
async function getDesempenhoTurma(req, res) {
    try {
        const turmaId = parseInt(req.params.id, 10);

        // IDOR: verifica que a turma pertence ao professor logado
        const [turmaCheck] = await banco.query(
            "SELECT id FROM turmas WHERE id = ? AND professor_id = ? LIMIT 1",
            [turmaId, req.usuario.id]
        );
        if (!turmaCheck.length) {
            return res.status(403).json({ status: "erro", message: "Acesso negado." });
        }

        // SUM(IF(...)) em vez de COUNT(...) FILTER (WHERE ...) — sintaxe MySQL 8.0
        const [desempenho] = await banco.query(
            `SELECT u.id, u.nome,
                    COUNT(DISTINCT e.atividade_id)                             AS total_entregues,
                    ROUND(
                        SUM(IF(rq.correta = 1, 100, IF(rq.correta = 0, 0, NULL)))
                        / NULLIF(SUM(IF(rq.correta IS NOT NULL, 1, 0)), 0)
                    , 0)                                                       AS media_acerto_pct,
                    u.streak_atual,
                    u.pontuacao
             FROM turma_alunos ta
             JOIN usuarios u ON u.id = ta.aluno_id
             LEFT JOIN entregas e ON e.aluno_id = u.id
             LEFT JOIN atividades a ON a.id = e.atividade_id AND a.turma_id = ta.turma_id
             LEFT JOIN respostas_questao rq ON rq.aluno_id = u.id
             LEFT JOIN questoes q ON q.id = rq.questao_id AND q.tipo = 'multipla_escolha'
             WHERE ta.turma_id = ?
             GROUP BY u.id
             ORDER BY u.nome ASC`,
            [turmaId]
        );

        res.json({ status: "ok", desempenho });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao buscar desempenho.", detalhe: erro.message });
    }
}

module.exports = {
    criarAtividade,
    adicionarQuestao,
    listarProfessor,
    getDetalhe,
    responderAtividade,
    getRespostasAluno,
    getEntregas,
    getDesempenhoTurma
};

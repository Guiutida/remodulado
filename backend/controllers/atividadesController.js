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

module.exports = { criarAtividade, adicionarQuestao, listarProfessor, getDetalhe };

const banco = require("../db");

async function getProgressoFuncoes(req, res) {
    try {
        const alunoId = parseInt(req.params.id, 10);

        const [entregas] = await banco.query(
            `SELECT e.status, e.enviado_em
             FROM entregas e
             JOIN atividades a ON a.id = e.atividade_id
             WHERE e.aluno_id = ?
               AND a.titulo = 'Funcoes do 1 grau'
             LIMIT 1`,
            [alunoId]
        );

        const entrega = entregas[0];
        const concluido = ["entregue", "corrigida"].includes(entrega?.status);

        res.json({
            status: "ok",
            entrega: entrega?.status || "pendente",
            concluido,
            progresso: concluido ? 85 : 72
        });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao buscar progresso.", detalhe: erro.message });
    }
}

async function salvarProgressoFuncoes(req, res) {
    try {
        const alunoId = parseInt(req.params.id, 10);

        const [atividades] = await banco.query(
            "SELECT id FROM atividades WHERE titulo = 'Funcoes do 1 grau' LIMIT 1"
        );

        if (!atividades.length) {
            return res.status(404).json({ status: "erro", message: "Atividade não encontrada." });
        }

        const atividadeId = atividades[0].id;

        await banco.query(
            `INSERT INTO entregas (atividade_id, aluno_id, resposta, status, enviado_em)
             VALUES (?, ?, ?, 'entregue', CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE
                resposta = VALUES(resposta),
                status = 'entregue',
                enviado_em = CURRENT_TIMESTAMP`,
            [atividadeId, alunoId, "Etapa de Funcoes do 1 grau concluida."]
        );

        res.json({
            status: "ok",
            atividade_id: atividadeId,
            entrega: "entregue",
            concluido: true,
            progresso: 85
        });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao salvar progresso.", detalhe: erro.message });
    }
}

module.exports = { getProgressoFuncoes, salvarProgressoFuncoes };

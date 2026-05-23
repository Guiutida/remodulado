// backend/routes/ia.js
// Rotas de IA: tutor (aluno), geração de trilha (professor), resumos (ambos)
//
// Ordem dos middleware nas rotas de aluno com SSE:
//   autenticar → verificarAluno → iaRateLimit → handler
//   (iaRateLimit precisa de req.usuario.id — sempre após autenticar)

'use strict';

const { Router }      = require('express');
const { autenticar }  = require('../middleware/auth');
const { iaRateLimit } = require('../middleware/rateLimit');
const ia              = require('../controllers/iaController');

const roteador = Router();

function verificarProfessor(req, res, next) {
    if (req.usuario.perfil !== 'professor') {
        return res.status(403).json({ status: 'erro', message: 'Apenas professores podem executar esta ação.' });
    }
    next();
}

function verificarAluno(req, res, next) {
    if (req.usuario.perfil !== 'aluno') {
        return res.status(403).json({ status: 'erro', message: 'Apenas alunos podem executar esta ação.' });
    }
    next();
}

// ── Sessões de conversa (aluno) ───────────────────────────────────────────────
// Rotas literais ANTES de rotas com :id (padrão Express obrigatório no projeto)
roteador.post('/sessoes',               autenticar, verificarAluno, ia.criarSessao);
roteador.get('/sessoes',                autenticar, verificarAluno, ia.listarSessoes);
roteador.get('/sessoes/:id/mensagens',  autenticar, verificarAluno, ia.getMensagens);

// ── Tutor SSE (aluno) ─────────────────────────────────────────────────────────
// iaRateLimit APÓS autenticar e verificarAluno — precisa de req.usuario.id
roteador.post('/orientar', autenticar, verificarAluno, iaRateLimit, ia.orientar);

// ── Geração de trilha (professor) ────────────────────────────────────────────
roteador.post('/gerar-trilha',  autenticar, verificarProfessor, ia.gerarTrilha);
roteador.post('/salvar-trilha', autenticar, verificarProfessor, ia.salvarTrilha);

// ── Resumos de desempenho ─────────────────────────────────────────────────────
roteador.get('/resumo-aluno',               autenticar, verificarAluno,     ia.resumoAluno);
roteador.get('/resumo-turma/:turmaId',      autenticar, verificarProfessor, ia.resumoTurma);
roteador.get('/progresso-trilhas/:turmaId', autenticar, verificarProfessor, ia.progressoTrilhasTurma);

module.exports = roteador;

// backend/middleware/rateLimit.js
// Rate limit para endpoints de IA: 8 req/min por usuário autenticado
//
// ORDEM OBRIGATÓRIA nas rotas:
//   router.post('/orientar', autenticar, verificarAluno, iaRateLimit, handler)
//   ─────────────────────────────────────────────────────────────────
//   autenticar deve vir ANTES — iaRateLimit lê req.usuario.id
//
// express-rate-limit@8.5.2 já instalado na Phase 1 — não reinstalar.

'use strict';

const rateLimit = require('express-rate-limit');

const iaRateLimit = rateLimit({
    windowMs: 60 * 1000,   // janela de 1 minuto
    max: 8,                // máximo 8 requisições por janela por usuário
    standardHeaders: true, // envia RateLimit-* headers (RFC 6585)
    legacyHeaders: false,  // desabilita X-RateLimit-* legados

    // Chave por ID do usuário autenticado (não por IP)
    // req.usuario é populado pelo middleware autenticar
    keyGenerator: (req) => String(req.usuario.id),

    handler: (_req, res) => {
        res.status(429).json({
            status: 'erro',
            message: 'Limite de 8 requisições por minuto atingido. Aguarde um momento antes de tentar novamente.'
        });
    }
});

module.exports = { iaRateLimit };

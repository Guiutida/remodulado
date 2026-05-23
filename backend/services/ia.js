// backend/services/ia.js
// Instância única do cliente Gemini — importada por todos os controllers de IA
// Garante que process.env.GEMINI_API_KEY seja lido uma única vez na inicialização

'use strict';

const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELO = 'gemini-2.5-flash-lite';

module.exports = { ai, MODELO };

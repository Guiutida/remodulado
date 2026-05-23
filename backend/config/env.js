'use strict';

const OBRIGATORIAS = [
    'JWT_SECRET',
    'GEMINI_API_KEY',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME'
];

function validarEnv() {
    const ausentes = OBRIGATORIAS.filter((chave) => !process.env[chave]);
    if (ausentes.length > 0) {
        console.error('❌ Variáveis de ambiente obrigatórias ausentes:');
        ausentes.forEach((chave) => console.error(`  - ${chave}`));
        console.error('Configure essas variáveis e reinicie o servidor.');
        process.exit(1);
    }
}

module.exports = { validarEnv };

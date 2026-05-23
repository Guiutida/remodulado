// backend/scripts/migration-05.js
// Migra foto_perfil de LONGTEXT para VARCHAR(255) e limpa registros base64
// Uso: node backend/scripts/migration-05.js
// Padrão idêntico a migration-04.js: path explícito + execução separada por instrução

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const banco = require('../db');

async function executar() {
    console.log('Iniciando migration-05 (foto_perfil base64 → VARCHAR)...');

    // 1. Zerar registros base64 para NULL
    const [linhasBase64] = await banco.query(
        "SELECT COUNT(*) AS total FROM preferencias_usuario WHERE foto_perfil LIKE 'data:image%'"
    );
    const total = linhasBase64[0].total;
    console.log(`Registros base64 encontrados: ${total}`);

    if (total > 0) {
        await banco.query(
            "UPDATE preferencias_usuario SET foto_perfil = NULL WHERE foto_perfil LIKE 'data:image%'"
        );
        console.log(`${total} registro(s) base64 zerado(s) para NULL.`);
    } else {
        console.log('Nenhum registro base64 a limpar.');
    }

    // 2. Verificar tipo atual da coluna foto_perfil (idempotência)
    const [colunas] = await banco.query(
        "SHOW COLUMNS FROM preferencias_usuario LIKE 'foto_perfil'"
    );

    if (colunas.length === 0) {
        console.log('Coluna foto_perfil não encontrada — pulando ALTER TABLE.');
    } else {
        const tipoColunaAtual = colunas[0].Type.toLowerCase();
        if (tipoColunaAtual.includes('varchar(255)')) {
            console.log('Coluna foto_perfil já é VARCHAR(255) — ALTER TABLE ignorado (idempotente).');
        } else {
            await banco.query(
                'ALTER TABLE preferencias_usuario MODIFY COLUMN foto_perfil VARCHAR(255) NULL'
            );
            console.log('ALTER TABLE preferencias_usuario: foto_perfil alterada para VARCHAR(255) NULL.');
        }
    }

    console.log('Migration-05 concluída com sucesso.');
    process.exit(0);
}

executar().catch(erro => {
    console.error('Erro na migration-05:', erro.message);
    process.exit(1);
});

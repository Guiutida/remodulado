// backend/scripts/migration-04.js
// Cria tabelas sessoes_ia e mensagens_ia
// Uso: node backend/scripts/migration-04.js
// Padrão idêntico a migration-03.js: path explícito + execução separada por instrução

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const banco = require('../db');

async function executar() {
    console.log('Iniciando migration-04 (tabelas de IA)...');

    // Tabela sessoes_ia
    await banco.query(`
        CREATE TABLE IF NOT EXISTS sessoes_ia (
            id        INT          AUTO_INCREMENT PRIMARY KEY,
            aluno_id  INT          NOT NULL,
            titulo    VARCHAR(140) NOT NULL DEFAULT 'Nova conversa',
            criado_em TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (aluno_id) REFERENCES usuarios(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB
    `);
    console.log("Tabela 'sessoes_ia' verificada/criada.");

    // Tabela mensagens_ia
    await banco.query(`
        CREATE TABLE IF NOT EXISTS mensagens_ia (
            id        INT AUTO_INCREMENT PRIMARY KEY,
            sessao_id INT          NOT NULL,
            role      ENUM('user', 'model') NOT NULL,
            conteudo  TEXT         NOT NULL,
            criado_em TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sessao_id) REFERENCES sessoes_ia(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB
    `);
    console.log("Tabela 'mensagens_ia' verificada/criada.");

    console.log('Migration-04 concluída com sucesso.');
    process.exit(0);
}

executar().catch(erro => {
    console.error('Erro na migration-04:', erro.message);
    process.exit(1);
});

// backend/scripts/migration-03.js
// Executar UMA ÚNICA VEZ: node backend/scripts/migration-03.js
// Cria as tabelas questoes e respostas_questao.
// Adiciona pontuacao, streak_atual, ultimo_acesso em usuarios (idempotente).

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const banco = require("../db");

const TABELAS = [
    {
        nome: "questoes",
        sql: `CREATE TABLE IF NOT EXISTS questoes (
            id           INT            AUTO_INCREMENT PRIMARY KEY,
            atividade_id INT            NOT NULL,
            ordem        SMALLINT       NOT NULL,
            tipo         ENUM('multipla_escolha','dissertativa') NOT NULL,
            enunciado    TEXT           NOT NULL,
            opcoes       JSON           NULL,
            gabarito     VARCHAR(10)    NULL,
            criado_em    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY questao_unica (atividade_id, ordem),
            FOREIGN KEY (atividade_id) REFERENCES atividades(id) ON DELETE CASCADE
        ) ENGINE=InnoDB`
    },
    {
        nome: "respostas_questao",
        sql: `CREATE TABLE IF NOT EXISTS respostas_questao (
            id            INT        AUTO_INCREMENT PRIMARY KEY,
            aluno_id      INT        NOT NULL,
            questao_id    INT        NOT NULL,
            resposta      TEXT       NOT NULL,
            correta       TINYINT(1) NULL,
            respondido_em TIMESTAMP  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY resposta_unica (aluno_id, questao_id),
            FOREIGN KEY (aluno_id)   REFERENCES usuarios(id)  ON DELETE CASCADE,
            FOREIGN KEY (questao_id) REFERENCES questoes(id)  ON DELETE CASCADE
        ) ENGINE=InnoDB`
    }
];

async function adicionarColunasGamificacao() {
    const colunas = [
        { nome: "pontuacao",     sql: "ALTER TABLE usuarios ADD COLUMN pontuacao     INT  NOT NULL DEFAULT 0    AFTER perfil" },
        { nome: "streak_atual",  sql: "ALTER TABLE usuarios ADD COLUMN streak_atual  INT  NOT NULL DEFAULT 0    AFTER pontuacao" },
        { nome: "ultimo_acesso", sql: "ALTER TABLE usuarios ADD COLUMN ultimo_acesso DATE NULL                  AFTER streak_atual" }
    ];

    for (const col of colunas) {
        try {
            await banco.query(col.sql);
            console.log(`  Coluna 'usuarios.${col.nome}' adicionada.`);
        } catch (erro) {
            if (erro.errno === 1060) {
                console.log(`  Coluna 'usuarios.${col.nome}' já existe — ignorado.`);
            } else {
                throw erro;
            }
        }
    }
}

async function migrar() {
    for (const tabela of TABELAS) {
        await banco.query(tabela.sql);
        console.log(`  Tabela '${tabela.nome}' verificada/criada.`);
    }

    await adicionarColunasGamificacao();

    console.log("Migration-03 concluída com sucesso.");
    process.exit(0);
}

migrar().catch((erro) => {
    console.error("Erro na migration-03:", erro.message);
    process.exit(1);
});

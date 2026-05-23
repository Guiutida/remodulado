// backend/scripts/migration-02.js
// Executar UMA ÚNICA VEZ: node backend/scripts/migration-02.js
// Cria as tabelas trilhas, trilha_etapas e progresso_etapa.

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const banco = require("../db");

const TABELAS = [
    {
        nome: "trilhas",
        sql: `CREATE TABLE IF NOT EXISTS trilhas (
            id           INT          AUTO_INCREMENT PRIMARY KEY,
            turma_id     INT          NOT NULL,
            professor_id INT          NOT NULL,
            titulo       VARCHAR(140) NOT NULL,
            disciplina   VARCHAR(80)  NOT NULL,
            descricao    TEXT,
            ativa        TINYINT(1)   NOT NULL DEFAULT 1,
            criado_em    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (turma_id)     REFERENCES turmas(id)    ON DELETE CASCADE,
            FOREIGN KEY (professor_id) REFERENCES usuarios(id)  ON DELETE CASCADE
        ) ENGINE=InnoDB`
    },
    {
        nome: "trilha_etapas",
        sql: `CREATE TABLE IF NOT EXISTS trilha_etapas (
            id        INT          AUTO_INCREMENT PRIMARY KEY,
            trilha_id INT          NOT NULL,
            ordem     SMALLINT     NOT NULL,
            titulo    VARCHAR(140) NOT NULL,
            tipo      ENUM('texto','video','link') NOT NULL DEFAULT 'texto',
            conteudo  TEXT         NOT NULL,
            criado_em TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (trilha_id) REFERENCES trilhas(id) ON DELETE CASCADE,
            UNIQUE KEY etapa_unica (trilha_id, ordem)
        ) ENGINE=InnoDB`
    },
    {
        nome: "progresso_etapa",
        sql: `CREATE TABLE IF NOT EXISTS progresso_etapa (
            id           INT        AUTO_INCREMENT PRIMARY KEY,
            aluno_id     INT        NOT NULL,
            etapa_id     INT        NOT NULL,
            concluido    TINYINT(1) NOT NULL DEFAULT 0,
            concluido_em TIMESTAMP  NULL,
            UNIQUE KEY progresso_unico (aluno_id, etapa_id),
            FOREIGN KEY (aluno_id) REFERENCES usuarios(id)      ON DELETE CASCADE,
            FOREIGN KEY (etapa_id) REFERENCES trilha_etapas(id) ON DELETE CASCADE
        ) ENGINE=InnoDB`
    }
];

async function migrar() {
    for (const tabela of TABELAS) {
        await banco.query(tabela.sql);
        console.log(`  Tabela '${tabela.nome}' verificada/criada.`);
    }
    console.log("Migration-02 concluída com sucesso.");
    process.exit(0);
}

migrar().catch((erro) => {
    console.error("Erro na migration-02:", erro.message);
    process.exit(1);
});

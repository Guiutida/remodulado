-- Migration 02: Trilhas e Progresso
-- Executar UMA VEZ após database/schema.sql estar aplicado
-- Seguro para re-execução: CREATE TABLE IF NOT EXISTS

USE duopratic;

-- Trilhas criadas pelo professor e atribuídas a uma turma
-- professor_id desnormalizado: evita JOIN trilhas→turmas→professor_id em cada IDOR check
CREATE TABLE IF NOT EXISTS trilhas (
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
) ENGINE=InnoDB;

-- Etapas da trilha ordenadas; tipo determina como renderizar o conteúdo
-- UNIQUE KEY etapa_unica impede duas etapas com mesma posição na trilha
CREATE TABLE IF NOT EXISTS trilha_etapas (
    id        INT          AUTO_INCREMENT PRIMARY KEY,
    trilha_id INT          NOT NULL,
    ordem     SMALLINT     NOT NULL,
    titulo    VARCHAR(140) NOT NULL,
    tipo      ENUM('texto','video','link') NOT NULL DEFAULT 'texto',
    conteudo  TEXT         NOT NULL,
    criado_em TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trilha_id) REFERENCES trilhas(id) ON DELETE CASCADE,
    UNIQUE KEY etapa_unica (trilha_id, ordem)
) ENGINE=InnoDB;

-- Registro de progresso individual: um registro por aluno por etapa
-- NULLIF(COUNT(te.id), 0) é necessário no cálculo de percentual para evitar divisão por zero
CREATE TABLE IF NOT EXISTS progresso_etapa (
    id           INT        AUTO_INCREMENT PRIMARY KEY,
    aluno_id     INT        NOT NULL,
    etapa_id     INT        NOT NULL,
    concluido    TINYINT(1) NOT NULL DEFAULT 0,
    concluido_em TIMESTAMP  NULL,
    UNIQUE KEY progresso_unico (aluno_id, etapa_id),
    FOREIGN KEY (aluno_id) REFERENCES usuarios(id)      ON DELETE CASCADE,
    FOREIGN KEY (etapa_id) REFERENCES trilha_etapas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

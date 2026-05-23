-- migration-03-atividades.sql
-- Executar via: node backend/scripts/migration-03.js
-- ATENÇÃO: Este arquivo usa DELIMITER $$ (para referência/CLI).
--          Via mysql2/promise, cada bloco é executado pelo script JS separadamente.

USE duopratic;

-- ─── Bloco 1: questões associadas a uma atividade ───────────────────────────
CREATE TABLE IF NOT EXISTS questoes (
    id           INT            AUTO_INCREMENT PRIMARY KEY,
    atividade_id INT            NOT NULL,
    ordem        SMALLINT       NOT NULL,
    tipo         ENUM('multipla_escolha','dissertativa') NOT NULL,
    enunciado    TEXT           NOT NULL,
    opcoes       JSON           NULL,
    -- Para multipla_escolha: array de strings ["a) Texto", "b) Texto", ...]
    -- Para dissertativa: NULL
    gabarito     VARCHAR(10)    NULL,
    -- Para multipla_escolha: "a", "b", "c" ou "d"  (lowercase, sem parênteses)
    -- Para dissertativa: NULL  — corrigida por IA na Phase 4
    criado_em    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY questao_unica (atividade_id, ordem),
    FOREIGN KEY (atividade_id) REFERENCES atividades(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Bloco 2: resposta individual de um aluno a uma questão ─────────────────
CREATE TABLE IF NOT EXISTS respostas_questao (
    id            INT        AUTO_INCREMENT PRIMARY KEY,
    aluno_id      INT        NOT NULL,
    questao_id    INT        NOT NULL,
    resposta      TEXT       NOT NULL,
    correta       TINYINT(1) NULL,
    -- NULL  = dissertativa aguardando correção (Phase 4)
    -- 0     = errou (MC)
    -- 1     = acertou (MC)
    respondido_em TIMESTAMP  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY resposta_unica (aluno_id, questao_id),
    FOREIGN KEY (aluno_id)   REFERENCES usuarios(id)  ON DELETE CASCADE,
    FOREIGN KEY (questao_id) REFERENCES questoes(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Bloco 3: colunas de gamificação em usuarios ─────────────────────────────
-- Executado via script JS (migration-03.js) com try/catch errno 1060 por coluna.
-- Referência para CLI (não suportado via mysql2 diretamente com DELIMITER):
DROP PROCEDURE IF EXISTS migration03_add_cols;

DELIMITER $$
CREATE PROCEDURE migration03_add_cols()
BEGIN
    DECLARE CONTINUE HANDLER FOR 1060 BEGIN END;
    -- 1060 = ER_DUP_FIELDNAME: coluna já existe — ignorar silenciosamente

    ALTER TABLE usuarios
        ADD COLUMN pontuacao     INT  NOT NULL DEFAULT 0    AFTER perfil,
        ADD COLUMN streak_atual  INT  NOT NULL DEFAULT 0    AFTER pontuacao,
        ADD COLUMN ultimo_acesso DATE NULL                  AFTER streak_atual;
END$$
DELIMITER ;

CALL migration03_add_cols();
DROP PROCEDURE IF EXISTS migration03_add_cols;

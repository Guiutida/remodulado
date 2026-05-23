-- Migration 04: Sessões e Mensagens de IA
-- Executar UMA VEZ após migrations anteriores aplicadas
-- Seguro para re-execução: CREATE TABLE IF NOT EXISTS

USE duopratic;

-- Sessão de conversa entre aluno e tutor IA
-- Uma sessão agrupa várias mensagens; título é atualizado com o início da 1ª mensagem
CREATE TABLE IF NOT EXISTS sessoes_ia (
    id        INT          AUTO_INCREMENT PRIMARY KEY,
    aluno_id  INT          NOT NULL,
    titulo    VARCHAR(140) NOT NULL DEFAULT 'Nova conversa',
    criado_em TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (aluno_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- Mensagens trocadas dentro de uma sessão
-- role 'user' = aluno, role 'model' = Gemini
-- conteudo TEXT: suporta até 65 535 bytes — suficiente para respostas longas
CREATE TABLE IF NOT EXISTS mensagens_ia (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    sessao_id INT          NOT NULL,
    role      ENUM('user', 'model') NOT NULL,
    conteudo  TEXT         NOT NULL,
    criado_em TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sessao_id) REFERENCES sessoes_ia(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE DATABASE IF NOT EXISTS duopratic
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE duopratic;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    perfil ENUM('aluno', 'professor') NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS turmas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    disciplina VARCHAR(80) NOT NULL,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    professor_id INT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (professor_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS turma_alunos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    turma_id INT NOT NULL,
    aluno_id INT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY turma_aluno_unico (turma_id, aluno_id),
    FOREIGN KEY (turma_id) REFERENCES turmas(id)
        ON DELETE CASCADE,
    FOREIGN KEY (aluno_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS atividades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    turma_id INT NOT NULL,
    titulo VARCHAR(140) NOT NULL,
    descricao TEXT,
    prazo DATE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (turma_id) REFERENCES turmas(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS entregas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    atividade_id INT NOT NULL,
    aluno_id INT NOT NULL,
    resposta TEXT,
    status ENUM('pendente', 'entregue', 'corrigida') NOT NULL DEFAULT 'pendente',
    nota DECIMAL(4,2),
    comentario_professor TEXT,
    enviado_em TIMESTAMP NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY entrega_unica (atividade_id, aluno_id),
    FOREIGN KEY (atividade_id) REFERENCES atividades(id)
        ON DELETE CASCADE,
    FOREIGN KEY (aluno_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS avisos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    turma_id INT NOT NULL,
    professor_id INT NOT NULL,
    titulo VARCHAR(140) NOT NULL,
    mensagem TEXT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (turma_id) REFERENCES turmas(id)
        ON DELETE CASCADE,
    FOREIGN KEY (professor_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS preferencias_usuario (
    usuario_id INT PRIMARY KEY,
    tema VARCHAR(20) NOT NULL DEFAULT 'Claro',
    status_usuario VARCHAR(20) NOT NULL DEFAULT 'Online',
    foto_perfil LONGTEXT,
    notificacoes_turma TINYINT(1) NOT NULL DEFAULT 1,
    lembretes_estudo VARCHAR(30) NOT NULL DEFAULT 'Diários',
    disciplina_principal VARCHAR(80) NOT NULL DEFAULT 'Matemática',
    ritmo_semanal VARCHAR(40) NOT NULL DEFAULT '5 atividades',
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

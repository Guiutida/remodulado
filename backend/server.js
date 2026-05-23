require("dotenv").config();

const express = require("express");
const path = require("path");
const banco = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const SALT_ROUNDS = 12;

const app = express();
const porta = process.env.PORT || 3000;
const pastaPublica = path.resolve(__dirname, "..");
const camposPreferencias = {
    tema: "tema",
    status: "status_usuario",
    foto: "foto_perfil",
    notificacoes: "notificacoes_turma",
    lembretes: "lembretes_estudo",
    disciplina: "disciplina_principal",
    ritmo: "ritmo_semanal"
};

const limitadorAuth = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "erro", message: "Muitas tentativas. Tente novamente em 15 minutos." }
});

// Segurança HTTP — helmet adiciona ~12 headers de proteção (CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet());

// CORS — substituir wildcard; incluir Authorization para suportar Bearer token
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.static(pastaPublica));

async function garantirAtividadeFuncoes(alunoId) {
    const [alunos] = await banco.query(
        "SELECT id FROM usuarios WHERE id = ? AND perfil = 'aluno' LIMIT 1",
        [alunoId]
    );

    if (!alunos.length) {
        return null;
    }

    const [professores] = await banco.query(
        "SELECT id FROM usuarios WHERE email = ? LIMIT 1",
        ["ana@duopratic.local"]
    );

    let professorId = professores[0]?.id;

    if (!professorId) {
        const [professor] = await banco.query(
            "INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)",
            ["Prof. Ana Paula", "ana@duopratic.local", "123456", "professor"]
        );
        professorId = professor.insertId;
    }

    const [turmas] = await banco.query(
        "SELECT id FROM turmas WHERE codigo = ? LIMIT 1",
        ["MAT-102"]
    );

    let turmaId = turmas[0]?.id;

    if (!turmaId) {
        const [turma] = await banco.query(
            "INSERT INTO turmas (nome, disciplina, codigo, professor_id) VALUES (?, ?, ?, ?)",
            ["Matematica - 1 ano", "Matematica", "MAT-102", professorId]
        );
        turmaId = turma.insertId;
    }

    await banco.query(
        "INSERT IGNORE INTO turma_alunos (turma_id, aluno_id) VALUES (?, ?)",
        [turmaId, alunoId]
    );

    const [atividades] = await banco.query(
        "SELECT id FROM atividades WHERE turma_id = ? AND titulo = ? LIMIT 1",
        [turmaId, "Funcoes do 1 grau"]
    );

    if (atividades.length) {
        return atividades[0];
    }

    const [atividade] = await banco.query(
        "INSERT INTO atividades (turma_id, titulo, descricao) VALUES (?, ?, ?)",
        [turmaId, "Funcoes do 1 grau", "Pratica guiada sobre funcao do 1 grau."]
    );

    return { id: atividade.insertId };
}

async function garantirTabelaPreferencias() {
    await banco.query(`
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
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
    `);
}

async function garantirPreferencias(usuarioId) {
    await garantirTabelaPreferencias();
    await banco.query(
        "INSERT IGNORE INTO preferencias_usuario (usuario_id) VALUES (?)",
        [usuarioId]
    );
}

function formatarPreferencias(linha) {
    return {
        tema: linha.tema,
        status: linha.status_usuario,
        foto: linha.foto_perfil || "",
        notificacoes: linha.notificacoes_turma === 1,
        lembretes: linha.lembretes_estudo,
        disciplina: linha.disciplina_principal,
        ritmo: linha.ritmo_semanal
    };
}

app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        message: "Servidor DuoPratic online."
    });
});

app.get("/api/db/status", async (_req, res) => {
    try {
        const [linhas] = await banco.query("SELECT 1 AS conectado");
        res.json({
            status: "ok",
            database: "duopratic",
            conectado: linhas[0].conectado === 1
        });
    } catch (erro) {
        res.status(500).json({
            status: "erro",
            message: "Não foi possível conectar ao MySQL.",
            detalhe: erro.message,
            ajuda: "Confira se o MySQL do XAMPP está ligado, se o banco duopratic foi importado e se DB_USER/DB_PASSWORD estão corretos no backend/.env."
        });
    }
});

app.post("/api/cadastro", limitadorAuth, async (req, res) => {
    const { nome, email, senha, perfil } = req.body;

    if (!nome || !email || !senha || !perfil) {
        return res.status(400).json({ status: "erro", message: "Preencha todos os campos." });
    }

    if (!["aluno", "professor"].includes(perfil)) {
        return res.status(400).json({ status: "erro", message: "Perfil inválido." });
    }

    try {
        const hash = await bcrypt.hash(senha, SALT_ROUNDS);
        const [resultado] = await banco.query(
            "INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)",
            [nome, email, hash, perfil]
        );

        res.status(201).json({
            status: "ok",
            usuario: {
                id: resultado.insertId,
                nome,
                email,
                perfil
            }
        });
    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ status: "erro", message: "Este e-mail já está cadastrado." });
        }

        res.status(500).json({ status: "erro", message: "Erro ao cadastrar usuário.", detalhe: erro.message });
    }
});

app.post("/api/login", limitadorAuth, async (req, res) => {
    const { email, senha, perfil } = req.body;

    if (!email || !senha || !perfil) {
        return res.status(400).json({ status: "erro", message: "Preencha todos os campos." });
    }

    try {
        const [usuarios] = await banco.query(
            "SELECT id, nome, email, perfil, senha FROM usuarios WHERE email = ? AND perfil = ? LIMIT 1",
            [email, perfil]
        );

        if (!usuarios.length) {
            return res.status(401).json({ status: "erro", message: "E-mail, senha ou perfil inválidos." });
        }

        const usuario = usuarios[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            return res.status(401).json({ status: "erro", message: "E-mail, senha ou perfil inválidos." });
        }

        const { senha: _descartada, ...usuarioSeguro } = usuario;

        // Emitir token JWT
        const token = jwt.sign(
            { id: usuario.id, perfil: usuario.perfil },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ status: "ok", token, usuario: usuarioSeguro });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao entrar.", detalhe: erro.message });
    }
});

app.get("/api/usuarios/:id", async (req, res) => {
    try {
        const [usuarios] = await banco.query(
            "SELECT id, nome, email, perfil FROM usuarios WHERE id = ? LIMIT 1",
            [req.params.id]
        );

        if (!usuarios.length) {
            return res.status(404).json({ status: "erro", message: "Usuário não encontrado." });
        }

        res.json({ status: "ok", usuario: usuarios[0] });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao buscar usuário.", detalhe: erro.message });
    }
});

app.put("/api/usuarios/:id", async (req, res) => {
    const { nome, email, senha } = req.body;
    const campos = [];
    const valores = [];

    if (nome) {
        campos.push("nome = ?");
        valores.push(nome);
    }

    if (email) {
        campos.push("email = ?");
        valores.push(email);
    }

    if (senha) {
        campos.push("senha = ?");
        const hashSenha = await bcrypt.hash(senha, SALT_ROUNDS);
        valores.push(hashSenha);
    }

    if (!campos.length) {
        return res.status(400).json({ status: "erro", message: "Nenhum dado para atualizar." });
    }

    try {
        valores.push(req.params.id);
        await banco.query(`UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`, valores);

        const [usuarios] = await banco.query(
            "SELECT id, nome, email, perfil FROM usuarios WHERE id = ? LIMIT 1",
            [req.params.id]
        );

        res.json({ status: "ok", usuario: usuarios[0] });
    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ status: "erro", message: "Este e-mail já está cadastrado." });
        }

        res.status(500).json({ status: "erro", message: "Erro ao atualizar usuário.", detalhe: erro.message });
    }
});

app.get("/api/usuarios/:id/preferencias", async (req, res) => {
    try {
        const [usuarios] = await banco.query(
            "SELECT id FROM usuarios WHERE id = ? LIMIT 1",
            [req.params.id]
        );

        if (!usuarios.length) {
            return res.status(404).json({ status: "erro", message: "Usuario nao encontrado." });
        }

        await garantirPreferencias(req.params.id);

        const [preferencias] = await banco.query(
            "SELECT * FROM preferencias_usuario WHERE usuario_id = ? LIMIT 1",
            [req.params.id]
        );

        res.json({ status: "ok", preferencias: formatarPreferencias(preferencias[0]) });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao buscar preferencias.", detalhe: erro.message });
    }
});

app.put("/api/usuarios/:id/preferencias", async (req, res) => {
    const campos = [];
    const valores = [];

    Object.entries(req.body).forEach(([campo, valor]) => {
        const coluna = camposPreferencias[campo];
        if (!coluna) return;

        campos.push(`${coluna} = ?`);
        valores.push(campo === "notificacoes" ? (valor ? 1 : 0) : valor);
    });

    if (!campos.length) {
        return res.status(400).json({ status: "erro", message: "Nenhuma preferencia para atualizar." });
    }

    try {
        const [usuarios] = await banco.query(
            "SELECT id FROM usuarios WHERE id = ? LIMIT 1",
            [req.params.id]
        );

        if (!usuarios.length) {
            return res.status(404).json({ status: "erro", message: "Usuario nao encontrado." });
        }

        await garantirPreferencias(req.params.id);
        valores.push(req.params.id);
        await banco.query(`UPDATE preferencias_usuario SET ${campos.join(", ")} WHERE usuario_id = ?`, valores);

        const [preferencias] = await banco.query(
            "SELECT * FROM preferencias_usuario WHERE usuario_id = ? LIMIT 1",
            [req.params.id]
        );

        res.json({ status: "ok", preferencias: formatarPreferencias(preferencias[0]) });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao salvar preferencias.", detalhe: erro.message });
    }
});

app.get("/api/alunos/:id/progresso/funcoes", async (req, res) => {
    try {
        const atividade = await garantirAtividadeFuncoes(req.params.id);

        if (!atividade) {
            return res.status(404).json({ status: "erro", message: "Aluno nao encontrado." });
        }

        const [entregas] = await banco.query(
            "SELECT status, enviado_em FROM entregas WHERE atividade_id = ? AND aluno_id = ? LIMIT 1",
            [atividade.id, req.params.id]
        );

        const entrega = entregas[0];
        const concluido = ["entregue", "corrigida"].includes(entrega?.status);

        res.json({
            status: "ok",
            atividade_id: atividade.id,
            entrega: entrega?.status || "pendente",
            concluido,
            progresso: concluido ? 85 : 72
        });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao buscar progresso.", detalhe: erro.message });
    }
});

app.post("/api/alunos/:id/progresso/funcoes", async (req, res) => {
    try {
        const atividade = await garantirAtividadeFuncoes(req.params.id);

        if (!atividade) {
            return res.status(404).json({ status: "erro", message: "Aluno nao encontrado." });
        }

        await banco.query(
            `INSERT INTO entregas (atividade_id, aluno_id, resposta, status, enviado_em)
             VALUES (?, ?, ?, 'entregue', CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE
                resposta = VALUES(resposta),
                status = 'entregue',
                enviado_em = CURRENT_TIMESTAMP`,
            [atividade.id, req.params.id, "Etapa de Funcoes do 1 grau concluida."]
        );

        res.json({
            status: "ok",
            atividade_id: atividade.id,
            entrega: "entregue",
            concluido: true,
            progresso: 85
        });
    } catch (erro) {
        res.status(500).json({ status: "erro", message: "Erro ao salvar progresso.", detalhe: erro.message });
    }
});

app.get("/", (_req, res) => {
    res.sendFile(path.join(pastaPublica, "index.html"));
});

app.listen(porta, () => {
    console.log(`Servidor DuoPratic online na porta ${porta}`);
});

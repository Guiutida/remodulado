// backend/scripts/migrar-senhas.js
// Executar UMA ÚNICA VEZ para migrar senhas em texto plano para bcrypt.
// Heurística: bcrypt hashes têm exatamente 60 chars; senhas curtas são texto plano.

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const banco = require("../db");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 12;

async function migrarSenhas() {
    const [usuarios] = await banco.query(
        "SELECT id, senha FROM usuarios WHERE LENGTH(senha) < 60"
    );

    console.log(`Encontrados ${usuarios.length} usuário(s) com senha em texto plano.`);

    if (!usuarios.length) {
        console.log("Nenhuma migração necessária.");
        process.exit(0);
    }

    for (const u of usuarios) {
        const hash = await bcrypt.hash(u.senha, SALT_ROUNDS);
        await banco.query("UPDATE usuarios SET senha = ? WHERE id = ?", [hash, u.id]);
        console.log(`  Usuário ID ${u.id} migrado.`);
    }

    console.log("Migração concluída com sucesso.");
    process.exit(0);
}

migrarSenhas().catch((erro) => {
    console.error("Erro na migração:", erro.message);
    process.exit(1);
});

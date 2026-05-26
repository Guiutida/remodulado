'use strict';

/**
 * seed-demo.js — Popula o banco com dados de demonstração para o TCC.
 * Idempotente: verifica se os dados já existem antes de inserir.
 *
 * Uso:
 *   node backend/scripts/seed-demo.js
 *
 * Cria:
 *   - Professor: Ana Paula Silva (ana.paula@duopratic.com / Prof@2025)
 *   - Turma: 9º Ano A — Matemática
 *   - 3 atividades com questões de múltipla escolha e dissertativas
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const banco = require('../db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

// ─── Dados da demo ────────────────────────────────────────────────────────────

const PROFESSOR = {
    nome: 'Ana Paula Silva',
    email: 'ana.paula@duopratic.com',
    senha: 'Prof@2025',
    perfil: 'professor',
};

const TURMA = {
    nome: '9º Ano A',
    disciplina: 'Matemática',
    codigo: 'MAT9A',
};

const ATIVIDADES = [
    {
        titulo: 'Equações do 2º Grau',
        descricao: 'Avaliação sobre fórmula de Bhaskara, discriminante e natureza das raízes.',
        prazo: diasAPartirDeHoje(14),
        questoes: [
            {
                ordem: 1,
                tipo: 'multipla_escolha',
                enunciado: 'Qual é a fórmula de Bhaskara para encontrar as raízes de ax² + bx + c = 0?',
                opcoes: [
                    'a) x = (−b ± √Δ) / 2a',
                    'b) x = (b ± √Δ) / 2a',
                    'c) x = (−b ± √Δ) / a',
                    'd) x = (b ± √Δ) / a',
                ],
                gabarito: 'a',
            },
            {
                ordem: 2,
                tipo: 'multipla_escolha',
                enunciado: 'Qual é o valor do discriminante (Δ) da equação x² − 5x + 6 = 0?',
                opcoes: ['a) 1', 'b) 4', 'c) 11', 'd) 25'],
                gabarito: 'a',
            },
            {
                ordem: 3,
                tipo: 'multipla_escolha',
                enunciado: 'A equação x² + 4 = 0 possui:',
                opcoes: [
                    'a) Duas raízes reais distintas',
                    'b) Uma raiz real dupla',
                    'c) Nenhuma raiz real',
                    'd) Uma raiz real e uma complexa',
                ],
                gabarito: 'c',
            },
            {
                ordem: 4,
                tipo: 'dissertativa',
                enunciado: 'Resolva a equação x² − 7x + 12 = 0 usando a fórmula de Bhaskara. Mostre todos os passos.',
                opcoes: null,
                gabarito: null,
            },
        ],
    },
    {
        titulo: 'Teorema de Pitágoras',
        descricao: 'Aplicação do Teorema de Pitágoras em triângulos retângulos e problemas contextualizados.',
        prazo: diasAPartirDeHoje(10),
        questoes: [
            {
                ordem: 1,
                tipo: 'multipla_escolha',
                enunciado: 'Em um triângulo retângulo com catetos medindo 3 cm e 4 cm, a hipotenusa mede:',
                opcoes: ['a) 5 cm', 'b) 6 cm', 'c) 7 cm', 'd) 12 cm'],
                gabarito: 'a',
            },
            {
                ordem: 2,
                tipo: 'multipla_escolha',
                enunciado: 'O Teorema de Pitágoras estabelece que, em um triângulo retângulo:',
                opcoes: [
                    'a) a soma dos ângulos é 180°',
                    'b) o quadrado da hipotenusa é igual à soma dos quadrados dos catetos',
                    'c) os catetos têm sempre o mesmo comprimento',
                    'd) o quadrado de um cateto é igual ao produto dos outros dois lados',
                ],
                gabarito: 'b',
            },
            {
                ordem: 3,
                tipo: 'multipla_escolha',
                enunciado: 'Um quadrado tem diagonal de 10 cm. Qual é a medida do seu lado? (use √2 ≈ 1,41)',
                opcoes: ['a) 5 cm', 'b) 6,25 cm', 'c) 7,07 cm', 'd) 8 cm'],
                gabarito: 'c',
            },
            {
                ordem: 4,
                tipo: 'dissertativa',
                enunciado: 'Uma escada de 5 m apoia-se em uma parede vertical. A base da escada está a 3 m da parede. A que altura da parede a escada toca? Justifique com o Teorema de Pitágoras.',
                opcoes: null,
                gabarito: null,
            },
        ],
    },
    {
        titulo: 'Estatística Básica — Média, Moda e Mediana',
        descricao: 'Cálculo e interpretação das medidas de tendência central em conjuntos de dados.',
        prazo: diasAPartirDeHoje(7),
        questoes: [
            {
                ordem: 1,
                tipo: 'multipla_escolha',
                enunciado: 'Qual é a média aritmética dos valores: 4, 6, 8, 10, 12?',
                opcoes: ['a) 6', 'b) 7', 'c) 8', 'd) 10'],
                gabarito: 'c',
            },
            {
                ordem: 2,
                tipo: 'multipla_escolha',
                enunciado: 'A mediana do conjunto {3, 7, 9, 15, 20} é:',
                opcoes: ['a) 7', 'b) 9', 'c) 10,8', 'd) 15'],
                gabarito: 'b',
            },
            {
                ordem: 3,
                tipo: 'multipla_escolha',
                enunciado: 'No conjunto {2, 4, 4, 6, 8, 8, 8, 10}, a moda é:',
                opcoes: ['a) 4', 'b) 6', 'c) 8', 'd) 10'],
                gabarito: 'c',
            },
            {
                ordem: 4,
                tipo: 'multipla_escolha',
                enunciado: 'Um grupo de 5 alunos tirou as notas: 5, 7, 8, 9 e 6. A média da turma foi:',
                opcoes: ['a) 6,5', 'b) 7', 'c) 7,5', 'd) 8'],
                gabarito: 'b',
            },
            {
                ordem: 5,
                tipo: 'dissertativa',
                enunciado: 'As temperaturas máximas de uma cidade durante uma semana foram: 28, 31, 29, 35, 33, 30 e 27 °C. Calcule a média, a mediana e identifique se há moda. Interprete os resultados.',
                opcoes: null,
                gabarito: null,
            },
        ],
    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function diasAPartirDeHoje(dias) {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
}

function log(msg) { console.log(`  ${msg}`); }
function ok(msg)  { console.log(`  ✅ ${msg}`); }
function skip(msg){ console.log(`  ⏭  ${msg}`); }
function err(msg) { console.error(`  ❌ ${msg}`); }

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n🌱 seed-demo.js — DuoPratic\n');

    // 1. Professor
    console.log('👤 Professor...');
    let professorId;
    const [existentes] = await banco.query(
        'SELECT id FROM usuarios WHERE email = ? LIMIT 1',
        [PROFESSOR.email]
    );
    if (existentes.length) {
        professorId = existentes[0].id;
        skip(`Professor já existe (id=${professorId})`);
    } else {
        const hash = await bcrypt.hash(PROFESSOR.senha, SALT_ROUNDS);
        const [res] = await banco.query(
            'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
            [PROFESSOR.nome, PROFESSOR.email, hash, PROFESSOR.perfil]
        );
        professorId = res.insertId;
        ok(`Professor criado (id=${professorId}) — ${PROFESSOR.email} / ${PROFESSOR.senha}`);

        // preferencias padrão
        await banco.query(
            'INSERT IGNORE INTO preferencias_usuario (usuario_id) VALUES (?)',
            [professorId]
        );
    }

    // 2. Turma
    console.log('\n🏫 Turma...');
    let turmaId;
    const [turmasExist] = await banco.query(
        'SELECT id FROM turmas WHERE codigo = ? LIMIT 1',
        [TURMA.codigo]
    );
    if (turmasExist.length) {
        turmaId = turmasExist[0].id;
        skip(`Turma já existe (id=${turmaId}, código=${TURMA.codigo})`);
    } else {
        const [res] = await banco.query(
            'INSERT INTO turmas (nome, disciplina, codigo, professor_id) VALUES (?, ?, ?, ?)',
            [TURMA.nome, TURMA.disciplina, TURMA.codigo, professorId]
        );
        turmaId = res.insertId;
        ok(`Turma criada (id=${turmaId}) — "${TURMA.nome}" código: ${TURMA.codigo}`);
    }

    // 3. Atividades + Questões
    console.log('\n📝 Atividades...');
    for (const ativ of ATIVIDADES) {
        const [atExist] = await banco.query(
            'SELECT id FROM atividades WHERE turma_id = ? AND titulo = ? LIMIT 1',
            [turmaId, ativ.titulo]
        );
        let atividadeId;
        if (atExist.length) {
            atividadeId = atExist[0].id;
            skip(`Atividade já existe: "${ativ.titulo}" (id=${atividadeId})`);
        } else {
            const [res] = await banco.query(
                'INSERT INTO atividades (turma_id, titulo, descricao, prazo) VALUES (?, ?, ?, ?)',
                [turmaId, ativ.titulo, ativ.descricao, ativ.prazo]
            );
            atividadeId = res.insertId;
            ok(`Atividade criada: "${ativ.titulo}" (id=${atividadeId}, prazo: ${ativ.prazo})`);
        }

        // Questões
        for (const q of ativ.questoes) {
            const [qExist] = await banco.query(
                'SELECT id FROM questoes WHERE atividade_id = ? AND ordem = ? LIMIT 1',
                [atividadeId, q.ordem]
            );
            if (qExist.length) {
                skip(`  Questão ${q.ordem} já existe`);
            } else {
                await banco.query(
                    'INSERT INTO questoes (atividade_id, ordem, tipo, enunciado, opcoes, gabarito) VALUES (?, ?, ?, ?, ?, ?)',
                    [atividadeId, q.ordem, q.tipo, q.enunciado, q.opcoes ? JSON.stringify(q.opcoes) : null, q.gabarito]
                );
                const tipoLabel = q.tipo === 'multipla_escolha' ? 'MC' : 'Dissertativa';
                log(`  ➕ Questão ${q.ordem} (${tipoLabel}): "${q.enunciado.substring(0, 60)}..."`);
            }
        }
    }

    console.log('\n✅ Seed concluído!\n');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│  CREDENCIAIS DE DEMO                                    │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log(`│  Professor: ${PROFESSOR.email.padEnd(42)} │`);
    console.log(`│  Senha:     ${PROFESSOR.senha.padEnd(42)} │`);
    console.log(`│  Código da turma: ${TURMA.codigo.padEnd(36)} │`);
    console.log('└─────────────────────────────────────────────────────────┘\n');

    await banco.end();
}

main().catch((e) => {
    err(e.message);
    process.exit(1);
});

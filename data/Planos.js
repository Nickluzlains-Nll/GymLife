
import { exercicios } from './exercicios';

// Prioridades de seleção para cada objetivo.
// Os demais exercícios da biblioteca também ficam disponíveis
// como alternativas depois dos exercícios prioritários.

const prioridadesObjetivo = {
  ganharMassa: {
    a: [
      'a1', 'a4', 'a5', 'a2', 'a6', 'a12', 'a13',
      'a3', 'a8', 'a10', 'a15', 'a19',
    ],
    b: [
      'b1', 'b4', 'b2', 'b5', 'b3', 'b7', 'b6',
      'b25', 'b10', 'b11', 'b8', 'b12',
    ],
    c: [
      'c1', 'c2', 'c3', 'c4', 'c10', 'c5',
      'c13', 'c9', 'c14', 'c11', 'c7', 'c6',
    ],
  },

  hipertrofia: {
    a: [
      'a3', 'a4', 'a19', 'a8', 'a16', 'a5', 'a9',
      'a10', 'a7', 'a14', 'a22', 'a23', 'a25',
    ],
    b: [
      'b2', 'b12', 'b3', 'b13', 'b8', 'b16',
      'b10', 'b15', 'b11', 'b20', 'b21', 'b24',
    ],
    c: [
      'c3', 'c4', 'c13', 'c6', 'c12', 'c7',
      'c10', 'c14', 'c20', 'c2', 'c5', 'c9',
    ],
  },

  perderPeso: {
    a: [
      'a1', 'a11', 'a2', 'a4', 'a6', 'a12',
      'a13', 'a21', 'a8', 'a7', 'a15', 'a5',
    ],
    b: [
      'b1', 'b2', 'b3', 'b25', 'b10', 'b11',
      'b8', 'b9', 'b23', 'b4', 'b5', 'b6',
    ],
    c: [
      'c1', 'c2', 'c9', 'c5', 'c10', 'c11',
      'c14', 'c20', 'c3', 'c4', 'c13', 'c7',
    ],
  },

  manutencao: {
    a: [
      'a1', 'a3', 'a4', 'a5', 'a2', 'a6',
      'a8', 'a12', 'a10', 'a15', 'a19', 'a21',
    ],
    b: [
      'b1', 'b2', 'b4', 'b3', 'b5', 'b6',
      'b7', 'b10', 'b11', 'b12', 'b8', 'b15',
    ],
    c: [
      'c1', 'c2', 'c3', 'c4', 'c5', 'c6',
      'c7', 'c8', 'c9', 'c10', 'c11', 'c13',
    ],
  },
};

const objetivos = {
  ganharMassa: {
    nome: 'Ganhar massa',
    descricao:
      'Foco no desenvolvimento muscular, com exercícios compostos, acessórios e progressão gradual.',
  },

  hipertrofia: {
    nome: 'Hipertrofia',
    descricao:
      'Combinação de exercícios compostos e isoladores para estimular diferentes grupos musculares.',
  },

  perderPeso: {
    nome: 'Perder peso',
    descricao:
      'Treinos de força com movimentos compostos e trabalho equilibrado dos grupos musculares.',
  },

  manutencao: {
    nome: 'Manutenção',
    descricao:
      'Rotina equilibrada para manter força, condicionamento e regularidade.',
  },
};

const notasNivel = {
  Iniciante:
    'Iniciante: até 3 séries por exercício, priorizando técnica e aprendizado dos movimentos.',

  Intermediário:
    'Intermediário: volume padrão do plano, com progressão gradual.',

  Avançado:
    'Avançado: volume ajustado conforme a experiência, respeitando o limite de 5 séries por exercício.',
};

function normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function obterObjetivo(valor) {
  const objetivo = normalizarTexto(valor);

  if (objetivo.includes('hipertrofia')) {
    return 'hipertrofia';
  }

  if (
    objetivo.includes('perder peso') ||
    objetivo.includes('perda de peso') ||
    objetivo.includes('emagrecer')
  ) {
    return 'perderPeso';
  }

  if (
    objetivo.includes('ganhar massa') ||
    objetivo.includes('ganho de massa')
  ) {
    return 'ganharMassa';
  }

  if (
    objetivo.includes('manutencao') ||
    objetivo.includes('manter peso')
  ) {
    return 'manutencao';
  }

  return 'manutencao';
}

function obterNivel(valor) {
  const nivel = normalizarTexto(valor);

  if (nivel === 'iniciante') return 'Iniciante';
  if (nivel === 'avancado') return 'Avançado';

  return 'Intermediário';
}

// Organiza todos os exercícios do grupo.
// Os prioritários aparecem primeiro, mas nenhum exercício é descartado.
function criarCatalogo(grupo, idsPrioritarios) {
  const todos = Object.values(exercicios).filter(
    (exercicio) => exercicio.id.startsWith(grupo)
  );

  const prioritarios = idsPrioritarios
    .map((id) => exercicios[id])
    .filter(Boolean);

  const usados = new Set(
    prioritarios.map((exercicio) => exercicio.id)
  );

  const restantes = todos.filter(
    (exercicio) => !usados.has(exercicio.id)
  );

  return [...prioritarios, ...restantes];
}

// Seleciona uma quantidade de exercícios de um grupo.
function selecionarIds(catalogo, quantidade, inicio = 0) {
  return catalogo
    .slice(inicio, inicio + quantidade)
    .map((exercicio) => exercicio.id);
}

function ajustarPorNivel(exercicio, nivel) {
  const seriesBase = Number(exercicio.series) || 3;

  let series = seriesBase;

  const repeticoes =
    exercicio.reps || exercicio.repeticoes || '10–12';

  if (nivel === 'Iniciante') {
    series = Math.min(seriesBase, 3);
  }

  if (nivel === 'Avançado') {
    series = Math.min(seriesBase + 1, 5);
  }

  return {
    series,
    repeticoes,
  };
}

function criarTreino(grupo, ids, letra) {
  return {
    titulo: `Treino ${letra}`,
    grupo,

    exercicios: ids
      .map((id) => exercicios[id])
      .filter(Boolean),
  };
}

export function montarPlano(perfil) {
  const diasInformados = Number(perfil?.diasTreino);

  const dias = [2, 3, 4, 5, 6].includes(diasInformados)
    ? diasInformados
    : 3;

  const nivel = obterNivel(perfil?.experiencia);

  const chaveObjetivo = obterObjetivo(perfil?.objetivo);
  const objetivo = objetivos[chaveObjetivo];

  const prioridades = prioridadesObjetivo[chaveObjetivo];

  // Catálogos completos com os 71 exercícios disponíveis.
  const catalogos = {
    a: criarCatalogo('a', prioridades.a),
    b: criarCatalogo('b', prioridades.b),
    c: criarCatalogo('c', prioridades.c),
  };

  let base;

  // 2 dias: corpo inteiro nas duas sessões.
  if (dias === 2) {
    base = {
      nome: 'Corpo inteiro',

      descricao:
        'Dois treinos semanais trabalhando os principais grupos musculares.',

      sequenciaSemana: ['A', 'B'],

      treinos: {
        A: {
          grupo: 'Corpo inteiro A',
          ids: [
            ...selecionarIds(catalogos.a, 2, 0),
            ...selecionarIds(catalogos.b, 2, 0),
            ...selecionarIds(catalogos.c, 3, 0),
          ],
        },

        B: {
          grupo: 'Corpo inteiro B',
          ids: [
            ...selecionarIds(catalogos.a, 2, 5),
            ...selecionarIds(catalogos.b, 2, 5),
            ...selecionarIds(catalogos.c, 3, 4),
          ],
        },
      },
    };
  }

  // 4 dias: superior e inferior.
  else if (dias === 4) {
    base = {
      nome: 'Superior e inferior',

      descricao:
        'Alternância entre dois treinos de superiores e dois de inferiores.',

      sequenciaSemana: ['A', 'B', 'C', 'D'],

      treinos: {
        A: {
          grupo: 'Superior A · Peito, costas e braços',
          ids: [
            ...selecionarIds(catalogos.a, 4, 0),
            ...selecionarIds(catalogos.b, 4, 0),
          ],
        },

        B: {
          grupo: 'Inferior A · Pernas e glúteos',
          ids: selecionarIds(catalogos.c, 6, 0),
        },

        C: {
          grupo: 'Superior B · Ombros, costas e braços',
          ids: [
            ...selecionarIds(catalogos.a, 4, 8),
            ...selecionarIds(catalogos.b, 4, 8),
          ],
        },

        D: {
          grupo: 'Inferior B · Pernas e abdômen',
          ids: selecionarIds(catalogos.c, 6, 6),
        },
      },
    };
  }

  // 3, 5 e 6 dias: divisão ABC.
  else {
    const sequenciaSemana = {
      3: ['A', 'B', 'C'],
      5: ['A', 'B', 'C', 'A', 'B'],
      6: ['A', 'B', 'C', 'A', 'B', 'C'],
    };

    base = {
      nome:
        dias === 3
          ? 'ABC'
          : dias === 5
          ? 'ABC · 5 dias'
          : 'ABC · 6 dias',

      descricao:
        dias === 3
          ? 'Três treinos semanais com divisão por grupos musculares.'
          : dias === 5
          ? 'Cinco sessões semanais alternando os treinos A, B e C.'
          : 'Seis sessões semanais alternando os grupos musculares.',

      sequenciaSemana: sequenciaSemana[dias],

      treinos: {
        A: {
          grupo: 'Peito, ombro e tríceps',
          ids: selecionarIds(catalogos.a, 5),
        },

        B: {
          grupo: 'Costas, bíceps e trapézio',
          ids: selecionarIds(catalogos.b, 6),
        },

        C: {
          grupo: 'Pernas e abdômen',
          ids: selecionarIds(catalogos.c, 8),
        },
      },
    };
  }

  // Aplica as séries e repetições conforme a experiência.
  const treinos = {};

  Object.entries(base.treinos).forEach(([letra, treino]) => {
    treinos[letra] = {
      titulo: `Treino ${letra}`,
      grupo: treino.grupo,

      exercicios: treino.ids
        .map((id) => exercicios[id])
        .filter(Boolean)
        .map((exercicio) => ({
          ...exercicio,
          ...ajustarPorNivel(exercicio, nivel),
        })),
    };
  });

  return {
    treinos,

    nome: base.nome,

    descricao: `${base.descricao}\n\n${objetivo.descricao}`,

    notaNivel: notasNivel[nivel],

    objetivo: objetivo.nome,

    dias,

    nivel,

    sequenciaSemana: base.sequenciaSemana,
  };
}

// Paleta do GymLife.
// Cada cor tem dois valores: [escuro, claro].
// Para ajustar o visual de um tema inteiro, mexa só neste arquivo.

const PALETA = {
  // Fundos e superfícies
  fundo:          ['#171717', '#F1F3F6'],
  fundoProfundo:  ['#0D0D0D', '#EBEEF2'],
  superficie:     ['#171717', '#FFFFFF'],
  cartao:         ['#262626', '#FFFFFF'],
  cartaoPerfil:   ['#252525', '#FFFFFF'],
  cartaoAlt:      ['#1F1F1F', '#F7F8FA'],
  modalFundo:     ['#1B1B1B', '#FFFFFF'],
  avatarFundo:    ['#29394E', '#DBEAFE'],
  cardAzulSuave:  ['#222D3A', '#E7F0FC'],
  acentoFundo:    ['#183653', '#DBEAFE'],

  // Linhas, bordas e trilhos de barras
  borda:          ['#404040', '#D5D9E0'],
  borda2:         ['#444444', '#CDD2DA'],
  bordaPerfil:    ['#363636', '#E1E4EA'],
  bordaSuave:     ['#3A3A3A', '#E3E6EB'],
  divisor:        ['#2F2F2F', '#E3E6EB'],
  trilho:         ['#343434', '#E3E6EB'],
  trilho2:        ['#333333', '#E3E6EB'],
  trilhoAzul:     ['#3B4652', '#CBD5E1'],

  // Textos
  texto:          ['#FFFFFF', '#111827'],
  textoPerfil:    ['#F5F5F5', '#111827'],
  textoForte:     ['#F1F5F2', '#111827'],
  texto2:         ['#E5E5E5', '#1F2937'],
  texto3:         ['#D4D4D4', '#374151'],
  texto4:         ['#DCDCDC', '#374151'],
  texto5:         ['#C1CAD4', '#4B5563'],
  texto6:         ['#CFD2D0', '#4B5563'],
  texto7:         ['#AAAAAA', '#5B6270'],
  texto8:         ['#777777', '#646C7A'],
  texto9:         ['#666666', '#6B7280'],
  textoSuave:     ['#A3A3A3', '#5B6270'],
  textoMudo:      ['#737373', '#646C7A'],

  // Destaques
  acento:         ['#60A5FA', '#1668BD'],
  acentoClaro:    ['#93C5FD', '#1D4ED8'],
  verde:          ['#4ADE80', '#15803D'],
  vermelho:       ['#F87171', '#C81E1E'],
  vermelho2:      ['#F2564D', '#C81E1E'],
  amarelo:        ['#FACC15', '#946007'],

  // Variações usadas em cards azulados e trilhos de telas específicas
  cardAzul2:      ['#222B35', '#E7F0FC'],
  cardAzul3:      ['#222C35', '#E7F0FC'],
  bordaAzul2:     ['#254C70', '#B9D4F2'],
  bordaAzul3:     ['#315D7F', '#A9C8EC'],
  iconeAzulFundo: ['#173C5C', '#DBEAFE'],
  seloAtualFundo: ['#173D62', '#DBEAFE'],
  texto10:        ['#9CA3AF', '#5B6270'],
  trilho3:        ['#414141', '#E3E6EB'],
  trilho4:        ['#353535', '#E3E6EB'],
  trilho5:        ['#303030', '#E3E6EB'],
  cartaoAlt2:     ['#222222', '#F7F8FA'],
  selecaoFundo:   ['#0758A476', '#0758A4'],
  selecaoBorda:   ['#0758A496', '#0758A4'],

  // Botão principal das telas de login/cadastro (branco no escuro, preto no claro)
  botaoFundo:     ['#FFFFFF', '#111827'],
  botaoTexto:     ['#171717', '#FFFFFF'],
};

function montar(indice) {
  const resultado = {};
  for (const nome of Object.keys(PALETA)) {
    resultado[nome] = PALETA[nome][indice];
  }
  return resultado;
}

export const CORES_ESCURO = montar(0);
export const CORES_CLARO = montar(1);

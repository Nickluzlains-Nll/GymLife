import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE = '@gymlife:preferencias';

export const PREFERENCIAS_PADRAO = {
  tema: 'escuro',
  feedbackTatil: true,
};

export async function carregarPreferencias() {
  try {
    const texto = await AsyncStorage.getItem(CHAVE);
    const salvas = texto ? JSON.parse(texto) : {};

    const prefs = { ...PREFERENCIAS_PADRAO, ...salvas };

    if (!['escuro', 'claro', 'sistema'].includes(prefs.tema)) {
      prefs.tema = PREFERENCIAS_PADRAO.tema;
    }

    return prefs;
  } catch (erro) {
    console.log('Erro ao carregar preferências:', erro);
    return { ...PREFERENCIAS_PADRAO };
  }
}

export async function salvarPreferencias(parcial) {
  try {
    const atuais = await carregarPreferencias();
    const novas = { ...atuais, ...parcial };

    await AsyncStorage.setItem(CHAVE, JSON.stringify(novas));

    return novas;
  } catch (erro) {
    console.log('Erro ao salvar preferências:', erro);
    return null;
  }
}

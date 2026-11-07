import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Espaço extra, em pixels, entre a barra de status (ou notch) e o botão "Voltar".
// Para subir ou descer o botão em TODAS as telas, mude só este número.
export const ESPACO_TOPO = 28;

// Retorna o padding de topo ideal para a tela atual:
// altura real da barra de status/notch do aparelho + ESPACO_TOPO.
export function useTopo() {
  const insets = useSafeAreaInsets();

  return insets.top + ESPACO_TOPO;
}

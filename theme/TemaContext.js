import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { View, useColorScheme } from 'react-native';

import { CORES_CLARO, CORES_ESCURO } from './cores';
import {
  carregarPreferencias,
  salvarPreferencias,
} from '../utils/preferencias';

// modo: 'escuro' | 'claro' | 'sistema'
const TemaContext = createContext({
  modo: 'escuro',
  escuro: true,
  cores: CORES_ESCURO,
  definirModo: () => {},
});

export function TemaProvider({ children }) {
  const esquemaDoSistema = useColorScheme();

  const [modo, setModo] = useState('escuro');
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let ativo = true;

    carregarPreferencias().then((prefs) => {
      if (!ativo) return;

      setModo(prefs.tema);
      setPronto(true);
    });

    return () => {
      ativo = false;
    };
  }, []);

  const definirModo = useCallback((novoModo) => {
    setModo(novoModo);
    salvarPreferencias({ tema: novoModo });
  }, []);

  const escuro =
    modo === 'sistema'
      ? esquemaDoSistema !== 'light'
      : modo !== 'claro';

  const valor = useMemo(
    () => ({
      modo,
      escuro,
      cores: escuro ? CORES_ESCURO : CORES_CLARO,
      definirModo,
    }),
    [modo, escuro, definirModo]
  );

  // Espera ler a preferência salva para não piscar o tema errado.
  if (!pronto) {
    return (
      <View style={{ flex: 1, backgroundColor: CORES_ESCURO.fundo }} />
    );
  }

  return (
    <TemaContext.Provider value={valor}>
      {children}
    </TemaContext.Provider>
  );
}

export function useTema() {
  return useContext(TemaContext);
}

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from './lib/firebase';
import AppNavigator from './navigation/AppNavigator';
import VerificarEmail from './screens/VerificarEmail';
import { TemaProvider, useTema } from './theme/TemaContext';

if (Platform.OS === 'web') {
  Alert.alert = (titulo, mensagem) => {
    const texto = [titulo, mensagem].filter(Boolean).join('\n\n');
    window.alert(texto);
  };
}

// O provedor de tema precisa envolver tudo; o conteúdo lê o tema dele.
export default function App() {
  return (
    <TemaProvider>
      <Conteudo />
    </TemaProvider>
  );
}

function Conteudo() {
  const { cores, escuro } = useTema();

  const tema = useMemo(() => {
    const base = escuro ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        background: cores.fundo,
        card: cores.fundo,
      },
    };
  }, [escuro, cores]);

  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [, atualizar] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const estilo = document.createElement('style');
    estilo.textContent =
      `html, body, #root { height: 100%; margin: 0; background-color: ${cores.fundo}; }`;
    document.head.appendChild(estilo);

    return () => {
      document.head.removeChild(estilo);
    };
  }, [cores.fundo]);

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, (usuario) => {
      setSessao(usuario);
      setCarregando(false);
    });

    return cancelar;
  }, []);

  if (carregando) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: cores.fundo,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator color={cores.acento} />
      </View>
    );
  }

  const precisaVerificar = sessao && !sessao.emailVerified;

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <StatusBar style={escuro ? 'light' : 'dark'} />

      {precisaVerificar ? (
        <VerificarEmail aoVerificar={() => atualizar((n) => n + 1)} />
      ) : (
        <NavigationContainer theme={tema}>
          <AppNavigator sessao={sessao} />
        </NavigationContainer>
      )}
    </View>
  );
}
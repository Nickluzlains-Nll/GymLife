import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useTema } from '../theme/TemaContext';

export default function VerificarEmail({ aoVerificar }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  const [verificando, setVerificando] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;

    const temporizador = setTimeout(() => setEspera(espera - 1), 1000);

    return () => clearTimeout(temporizador);
  }, [espera]);

  async function jaConfirmei() {
    setVerificando(true);

    try {
      await auth.currentUser.reload();

      if (auth.currentUser.emailVerified) {
        aoVerificar();
      } else {
        Alert.alert(
          'Ainda não confirmado',
          'Abra o link que enviamos para o seu e-mail e depois toque aqui de novo.'
        );
      }
    } catch (erro) {
      Alert.alert(
        'Atenção',
        'Não foi possível verificar agora. Tente de novo em instantes.'
      );
    } finally {
      setVerificando(false);
    }
  }

  async function reenviar() {
    try {
      await sendEmailVerification(auth.currentUser);
      setEspera(60);
      Alert.alert(
        'E-mail enviado',
        'Confira sua caixa de entrada e também a pasta de spam.'
      );
    } catch (erro) {
      const mensagem =
        erro.code === 'auth/too-many-requests'
          ? 'Muitas tentativas. Aguarde um pouco e tente de novo.'
          : 'Não foi possível enviar o e-mail. Tente novamente.';

      Alert.alert('Atenção', mensagem);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>GymLife</Text>

      <Text style={styles.titulo}>Confirme seu e-mail</Text>

      <Text style={styles.texto}>
        Enviamos um link de confirmação para
      </Text>

      <Text style={styles.email}>{auth.currentUser?.email}</Text>

      <Text style={styles.texto}>
        Abra o e-mail, toque no link e volte aqui. Se não encontrar, olhe a
        pasta de spam.
      </Text>

      <TouchableOpacity
        style={[styles.botao, verificando && styles.desativado]}
        onPress={jaConfirmei}
        disabled={verificando}
        activeOpacity={0.8}
      >
        {verificando ? (
          <ActivityIndicator color={cores.botaoTexto} />
        ) : (
          <Text style={styles.textoBotao}>JÁ CONFIRMEI</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={reenviar} disabled={espera > 0}>
        <Text style={[styles.link, espera > 0 && styles.linkDesativado]}>
          {espera > 0 ? `Reenviar e-mail em ${espera}s` : 'Reenviar e-mail'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => signOut(auth)}>
        <Text style={[styles.link, styles.sair]}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const criarEstilos = (cores) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  logo: {
    color: '#0b6ac3',
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 28,
  },

  titulo: {
    color: cores.texto,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 14,
  },

  texto: {
    color: cores.textoSuave,
    fontSize: 15,
    lineHeight: 22,
  },

  email: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 8,
  },

  botao: {
    height: 55,
    backgroundColor: cores.botaoFundo,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 22,
  },

  desativado: {
    opacity: 0.6,
  },

  textoBotao: {
    color: cores.botaoTexto,
    fontSize: 16,
    fontWeight: 'bold',
  },

  link: {
    color: cores.texto3,
    fontSize: 15,
    textAlign: 'center',
  },

  linkDesativado: {
    opacity: 0.5,
  },

  sair: {
    marginTop: 18,
    color: '#0c75d7',
  },
});
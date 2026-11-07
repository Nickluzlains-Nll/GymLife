import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useTema } from '../theme/TemaContext';

function traduzirErro(codigo) {
  switch (codigo) {
    case 'auth/invalid-email':
      return 'Digite um e-mail válido.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
    case 'auth/network-request-failed':
      return 'Sem conexão com a internet.';
    default:
      return 'Não foi possível enviar o e-mail. Tente novamente.';
  }
}

export default function RecuperarSenha({ navigation }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  const [email, setEmail] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function enviarLink() {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Atenção', 'Digite um e-mail válido.');
      return;
    }

    setCarregando(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());

      Alert.alert(
        'E-mail enviado',
        'Se esse e-mail tiver uma conta, você vai receber um link para criar uma nova senha. Confira também o spam.'
      );
      navigation.navigate('Login');
    } catch (erro) {
      Alert.alert('Atenção', traduzirErro(erro.code));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.conteudo}
      >
        <Text style={styles.logo}>GymLife</Text>

        <Text style={styles.titulo}>Recuperar senha</Text>

        <Text style={styles.subtitulo}>
          Digite seu e-mail e enviaremos um link para você criar uma nova senha.
        </Text>

        <Text style={styles.label}>E-mail</Text>

        <TextInput
          style={styles.input}
          placeholder="seuemail@exemplo.com"
          placeholderTextColor={cores.textoMudo}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.botao, carregando && styles.botaoDesativado]}
          onPress={enviarLink}
          disabled={carregando}
          activeOpacity={0.8}
        >
          {carregando ? (
            <ActivityIndicator color={cores.botaoTexto} />
          ) : (
            <Text style={styles.textoBotao}>ENVIAR LINK</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          disabled={carregando}
        >
          <Text style={styles.link}>Voltar para o login</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const criarEstilos = (cores) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
  },

  conteudo: {
    padding: 25,
    paddingTop: 50,
    paddingBottom: 45,
  },

  logo: {
    color: cores.textoSuave,
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 22,
  },

  titulo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: cores.texto,
    marginBottom: 8,
  },

  subtitulo: {
    fontSize: 16,
    color: cores.textoSuave,
    marginBottom: 25,
  },

  label: {
    fontSize: 15,
    color: cores.texto2,
    marginBottom: 8,
    marginTop: 18,
    fontWeight: '600',
  },

  input: {
    height: 52,
    backgroundColor: cores.cartao,
    borderRadius: 10,
    paddingHorizontal: 15,
    color: cores.texto,
    fontSize: 15,
    borderWidth: 1,
    borderColor: cores.borda,
  },

  botao: {
    height: 55,
    backgroundColor: cores.botaoFundo,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 35,
    marginBottom: 22,
  },

  botaoDesativado: {
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
});
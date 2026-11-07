import { useState, useMemo } from 'react';
import CampoSenha from '../components/CampoSenha';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator,} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useTema } from '../theme/TemaContext';

function traduzirErro(codigo) {
  switch (codigo) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'E-mail ou senha incorretos.';
    case 'auth/invalid-email':
      return 'Digite um e-mail válido.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
    case 'auth/network-request-failed':
      return 'Sem conexão com a internet.';
    default:
      return 'Não foi possível entrar. Tente novamente.';
  }
}

export default function Login({ navigation }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    if (!email.trim() || !senha) {
      Alert.alert('Atenção', 'Preencha e-mail e senha.');
      return;
    }

    setCarregando(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
    } catch (erro) {
      Alert.alert('Não foi possível entrar', traduzirErro(erro.code));
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

        <Text style={styles.titulo}>Entrar</Text>

        <Text style={styles.subtitulo}>
          Que bom ter você de volta.
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

        <Text style={styles.label}>Senha</Text>

        <CampoSenha
          value={senha} 
          onChangeText={setSenha}
          placeholder="Digite sua senha"
        />

        <TouchableOpacity
          style={[styles.botao, carregando && styles.botaoDesativado]}
          onPress={entrar}
          disabled={carregando}
          activeOpacity={0.8}
        >
          {carregando ? (
            <ActivityIndicator color={cores.botaoTexto} />
          ) : (
            <Text style={styles.textoBotao}>ENTRAR</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
        onPress={() => navigation.navigate('RecuperarSenha')}
        disabled={carregando}
        >
        <Text style={[styles.link, { marginBottom: 16 }]}>
        Esqueci minha senha
        </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Cadastro')}
          disabled={carregando}
        >
          <Text style={styles.link}>Não tenho conta. Criar agora</Text>
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
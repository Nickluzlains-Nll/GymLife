import { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator,} from 'react-native';
import CampoSenha from '../components/CampoSenha';
import { createUserWithEmailAndPassword,sendEmailVerification,} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useTema } from '../theme/TemaContext';

export default function Cadastro({ navigation }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [idade, setIdade] = useState('');
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');

  const [objetivo, setObjetivo] = useState('');
  const [experiencia, setExperiencia] = useState('');
  const [dias, setDias] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const objetivos = [
    'Ganhar massa',
    'Perder peso',
    'Hipertrofia',
    'Manutenção',
  ];

  const experiencias = [
    'Iniciante',
    'Intermediário',
    'Avançado',
  ];

  function selecionarOpcao(valor, selecionado) {
    return [
      styles.opcao,
      selecionado && styles.opcaoSelecionada,
    ];
  }

  async function criarConta() {
    if (!nome.trim() || !email.trim() || !senha || !idade || !peso || !altura) {
      Alert.alert(
        'Atenção',
        'Preencha todos os dados pessoais, e-mail e senha.'
      );
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert('E-mail inválido', 'Digite um e-mail válido.');
      return;
    }

    if (senha.length < 6) {
      Alert.alert(
        'Senha curta',
        'A senha precisa ter pelo menos 6 caracteres.'
      );
      return;
    }

    const idadeNum = Number(idade);
    const pesoNum = Number(peso.replace(',', '.'));
    const alturaNum = Number(altura.replace(',', '.'));

    if (
      !Number.isFinite(idadeNum) ||
      idadeNum < 1 ||
      idadeNum > 120
    ) {
      Alert.alert('Idade inválida', 'Digite uma idade válida.');
      return;
    }

    if (
      !Number.isFinite(pesoNum) ||
      pesoNum <= 0 ||
      pesoNum > 500
    ) {
      Alert.alert(
        'Peso inválido',
        'Digite um peso válido em kg.'
      );
      return;
    }

    if (
      !Number.isFinite(alturaNum) ||
      alturaNum <= 0 ||
      alturaNum > 250
    ) {
      Alert.alert(
        'Altura inválida',
        'Digite a altura em centímetros. Exemplo: 175.'
      );
      return;
    }

    if (!objetivo || !experiencia || !dias) {
      Alert.alert(
        'Atenção',
        'Selecione seu objetivo, nível de experiência e dias de treino.'
      );
      return;
    }

    const usuario = {
      nome: nome.trim(),
      idade: idadeNum,
      peso: pesoNum,
      altura: alturaNum,
      objetivo,
      experiencia,
      diasTreino: dias,
    };

    setCarregando(true);

    try {
    const credencial = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      senha
    );

    await setDoc(doc(db, 'usuarios', credencial.user.uid), {
    ...usuario,
    email: email.trim(),
    criadoEm: serverTimestamp(),
  });
 
   try {
    await sendEmailVerification(credencial.user);
    } catch (erroEmail) {
    console.log('Erro ao enviar verificação:', erroEmail);
    }
    
} catch (erro) {
  let mensagem = 'Não foi possível criar a conta. Tente novamente.';

  if (erro.code === 'auth/email-already-in-use') {
    mensagem = 'Esse e-mail já tem uma conta. Tente entrar.';
  } else if (erro.code === 'auth/invalid-email') {
    mensagem = 'Digite um e-mail válido.';
  } else if (erro.code === 'auth/weak-password') {
    mensagem = 'Escolha uma senha mais forte.';
  } else if (erro.code === 'permission-denied') {
    mensagem =
      'Conta criada, mas o perfil não foi salvo. Confira as regras do Firestore.';
  }

  Alert.alert('Atenção', mensagem);
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

        <Text style={styles.titulo}>Criar conta</Text>

        <Text style={styles.subtitulo}>
          Vamos conhecer você melhor.
        </Text>

        {/* NOME */}
        <Text style={styles.label}>Nome completo</Text>

        <TextInput
          style={styles.input}
          placeholder="Digite seu nome"
          placeholderTextColor={cores.textoMudo}
          value={nome}
          onChangeText={setNome}
          autoCapitalize="words"
          maxLength={80}
        />

        {/* E-MAIL */}
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

        {/* SENHA */}
        <Text style={styles.label}>Senha</Text>

        <CampoSenha
          value={senha}
          onChangeText={setSenha}
          placeholder="Mínimo de 6 caracteres"
        />

        {/* IDADE */}
        <Text style={styles.label}>Idade</Text>

        <TextInput
          style={styles.input}
          placeholder="Ex: 20"
          placeholderTextColor={cores.textoMudo}
          value={idade}
          onChangeText={setIdade}
          keyboardType="number-pad"
          maxLength={3}
        />

        {/* PESO */}
        <Text style={styles.label}>Peso (kg)</Text>

        <TextInput
          style={styles.input}
          placeholder="Ex: 70,5"
          placeholderTextColor={cores.textoMudo}
          value={peso}
          onChangeText={setPeso}
          keyboardType="decimal-pad"
          maxLength={6}
        />

        {/* ALTURA */}
        <Text style={styles.label}>Altura (cm)</Text>

        <TextInput
          style={styles.input}
          placeholder="Ex: 175"
          placeholderTextColor={cores.textoMudo}
          value={altura}
          onChangeText={setAltura}
          keyboardType="decimal-pad"
          maxLength={6}
        />

        {/* OBJETIVO */}
        <Text style={styles.label}>
          Qual é o seu objetivo?
        </Text>

        <View style={styles.listaOpcoes}>
          {objetivos.map((item) => (
            <TouchableOpacity
              key={item}
              style={selecionarOpcao(
                item,
                objetivo === item
              )}
              onPress={() => setObjetivo(item)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.textoOpcao,
                  objetivo === item &&
                    styles.textoSelecionado,
                ]}
              >
                {objetivo === item ? '✓  ' : ''}
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* EXPERIÊNCIA */}
        <Text style={styles.label}>
          Nível de experiência
        </Text>

        <View style={styles.listaOpcoes}>
          {experiencias.map((item) => (
            <TouchableOpacity
              key={item}
              style={selecionarOpcao(
                item,
                experiencia === item
              )}
              onPress={() => setExperiencia(item)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.textoOpcao,
                  experiencia === item &&
                    styles.textoSelecionado,
                ]}
              >
                {experiencia === item ? '✓  ' : ''}
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FREQUÊNCIA */}
        <Text style={styles.label}>
          Quantos dias por semana você treina?
        </Text>

        <View style={styles.opcoesDias}>
          {[2, 3, 4, 5, 6].map((dia) => (
            <TouchableOpacity
              key={dia}
              style={[
                styles.dia,
                dias === dia && styles.opcaoSelecionada,
              ]}
              onPress={() => setDias(dia)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.textoDia,
                  dias === dia && styles.textoSelecionado,
                ]}
              >
                {dia}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.ajudaDias}>
          Selecione a quantidade de dias.
        </Text>

        {/* BOTÃO */}
        <TouchableOpacity
          style={[styles.botao, carregando && styles.botaoDesativado]}
          onPress={criarConta}
          disabled={carregando}
          activeOpacity={0.8}
        >
          {carregando ? (
            <ActivityIndicator color={cores.botaoTexto} />
          ) : (
            <Text style={styles.textoBotao}>
              CRIAR CONTA
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          disabled={carregando}
        >
          <Text style={styles.link}>Já tenho uma conta</Text>
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

  listaOpcoes: {
    gap: 10,
  },

  opcao: {
    minHeight: 50,
    backgroundColor: cores.cartao,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: cores.borda,
  },

  opcaoSelecionada: {
    backgroundColor: cores.selecaoFundo,
    borderColor: cores.selecaoBorda,
  },

  textoOpcao: {
    color: cores.texto3,
    fontSize: 15,
  },

  textoSelecionado: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  opcoesDias: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },

  dia: {
    width: 52,
    height: 52,
    backgroundColor: cores.cartao,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: cores.borda,
  },

  textoDia: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: 'bold',
  },

  ajudaDias: {
    color: cores.textoSuave,
    fontSize: 12,
    marginTop: 8,
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

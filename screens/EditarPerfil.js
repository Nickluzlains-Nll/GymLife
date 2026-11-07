import { useState, useEffect, useMemo } from "react";
import {StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator,} from 'react-native';
import {doc, getDoc, setDoc, serverTimestamp} from 'firebase/firestore'
import {auth, db} from '../lib/firebase';
import { useTema } from '../theme/TemaContext';
import { useTopo } from '../theme/layout';

const objetivos = [
    'Ganhar massa',
    'Perder peso',
    'Hipertrofia',
    'Manutenção',
];

const experiencias = ['Iniciante', 'Intermediario','Avançado'];

export default function EditarPerfil({navigation}) {
  const { cores } = useTema();
  const espacoTopo = useTopo();
  const styles = useMemo(
    () => criarEstilos(cores, espacoTopo),
    [cores, espacoTopo]
  );

    const[nome, setNome] = useState('');
    const[idade, setIdade] = useState('');
    const[peso, setPeso] = useState('')
    const [altura, setAltura] = useState('');
    const [objetivo, setObjetivo] = useState('');
    const [experiencia, setExperiencia] = useState('');
    const [dias, setDias] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
 
  useEffect(() => {
    let ativo = true;
 
    async function carregar() {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
 
      try {
        const snap = await getDoc(doc(db, 'usuarios', uid));
 
        if (!ativo) return;
 
        if (snap.exists()) {
          const dados = snap.data();
 
          setNome(dados.nome ?? '');
          setIdade(dados.idade != null ? String(dados.idade) : '');
          setPeso(dados.peso != null ? String(dados.peso).replace('.', ',') : '');
          setAltura(
            dados.altura != null ? String(dados.altura).replace('.', ',') : ''
          );
          setObjetivo(dados.objetivo ?? '');
          setExperiencia(dados.experiencia ?? '');
          setDias(dados.diasTreino ?? null);
        }
      } catch (erro) {
        console.log('Erro ao carregar perfil:', erro);
        Alert.alert('Atenção', 'Não foi possível carregar seu perfil.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }
 
    carregar();
 
    return () => {
      ativo = false;
    };
  }, []);
 
  async function salvar() {
    if (!nome.trim() || !idade || !peso || !altura) {
      Alert.alert('Atenção', 'Preencha todos os dados pessoais.');
      return;
    }
 
    const idadeNum = Number(idade);
    const pesoNum = Number(String(peso).replace(',', '.'));
    const alturaNum = Number(String(altura).replace(',', '.'));
 
    if (!Number.isFinite(idadeNum) || idadeNum < 1 || idadeNum > 120) {
      Alert.alert('Idade inválida', 'Digite uma idade válida.');
      return;
    }
 
    if (!Number.isFinite(pesoNum) || pesoNum <= 0 || pesoNum > 500) {
      Alert.alert('Peso inválido', 'Digite um peso válido em kg.');
      return;
    }
 
    if (!Number.isFinite(alturaNum) || alturaNum <= 0 || alturaNum > 250) {
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
 
    const uid = auth.currentUser?.uid;
    if (!uid) return;
 
    setSalvando(true);
 
    try {
      await setDoc(
        doc(db, 'usuarios', uid),
        {
          nome: nome.trim(),
          idade: idadeNum,
          peso: pesoNum,
          altura: alturaNum,
          objetivo,
          experiencia,
          diasTreino: dias,
          atualizadoEm: serverTimestamp(),
        },
        { merge: true }
      );
 
      Alert.alert('Pronto!', 'Seu perfil foi atualizado.');
      navigation.goBack();
    } catch (erro) {
      console.log('Erro ao salvar perfil:', erro);
      Alert.alert(
        'Erro ao salvar',
        'Não foi possível salvar. Verifique sua conexão e tente de novo.'
      );
      setSalvando(false);
    }
  }
 
  if (carregando) {
    return (
      <View style={[styles.container, styles.centro]}>
        <ActivityIndicator color="#0c75d7" />
      </View>
    );
  }
 
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.conteudo}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={salvando}>
          <Text style={styles.voltar}>← Voltar</Text>
        </TouchableOpacity>
 
        <Text style={styles.titulo}>Editar perfil</Text>
 
        <Text style={styles.subtitulo}>Mantenha seus dados atualizados.</Text>
 
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
 
        <Text style={styles.label}>Qual é o seu objetivo?</Text>
 
        <View style={styles.listaOpcoes}>
          {objetivos.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.opcao,
                objetivo === item && styles.opcaoSelecionada,
              ]}
              onPress={() => setObjetivo(item)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.textoOpcao,
                  objetivo === item && styles.textoSelecionado,
                ]}
              >
                {objetivo === item ? '✓  ' : ''}
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
 
        <Text style={styles.label}>Nível de experiência</Text>
 
        <View style={styles.listaOpcoes}>
          {experiencias.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.opcao,
                experiencia === item && styles.opcaoSelecionada,
              ]}
              onPress={() => setExperiencia(item)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.textoOpcao,
                  experiencia === item && styles.textoSelecionado,
                ]}
              >
                {experiencia === item ? '✓  ' : ''}
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
 
        <Text style={styles.label}>Quantos dias por semana você treina?</Text>
 
        <View style={styles.opcoesDias}>
          {[2, 3, 4, 5, 6].map((dia) => (
            <TouchableOpacity
              key={dia}
              style={[styles.dia, dias === dia && styles.opcaoSelecionada]}
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
 
        <TouchableOpacity
          style={[styles.botao, salvando && styles.botaoDesativado]}
          onPress={salvar}
          disabled={salvando}
          activeOpacity={0.8}
        >
          {salvando ? (
            <ActivityIndicator color={cores.botaoTexto} />
          ) : (
            <Text style={styles.textoBotao}>SALVAR ALTERAÇÕES</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
 
const criarEstilos = (cores, espacoTopo) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
 
  centro: {
    justifyContent: 'center',
    alignItems: 'center',
  },
 
  conteudo: {
    padding: 25,
    paddingTop: espacoTopo,
    paddingBottom: 45,
  },
 
  voltar: {
    color: '#0c75d7',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 18,
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
    marginBottom: 10,
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
 
  botao: {
    height: 55,
    backgroundColor: cores.botaoFundo,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 35,
  },
 
  botaoDesativado: {
    opacity: 0.6,
  },
 
  textoBotao: {
    color: cores.botaoTexto,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
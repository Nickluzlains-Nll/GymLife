import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';

import { auth } from '../lib/firebase';
import { useTema } from '../theme/TemaContext';
import { useTopo } from '../theme/layout';

// Preencha com o link da sua política de privacidade.
// É obrigatória para publicar na Google Play e na App Store.
const POLITICA_PRIVACIDADE_URL = '';

function LinhaInfo({ icone, titulo, valor, corValor }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  return (
    <View style={styles.linhaInfo}>
      <Ionicons name={icone} size={17} color={cores.acento} />
      <Text style={styles.tituloInfo}>{titulo}</Text>
      <Text
        style={[styles.valorInfo, corValor && { color: corValor }]}
        numberOfLines={1}
      >
        {valor}
      </Text>
    </View>
  );
}

function Acao({ icone, titulo, descricao, onPress, carregando }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  return (
    <TouchableOpacity
      style={styles.acao}
      onPress={onPress}
      disabled={carregando}
      activeOpacity={0.7}
    >
      <Ionicons name={icone} size={18} color={cores.acento} />

      <View style={styles.textosAcao}>
        <Text style={styles.tituloAcao}>{titulo}</Text>
        {descricao ? (
          <Text style={styles.descricaoAcao}>{descricao}</Text>
        ) : null}
      </View>

      {carregando ? (
        <ActivityIndicator color={cores.acento} />
      ) : (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={cores.texto8}
        />
      )}
    </TouchableOpacity>
  );
}

export default function Privacidade({ navigation }) {
  const { cores } = useTema();
  const espacoTopo = useTopo();
  const styles = useMemo(
    () => criarEstilos(cores, espacoTopo),
    [cores, espacoTopo]
  );

  const usuario = auth.currentUser;
  const [enviando, setEnviando] = useState(false);

  function confirmarAlterarSenha() {
    if (!usuario?.email) {
      Alert.alert('Erro', 'Não foi possível identificar o e-mail da conta.');
      return;
    }

    Alert.alert(
      'Alterar senha',
      `Vamos enviar um link para redefinir sua senha para ${usuario.email}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar link',
          onPress: async () => {
            try {
              setEnviando(true);
              await sendPasswordResetEmail(auth, usuario.email);

              Alert.alert(
                'E-mail enviado',
                'Confira sua caixa de entrada (e o spam) para redefinir a senha.'
              );
            } catch (erro) {
              console.log('Erro ao enviar redefinição:', erro.code);

              Alert.alert(
                'Erro',
                erro.code === 'auth/too-many-requests'
                  ? 'Muitas tentativas. Aguarde um pouco e tente de novo.'
                  : 'Não foi possível enviar o e-mail. Tente novamente.'
              );
            } finally {
              setEnviando(false);
            }
          },
        },
      ]
    );
  }

  async function abrirPolitica() {
    try {
      await Linking.openURL(POLITICA_PRIVACIDADE_URL);
    } catch (erro) {
      Alert.alert('Erro', 'Não foi possível abrir o link.');
    }
  }

  const emailVerificado = !!usuario?.emailVerified;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.conteudo}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.voltar}
          activeOpacity={0.8}
        >
          <Text style={styles.textoVoltar}>‹  Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.etiqueta}>GYMLIFE • CONTA</Text>
        <Text style={styles.titulo}>Privacidade e segurança</Text>
        <Text style={styles.subtitulo}>
          Veja as informações da sua conta e gerencie a segurança dela.
        </Text>

        <Text style={styles.secao}>INFORMAÇÕES DA CONTA</Text>

        <View style={styles.cartao}>
          <LinhaInfo
            icone="mail-outline"
            titulo="E-mail"
            valor={usuario?.email || '-'}
          />

          <LinhaInfo
            icone="shield-checkmark-outline"
            titulo="Verificação"
            valor={emailVerificado ? 'E-mail verificado' : 'Pendente'}
            corValor={emailVerificado ? cores.verde : cores.amarelo}
          />
        </View>

        <Text style={styles.secao}>SEGURANÇA</Text>

        <View style={styles.cartao}>
          <Acao
            icone="key-outline"
            titulo="Alterar senha"
            descricao="Enviamos um link de redefinição para o seu e-mail."
            onPress={confirmarAlterarSenha}
            carregando={enviando}
          />
        </View>

        <Text style={styles.secao}>SEUS DADOS</Text>

        <View style={styles.cartaoTexto}>
          <Text style={styles.textoCorpo}>
            Guardamos apenas o necessário para o app funcionar: seus dados de
            perfil, plano, histórico de treinos, XP, conquistas e a foto que
            você escolher. Esses dados são usados somente dentro do GymLife.
          </Text>

          <Text style={[styles.textoCorpo, { marginTop: 10 }]}>
            Para apagar tudo, use a opção “Excluir conta” no final da tela de
            perfil. A exclusão é definitiva.
          </Text>
        </View>

        {POLITICA_PRIVACIDADE_URL ? (
          <View style={[styles.cartao, { marginTop: 14 }]}>
            <Acao
              icone="document-text-outline"
              titulo="Política de privacidade"
              onPress={abrirPolitica}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const criarEstilos = (cores, espacoTopo) => StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundoProfundo },

  conteudo: { padding: 22, paddingTop: espacoTopo, paddingBottom: 45 },

  voltar: { alignSelf: 'flex-start', marginBottom: 25 },
  textoVoltar: { color: cores.texto3, fontSize: 16 },

  etiqueta: {
    color: cores.acento,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 9,
  },

  titulo: { color: cores.textoPerfil, fontSize: 26, fontWeight: 'bold' },

  subtitulo: {
    color: cores.textoSuave,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 26,
  },

  secao: {
    color: cores.texto2,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },

  cartao: {
    backgroundColor: cores.cartaoPerfil,
    borderRadius: 14,
    marginBottom: 24,
    overflow: 'hidden',
  },

  linhaInfo: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.bordaPerfil,
  },

  tituloInfo: { color: cores.textoSuave, fontSize: 12 },

  valorInfo: {
    flex: 1,
    color: cores.textoPerfil,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },

  acao: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },

  textosAcao: { flex: 1 },
  tituloAcao: { color: cores.textoPerfil, fontSize: 14, fontWeight: '600' },
  descricaoAcao: { color: cores.textoSuave, fontSize: 11, marginTop: 3 },

  cartaoTexto: {
    backgroundColor: cores.cartaoPerfil,
    borderRadius: 14,
    padding: 14,
  },

  textoCorpo: { color: cores.texto3, fontSize: 12, lineHeight: 18 },
});

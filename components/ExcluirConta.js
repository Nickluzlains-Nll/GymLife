import { useState, useMemo } from 'react';

import { Ionicons } from '@expo/vector-icons';

import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth';

import {
  doc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

import { auth, db } from '../lib/firebase';
import CampoSenha from './CampoSenha';
import { useTema } from '../theme/TemaContext';

// Exclui todos os documentos de uma coleção em lotes.
async function excluirColecaoDoUsuario(uid, nomeColecao) {
  const referencia = collection(
    db,
    'usuarios',
    uid,
    nomeColecao
  );

  const resultado = await getDocs(referencia);

  // O Firestore permite até 500 operações por lote.
  // Usamos 450 para manter uma margem de segurança.
  for (let i = 0; i < resultado.docs.length; i += 450) {
    const lote = writeBatch(db);

    const documentos = resultado.docs.slice(i, i + 450);

    documentos.forEach((documento) => {
      lote.delete(documento.ref);
    });

    // IMPORTANTE: executa realmente a exclusão.
    await lote.commit();
  }
}

export default function ExcluirConta() {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  function fechar() {
    if (carregando) return;

    setSenha('');
    setAberto(false);
  }

  async function excluir() {
    const usuario = auth.currentUser;

    if (!usuario) {
      Alert.alert(
        'Sessão encerrada',
        'Entre novamente na sua conta para continuar.'
      );

      return;
    }

    if (!usuario.email) {
      Alert.alert(
        'Erro',
        'Não foi possível identificar o e-mail desta conta.'
      );

      return;
    }

    if (!senha.trim()) {
      Alert.alert(
        'Atenção',
        'Digite sua senha para confirmar.'
      );

      return;
    }

    setCarregando(true);

    try {
      // 1. Confirma a identidade do usuário.
      const credencial = EmailAuthProvider.credential(
        usuario.email,
        senha
      );

      await reauthenticateWithCredential(usuario, credencial);

      // 2. Apaga todos os documentos das coleções do usuário.
      const colecoesDoUsuario = [
        'treinos',
        'diasTreino',
        'recompensasTreinos',
        'gamificacao',
      ];

      for (const nomeColecao of colecoesDoUsuario) {
        await excluirColecaoDoUsuario(
          usuario.uid,
          nomeColecao
        );
      }

      // 3. Apaga o documento principal do perfil.
      await deleteDoc(
        doc(db, 'usuarios', usuario.uid)
      );

      // 4. Apaga a conta do Firebase Authentication por último.
      // Assim, a autenticação ainda está disponível para excluir
      // os documentos protegidos pelas regras do Firestore.
      await deleteUser(usuario);

      setSenha('');
      setAberto(false);

      Alert.alert(
        'Conta excluída',
        'Sua conta e os dados associados foram excluídos com sucesso.'
      );
    } catch (erro) {
      console.log(
        'Erro ao excluir conta:',
        erro.code,
        erro.message
      );

      let mensagem = 'Não foi possível excluir a conta. Tente novamente.';

      switch (erro.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/invalid-login-credentials':
          mensagem = 'Senha incorreta. Confira sua senha e tente novamente.';
          break;

        case 'auth/too-many-requests':
          mensagem = 'Muitas tentativas. Aguarde um pouco e tente novamente.';
          break;

        case 'auth/network-request-failed':
        case 'unavailable':
          mensagem = 'Sem conexão com a internet. Verifique sua conexão.';
          break;

        case 'auth/requires-recent-login':
          mensagem = 'Sua sessão precisa ser atualizada. Saia da conta, entre novamente e tente excluir.';
          break;

        case 'permission-denied':
          mensagem = 'O Firestore não permitiu excluir algum dos seus dados. Confira as regras de segurança.';
          break;

        case 'not-found':
          mensagem = 'Algum dado da conta não foi encontrado. Entre novamente e tente outra vez.';
          break;

        default:
          mensagem = `Não foi possível excluir a conta. Erro: ${erro.code || erro.message}`;
      }

      setSenha('');

      Alert.alert('Atenção', mensagem);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <TouchableOpacity
        style={styles.botaoExcluir}
        onPress={() => setAberto(true)}
        activeOpacity={0.8}
      >
        <Ionicons
          name="trash-outline"
          size={18}
          color={cores.vermelho}
        />

        <Text style={styles.textoExcluir}>
          Excluir conta
        </Text>
      </TouchableOpacity>

      <Modal
        visible={aberto}
        transparent
        animationType="fade"
        onRequestClose={fechar}
      >
        <View style={styles.fundo}>
          <View style={styles.caixa}>
            <Text style={styles.titulo}>
              Excluir conta
            </Text>

            <Text style={styles.aviso}>
              Isso apaga sua conta e seus dados de forma definitiva.
              Essa ação não pode ser desfeita.
            </Text>

            <Text style={styles.label}>
              Digite sua senha para confirmar
            </Text>

            <CampoSenha
              value={senha}
              onChangeText={setSenha}
              placeholder="Sua senha"
            />

            <TouchableOpacity
              style={[
                styles.botaoConfirmar,
                carregando && styles.desativado,
              ]}
              onPress={excluir}
              disabled={carregando}
              activeOpacity={0.8}
            >
              {carregando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.textoConfirmar}>
                  EXCLUIR DEFINITIVAMENTE
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={fechar}
              disabled={carregando}
            >
              <Text style={styles.cancelar}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const criarEstilos = (cores) => StyleSheet.create({
  // Mesmo visual do botão "Sair da conta" do Perfil.
  botaoExcluir: {
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.bordaPerfil,
  },

  textoExcluir: {
    color: cores.vermelho,
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },

  fundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 24,
  },

  caixa: {
    backgroundColor: cores.cartao,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: cores.borda,
  },

  titulo: {
    color: cores.texto,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  aviso: {
    color: cores.texto3,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },

  label: {
    color: cores.texto2,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 8,
  },

  botaoConfirmar: {
    height: 52,
    backgroundColor: '#B3261E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 16,
  },

  desativado: {
    opacity: 0.6,
  },

  textoConfirmar: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },

  cancelar: {
    color: cores.texto3,
    fontSize: 15,
    textAlign: 'center',
  },
});
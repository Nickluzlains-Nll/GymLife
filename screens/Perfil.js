
import { useEffect, useState, useMemo } from 'react';

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Modal,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import {
  manipulateAsync,
  SaveFormat,
} from 'expo-image-manipulator';

import { signOut } from 'firebase/auth';

import {
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';

import { auth, db } from '../lib/firebase';
import usePlano from '../hooks/usePlano';
import { iniciais } from '../utils/iniciais';
import ExcluirConta from '../components/ExcluirConta';
import { useTema } from '../theme/TemaContext';
import { useTopo } from '../theme/layout';

const XP_POR_NIVEL = 200;

function formatarNumero(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return '-';
  }

  return String(valor).replace('.', ',');
}

function formatarXP(valor) {
  return Math.max(0, Number(valor) || 0).toLocaleString('pt-BR');
}

function calcularNivel(xp) {
  return Math.floor(Math.max(0, xp) / XP_POR_NIVEL) + 1;
}

function nomeDoNivel(nivel) {
  if (nivel >= 20) return 'Lenda';
  if (nivel >= 15) return 'Elite';
  if (nivel >= 10) return 'Avançado';
  if (nivel >= 5) return 'Experiente';
  if (nivel >= 2) return 'Dedicado';

  return 'Iniciante';
}

function formatarDias(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return '-';
  }

  const texto = String(valor);

  if (texto.toLowerCase().includes('dia')) {
    return texto;
  }

  return `${texto} dias por semana`;
}

// Linha de configuração.
function ItemMenu({
  icone,
  titulo,
  onPress,
  ultimaLinha = false,
}) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  return (
    <TouchableOpacity
      style={[
        styles.itemMenu,
        !ultimaLinha && styles.bordaItem,
      ]}
      onPress={onPress}
      activeOpacity={0.65}
    >
      <Ionicons
        name={icone}
        size={17}
        color={cores.acento}
        style={styles.iconeMenu}
      />

      <Text style={styles.textoMenu}>
        {titulo}
      </Text>

      <Ionicons
        name="chevron-forward"
        size={16}
        color={cores.texto8}
      />
    </TouchableOpacity>
  );
}

// Cartão de XP, conquistas ou treinos.
function CartaoResumo({
  valor,
  titulo,
  icone,
  textoIcone,
  onPress,
}) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  return (
    <TouchableOpacity
      style={styles.cartaoResumo}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {textoIcone ? (
        <Text style={styles.textoIconeResumo}>
          {textoIcone}
        </Text>
      ) : (
        <Ionicons
          name={icone}
          size={19}
          color={cores.textoPerfil}
        />
      )}

      <Text style={styles.valorResumo}>
        {valor}
      </Text>

      <Text style={styles.tituloResumo}>
        {titulo}
      </Text>
    </TouchableOpacity>
  );
}

// Linha de informação dentro do painel de dados pessoais.
function LinhaInformacao({ titulo, valor, icone }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  return (
    <View style={styles.linhaInformacao}>
      <View style={styles.ladoInformacao}>
        <Ionicons
          name={icone}
          size={17}
          color={cores.acento}
        />

        <Text style={styles.nomeInformacao}>
          {titulo}
        </Text>
      </View>

      <Text style={styles.valorInformacao}>
        {valor || '-'}
      </Text>
    </View>
  );
}

export default function Perfil({ navigation }) {
  const { cores } = useTema();
  const espacoTopo = useTopo();
  const styles = useMemo(
    () => criarEstilos(cores, espacoTopo),
    [cores, espacoTopo]
  );

  const {
    perfil,
    plano,
    carregando,
  } = usePlano();

  const [fotoURL, setFotoURL] = useState(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const [xp, setXp] = useState(0);
  const [conquistas, setConquistas] = useState(0);
  const [treinos, setTreinos] = useState(0);

  const [carregandoGamificacao, setCarregandoGamificacao] = useState(true);

  // Controla a abertura dos dados pessoais.
  const [dadosPessoaisVisiveis, setDadosPessoaisVisiveis] =
    useState(false);

  const usuario = auth.currentUser;
  const uid = usuario?.uid;

  const nome = perfil?.nome || 'Atleta GymLife';

  const nivel = calcularNivel(xp);
  const classificacao = nomeDoNivel(nivel);

  // Atualiza a foto quando o perfil é carregado.
  useEffect(() => {
    setFotoURL(perfil?.fotoURL || null);
  }, [perfil?.fotoURL]);

  // Busca os dados de gamificação.
  useEffect(() => {
    let ativo = true;

    async function carregarGamificacao() {
      if (!uid) {
        setCarregandoGamificacao(false);
        return;
      }

      try {
        setCarregandoGamificacao(true);

        const referencia = doc(
          db,
          'usuarios',
          uid,
          'gamificacao',
          'perfil'
        );

        const documento = await getDoc(referencia);

        if (!ativo) return;

        if (documento.exists()) {
          const dados = documento.data();

          setXp(
            Number(
              dados.xpTotal ??
              dados.xp ??
              dados.totalXP
            ) || 0
          );

          setTreinos(
            Number(dados.treinosConcluidos) || 0
          );

          setConquistas(
            Array.isArray(dados.conquistas)
              ? dados.conquistas.length
              : 0
          );
        } else {
          setXp(0);
          setTreinos(0);
          setConquistas(0);
        }
      } catch (erro) {
        console.log('Erro ao carregar gamificação:', erro);
      } finally {
        if (ativo) {
          setCarregandoGamificacao(false);
        }
      }
    }

    carregarGamificacao();

    return () => {
      ativo = false;
    };
  }, [uid]);

  // Abre a galeria.
  async function escolherFoto() {
    try {
      const permissao =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissao.granted) {
        Alert.alert(
          'Permissão necessária',
          'Precisamos de acesso à galeria para escolher sua foto de perfil.'
        );

        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (resultado.canceled) return;

      const imagem = resultado.assets?.[0];

      if (!imagem?.uri) return;

      await salvarFoto(imagem.uri);
    } catch (erro) {
      console.log('Erro ao escolher foto:', erro);

      Alert.alert(
        'Erro',
        'Não foi possível abrir sua galeria. Tente novamente.'
      );
    }
  }

  // Salva a foto em Base64 no Firestore.
  async function salvarFoto(uri) {
    const usuarioAtual = auth.currentUser;

    if (!usuarioAtual) {
      Alert.alert(
        'Erro',
        'Você precisa estar conectado à sua conta.'
      );

      return;
    }

    try {
      setEnviandoFoto(true);

      const imagemReduzida = await manipulateAsync(
        uri,
        [{ resize: { width: 320, height: 320 } }],
        {
          compress: 0.4,
          format: SaveFormat.JPEG,
          base64: true,
        }
      );

      if (!imagemReduzida.base64) {
        throw new Error('Não foi possível converter a imagem.');
      }

      const novaFoto =
        `data:image/jpeg;base64,${imagemReduzida.base64}`;

      if (novaFoto.length > 450000) {
        Alert.alert(
          'Imagem muito grande',
          'Escolha outra imagem ou tente uma foto menor.'
        );

        return;
      }

      await updateDoc(
        doc(db, 'usuarios', usuarioAtual.uid),
        {
          fotoURL: novaFoto,
        }
      );

      setFotoURL(novaFoto);

      Alert.alert(
        'Foto atualizada',
        'Sua foto de perfil foi alterada com sucesso.'
      );
    } catch (erro) {
      console.log('Erro ao salvar foto:', erro);

      Alert.alert(
        'Erro ao salvar',
        'Não foi possível salvar sua foto. Verifique sua conexão e as regras do Firestore.'
      );
    } finally {
      setEnviandoFoto(false);
    }
  }

  // Menu da foto.
  function confirmarAlteracaoFoto() {
    Alert.alert(
      'Foto de perfil',
      'O que você deseja fazer?',
      [
        {
          text: 'Escolher outra foto',
          onPress: escolherFoto,
        },
        ...(fotoURL
          ? [
              {
                text: 'Remover foto',
                style: 'destructive',
                onPress: removerFoto,
              },
            ]
          : []),
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  }

  // Remove a foto.
  async function removerFoto() {
    const usuarioAtual = auth.currentUser;

    if (!usuarioAtual) return;

    try {
      setEnviandoFoto(true);

      await updateDoc(
        doc(db, 'usuarios', usuarioAtual.uid),
        {
          fotoURL: null,
        }
      );

      setFotoURL(null);

      Alert.alert(
        'Foto removida',
        'Sua foto de perfil foi removida.'
      );
    } catch (erro) {
      console.log('Erro ao remover foto:', erro);

      Alert.alert(
        'Erro',
        'Não foi possível remover sua foto. Tente novamente.'
      );
    } finally {
      setEnviandoFoto(false);
    }
  }

  // Abre uma tela já existente.
  function abrirTela(tela) {
    navigation.navigate(tela);
  }

  // Mostra informações de funcionalidades em desenvolvimento.
  function opcaoEmDesenvolvimento(titulo, mensagem) {
    Alert.alert(titulo, mensagem);
  }

  // Sair da conta.
  function sairDaConta() {
    Alert.alert(
      'Sair da conta',
      'Deseja realmente sair da sua conta?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (erro) {
              console.log('Erro ao sair:', erro);

              Alert.alert(
                'Erro',
                'Não foi possível sair da conta. Tente novamente.'
              );
            }
          },
        },
      ]
    );
  }

  if (carregando) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator
          size="large"
          color={cores.acento}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.conteudo}
      >
        {/* CABEÇALHO */}
        <View style={styles.topo}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.botaoVoltar}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.textoVoltar}>‹  Voltar</Text>
          </TouchableOpacity>

          <Text style={styles.logo}>
            GYMLIFE
          </Text>
        </View>

        {/* CARTÃO DO PERFIL */}
        <View style={styles.cartaoPerfil}>
          <TouchableOpacity
            style={styles.areaAvatar}
            onPress={confirmarAlteracaoFoto}
            disabled={enviandoFoto}
            activeOpacity={0.8}
          >
            <View style={styles.avatar}>
              {fotoURL ? (
                <Image
                  source={{ uri: fotoURL }}
                  style={styles.imagemAvatar}
                />
              ) : (
                <Ionicons
                  name="person-outline"
                  size={34}
                  color={cores.acentoClaro}
                />
              )}

              {enviandoFoto && (
                <View style={styles.overlayFoto}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.informacoesPerfil}>
            <Text style={styles.tituloPerfil}>
              Seu perfil
            </Text>

            <Text
              style={styles.nomePerfil}
              numberOfLines={1}
            >
              {nome}
            </Text>

            <View style={styles.etiquetaNivel}>
              <Text style={styles.textoNivel}>
                {classificacao} · Nível {nivel}
              </Text>
            </View>
          </View>

          {/* LÁPIS CONTINUA ABRINDO A EDIÇÃO */}
          <TouchableOpacity
            style={styles.botaoEditar}
            onPress={() => abrirTela('EditarPerfil')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="create-outline"
              size={19}
              color={cores.acento}
            />
          </TouchableOpacity>
        </View>

        {/* XP, CONQUISTAS E TREINOS */}
        <View style={styles.areaResumo}>
          <CartaoResumo
            valor={
              carregandoGamificacao
                ? '...'
                : formatarXP(xp)
            }
            titulo="Experiência"
            textoIcone="XP"
            onPress={() => abrirTela('Niveis')}
          />

          <CartaoResumo
            valor={
              carregandoGamificacao
                ? '...'
                : formatarNumero(conquistas)
            }
            titulo="Conquistas"
            icone="trophy-outline"
            onPress={() => abrirTela('Conquistas')}
          />

          <CartaoResumo
            valor={
              carregandoGamificacao
                ? '...'
                : formatarNumero(treinos)
            }
            titulo="Treinos"
            icone="barbell-outline"
            onPress={() => abrirTela('Historico')}
          />
        </View>

        {/* ACESSOS RÁPIDOS */}
        <Text style={styles.tituloSecao}>
          ACESSOS RÁPIDOS
        </Text>

        <View style={styles.grupoMenu}>
          <ItemMenu
            icone="trending-up-outline"
            titulo="Evolução"
            onPress={() => abrirTela('Evolucao')}
          />

          <ItemMenu
            icone="trophy-outline"
            titulo="Conquistas"
            onPress={() => abrirTela('Conquistas')}
          />

          <ItemMenu
            icone="flame-outline"
            titulo="Desafios"
            onPress={() => abrirTela('Desafios')}
            ultimaLinha
          />
        </View>

        {/* MINHA CONTA */}
        <Text style={styles.tituloSecao}>
          MINHA CONTA
        </Text>

        <View style={styles.grupoMenu}>
          <ItemMenu
            icone="person-outline"
            titulo="Dados pessoais"
            onPress={() => setDadosPessoaisVisiveis(true)}
          />

          <ItemMenu
            icone="camera-outline"
            titulo="Alterar foto de perfil"
            onPress={confirmarAlteracaoFoto}
            ultimaLinha
          />
        </View>

        {/* GYMLIFE */}
        <Text style={styles.tituloSecao}>
          GYMLIFE
        </Text>

        <View style={styles.grupoMenu}>
          <ItemMenu
            icone="notifications-outline"
            titulo="Notificações"
            onPress={() =>
              opcaoEmDesenvolvimento(
                'Notificações',
                'As preferências de notificações serão implementadas em uma próxima atualização.'
              )
            }
          />

          <ItemMenu
            icone="color-palette-outline"
            titulo="Aparência"
            onPress={() => abrirTela('Aparencia')}
          />
        </View>

        <View style={styles.grupoMenu}>
          <ItemMenu
            icone="shield-checkmark-outline"
            titulo="Privacidade e segurança"
            onPress={() => abrirTela('Privacidade')}
            ultimaLinha
          />
        </View>

        <View style={styles.grupoMenu}>
          <ItemMenu
            icone="information-circle-outline"
            titulo="Sobre o GymLife e ajuda"
            onPress={() => abrirTela('Sobre')}
            ultimaLinha
          />
        </View>

        {/* SAIR DA CONTA */}
        <TouchableOpacity
          style={styles.botaoSair}
          onPress={sairDaConta}
          activeOpacity={0.7}
        >
          <Ionicons
            name="log-out-outline"
            size={18}
            color={cores.vermelho}
          />

          <Text style={styles.textoSair}>
            Sair da conta
          </Text>
        </TouchableOpacity>

        {/* EXCLUIR CONTA */}
        <View style={styles.areaExcluir}>
          <ExcluirConta />
        </View>

        <Text style={styles.rodape}>
          GymLife • Sua evolução começa aqui
        </Text>
      </ScrollView>

      {/* PAINEL DE DADOS PESSOAIS */}
      <Modal
        visible={dadosPessoaisVisiveis}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setDadosPessoaisVisiveis(false)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCartao}>
            {/* CABEÇALHO DO PAINEL */}
            <View style={styles.modalTopo}>
              <View>
                <Text style={styles.modalTitulo}>
                  Dados pessoais
                </Text>

                <Text style={styles.modalSubtitulo}>
                  Suas informações no GymLife
                </Text>
              </View>

              <TouchableOpacity
                style={styles.botaoFechar}
                onPress={() => setDadosPessoaisVisiveis(false)}
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={cores.textoSuave}
                />
              </TouchableOpacity>
            </View>

            {/* AVATAR E NOME */}
            <View style={styles.resumoPessoal}>
              <View style={styles.avatarPequeno}>
                {fotoURL ? (
                  <Image
                    source={{ uri: fotoURL }}
                    style={styles.imagemAvatar}
                  />
                ) : (
                  <Text style={styles.iniciaisPequenas}>
                    {iniciais(nome)}
                  </Text>
                )}
              </View>

              <View style={styles.resumoPessoalTexto}>
                <Text style={styles.nomeResumoPessoal}>
                  {nome}
                </Text>

                <Text style={styles.emailResumoPessoal}>
                  {auth.currentUser?.email || 'E-mail não informado'}
                </Text>
              </View>
            </View>

            {/* INFORMAÇÕES */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.listaInformacoes}
            >
              <LinhaInformacao
                icone="person-outline"
                titulo="Nome"
                valor={perfil?.nome}
              />

              <LinhaInformacao
                icone="calendar-outline"
                titulo="Idade"
                valor={
                  perfil?.idade != null
                    ? `${formatarNumero(perfil.idade)} anos`
                    : '-'
                }
              />

              <LinhaInformacao
                icone="scale-outline"
                titulo="Peso"
                valor={
                  perfil?.peso != null
                    ? `${formatarNumero(perfil.peso)} kg`
                    : '-'
                }
              />

              <LinhaInformacao
                icone="resize-outline"
                titulo="Altura"
                valor={
                  perfil?.altura != null
                    ? `${formatarNumero(perfil.altura)} cm`
                    : '-'
                }
              />

              <LinhaInformacao
                icone="flag-outline"
                titulo="Objetivo"
                valor={perfil?.objetivo}
              />

              <LinhaInformacao
                icone="fitness-outline"
                titulo="Experiência"
                valor={
                  plano?.nivel ||
                  perfil?.experiencia ||
                  '-'
                }
              />

              <LinhaInformacao
                icone="calendar-number-outline"
                titulo="Dias de treino"
                valor={formatarDias(
                  plano?.dias ?? perfil?.diasTreino
                )}
              />
            </ScrollView>

            {/* BOTÃO EDITAR */}
            <TouchableOpacity
              style={styles.botaoEditarDados}
              onPress={() => {
                setDadosPessoaisVisiveis(false);
                abrirTela('EditarPerfil');
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="create-outline"
                size={17}
                color="#FFFFFF"
              />

              <Text style={styles.textoBotaoEditarDados}>
                Editar perfil
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const criarEstilos = (cores, espacoTopo) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundoProfundo,
  },

  carregando: {
    flex: 1,
    backgroundColor: cores.fundoProfundo,
    justifyContent: 'center',
    alignItems: 'center',
  },

  conteudo: {
    paddingHorizontal: 14,

    // Mais espaço no topo para não ficar colado
    // na barra de status do aparelho.
    paddingTop: espacoTopo,

    paddingBottom: 40,
  },

  // CABEÇALHO
  topo: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },

  logo: {
    color: cores.acento,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  botaoVoltar: {
    justifyContent: 'center',
  },

  textoVoltar: {
    color: cores.texto3,
    fontSize: 16,
  },

  // PERFIL
  cartaoPerfil: {
    backgroundColor: cores.superficie,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },

  areaAvatar: {
    marginRight: 10,
  },

  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: cores.avatarFundo,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  imagemAvatar: {
    width: '100%',
    height: '100%',
  },

  overlayFoto: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000099',
    justifyContent: 'center',
    alignItems: 'center',
  },

  informacoesPerfil: {
    flex: 1,
    justifyContent: 'center',
  },

  tituloPerfil: {
    color: cores.textoPerfil,
    fontSize: 14,
    fontWeight: '600',
  },

  nomePerfil: {
    color: cores.textoSuave,
    fontSize: 11,
    marginTop: 5,
  },

  etiquetaNivel: {
    alignSelf: 'flex-start',
    backgroundColor: cores.acentoFundo,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 5,
  },

  textoNivel: {
    color: cores.acento,
    fontSize: 9,
    fontWeight: '600',
  },

  botaoEditar: {
    padding: 7,
    marginLeft: 4,
  },

  // CARTÕES RESUMO
  areaResumo: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 14,
  },

  cartaoResumo: {
    flex: 1,
    minHeight: 87,
    backgroundColor: cores.cartaoPerfil,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 9,
  },

  textoIconeResumo: {
    color: cores.textoPerfil,
    fontSize: 13,
    fontWeight: '800',
  },

  valorResumo: {
    color: cores.textoPerfil,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 3,
  },

  tituloResumo: {
    color: cores.textoSuave,
    fontSize: 10,
    marginTop: 3,
    textAlign: 'center',
  },

  // MENU
  tituloSecao: {
    color: cores.texto2,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
    marginBottom: 1,
  },

  grupoMenu: {
    marginBottom: 8,
  },

  itemMenu: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },

  bordaItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.bordaPerfil,
  },

  iconeMenu: {
    width: 19,
    marginRight: 1,
  },

  textoMenu: {
    flex: 1,
    color: cores.textoPerfil,
    fontSize: 12,
    marginLeft: 1,
  },

  // SAIR
  botaoSair: {
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginTop: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.bordaPerfil,
  },

  textoSair: {
    color: cores.vermelho,
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },

  areaExcluir: {
    marginTop: 0,
  },

  rodape: {
    color: cores.texto9,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 18,
  },

  // MODAL DE DADOS PESSOAIS
  modalFundo: {
    flex: 1,
    backgroundColor: '#000000BB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 35,
  },

  modalCartao: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: cores.modalFundo,
    borderRadius: 20,
    padding: 19,
    borderWidth: 1,
    borderColor: cores.bordaPerfil,
  },

  modalTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 17,
  },

  modalTitulo: {
    color: cores.textoPerfil,
    fontSize: 19,
    fontWeight: '700',
  },

  modalSubtitulo: {
    color: cores.textoSuave,
    fontSize: 11,
    marginTop: 5,
  },

  botaoFechar: {
    width: 33,
    height: 33,
    borderRadius: 17,
    backgroundColor: cores.cartaoPerfil,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resumoPessoal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.cartaoPerfil,
    padding: 12,
    borderRadius: 13,
    marginBottom: 12,
  },

  avatarPequeno: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: cores.avatarFundo,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  iniciaisPequenas: {
    color: cores.acentoClaro,
    fontSize: 17,
    fontWeight: 'bold',
  },

  resumoPessoalTexto: {
    flex: 1,
    marginLeft: 11,
  },

  nomeResumoPessoal: {
    color: cores.textoPerfil,
    fontSize: 13,
    fontWeight: '600',
  },

  emailResumoPessoal: {
    color: cores.textoSuave,
    fontSize: 10,
    marginTop: 4,
  },

  listaInformacoes: {
    flexGrow: 0,
  },

  linhaInformacao: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.bordaPerfil,
    paddingVertical: 8,
  },

  ladoInformacao: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  nomeInformacao: {
    color: cores.textoSuave,
    fontSize: 12,
    marginLeft: 9,
  },

  valorInformacao: {
    color: cores.textoPerfil,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 10,
  },

  botaoEditarDados: {
    backgroundColor: '#0C75D7',
    minHeight: 45,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },

  textoBotaoEditarDados: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

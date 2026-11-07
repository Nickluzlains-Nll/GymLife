import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Linking,
  StyleSheet,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../theme/TemaContext';
import { useTopo } from '../theme/layout';

const VERSAO = require('../app.json').expo.version;

// Preencha antes de publicar. Se ficar vazio, a opção some da tela.
const EMAIL_SUPORTE = 'nick.luzlains@gmail.com';

// ============================================================
// SOBRE O CRIADOR — preencha com os seus dados.
// Campos vazios não aparecem. Se o nome ficar vazio, a seção
// inteira fica escondida.
// ============================================================
const AUTOR = {
  nome: 'Nicolas Luz Lains',
  funcao: 'Criador do GymLife • Etec',
  bio:
    'Sou estudante de Desenvolvimento de Sistemas na Etec e apaixonado por musculação. ' +
    'O GymLife nasceu como ideia de projeto de TCC e virou um app de verdade: eu queria ' +
    'juntar treino, evolução e constância em um só lugar, do jeito que quem treina ' +
    'gostaria de usar. Se tiver sugestão ou encontrar algum problema, fala comigo!',
  github: 'https://github.com/Nickluzlains-Nll',
  instagram: 'https://www.instagram.com/nicolas_luz07/',
  linkedin: '',
  email: '', // o e-mail já aparece no botão "Falar com o suporte"
};

// Para usar sua foto: coloque o arquivo em assets/autor.jpg e troque
// null por  require('../assets/autor.jpg')
const FOTO_AUTOR = null;

const LINKS_AUTOR = [
  { icone: 'logo-github', rotulo: 'GitHub', url: AUTOR.github },
  { icone: 'logo-instagram', rotulo: 'Instagram', url: AUTOR.instagram },
  { icone: 'logo-linkedin', rotulo: 'LinkedIn', url: AUTOR.linkedin },
  {
    icone: 'mail-outline',
    rotulo: 'E-mail',
    url: AUTOR.email ? `mailto:${AUTOR.email}` : '',
  },
].filter((link) => link.url);

function iniciais(nome) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}

const PERGUNTAS = [
  {
    pergunta: 'Como altero meus dados?',
    resposta:
      'No Perfil, abra “Dados pessoais” e toque em “Editar perfil”. Você pode mudar peso, altura, objetivo e dias de treino.',
  },
  {
    pergunta: 'Como meu plano de treino é montado?',
    resposta:
      'O plano é gerado a partir do seu objetivo, nível de experiência e dias de treino por semana. Se você mudar essas informações no perfil, o plano é atualizado.',
  },
  {
    pergunta: 'Como funcionam o XP e os níveis?',
    resposta:
      'Você ganha XP ao treinar e a cada 200 XP sobe de nível. Toque no cartão “Experiência” no Perfil para ver todos os níveis.',
  },
  {
    pergunta: 'Como excluo minha conta?',
    resposta:
      'No final da tela de Perfil, toque em “Excluir conta” e confirme com sua senha. Todos os seus dados são apagados de forma definitiva.',
  },
];

function Pergunta({ pergunta, resposta, ultima }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  const [aberta, setAberta] = useState(false);

  return (
    <View style={!ultima && styles.bordaPergunta}>
      <TouchableOpacity
        style={styles.cabecaPergunta}
        onPress={() => setAberta((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.textoPergunta}>{pergunta}</Text>

        <Ionicons
          name={aberta ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={cores.texto8}
        />
      </TouchableOpacity>

      {aberta && <Text style={styles.resposta}>{resposta}</Text>}
    </View>
  );
}

export default function Sobre({ navigation }) {
  const { cores } = useTema();
  const espacoTopo = useTopo();
  const styles = useMemo(
    () => criarEstilos(cores, espacoTopo),
    [cores, espacoTopo]
  );

  async function abrirLink(url) {
    try {
      await Linking.openURL(url);
    } catch (erro) {
      Alert.alert('Erro', 'Não foi possível abrir o link.');
    }
  }

  async function falarComSuporte() {
    try {
      await Linking.openURL(
        `mailto:${EMAIL_SUPORTE}?subject=${encodeURIComponent(
          `GymLife ${VERSAO} - Suporte`
        )}`
      );
    } catch (erro) {
      Alert.alert('Erro', `Escreva para ${EMAIL_SUPORTE}`);
    }
  }

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

        <View style={styles.marca}>
          <View style={styles.icone}>
            <Ionicons name="barbell" size={34} color={cores.acento} />
          </View>

          <Text style={styles.nomeApp}>GymLife</Text>
          <Text style={styles.versao}>Versão {VERSAO}</Text>
        </View>

        <Text style={styles.descricao}>
          O GymLife é seu aplicativo de treinos e evolução física. Monte seu
          plano, acompanhe sua carga, conquiste níveis e mantenha a
          constância. Sua evolução começa aqui!
        </Text>

        {AUTOR.nome ? (
          <>
            <Text style={styles.secao}>SOBRE O CRIADOR</Text>

            <View style={styles.cartaoAutor}>
              <View style={styles.topoAutor}>
                {FOTO_AUTOR ? (
                  <Image source={FOTO_AUTOR} style={styles.fotoAutor} />
                ) : (
                  <View style={styles.avatarAutor}>
                    <Text style={styles.iniciaisAutor}>
                      {iniciais(AUTOR.nome)}
                    </Text>
                  </View>
                )}

                <View style={styles.textosAutor}>
                  <Text style={styles.nomeAutor}>{AUTOR.nome}</Text>

                  {AUTOR.funcao ? (
                    <Text style={styles.funcaoAutor}>{AUTOR.funcao}</Text>
                  ) : null}
                </View>
              </View>

              {AUTOR.bio ? (
                <Text style={styles.bioAutor}>{AUTOR.bio}</Text>
              ) : null}

              {LINKS_AUTOR.length > 0 && (
                <View style={styles.linksAutor}>
                  {LINKS_AUTOR.map((link) => (
                    <TouchableOpacity
                      key={link.rotulo}
                      style={styles.linkAutor}
                      onPress={() => abrirLink(link.url)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={link.icone}
                        size={16}
                        color={cores.acento}
                      />

                      <Text style={styles.textoLinkAutor}>
                        {link.rotulo}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : null}

        <Text style={styles.secao}>PERGUNTAS FREQUENTES</Text>

        <View style={styles.cartao}>
          {PERGUNTAS.map((item, indice) => (
            <Pergunta
              key={item.pergunta}
              {...item}
              ultima={indice === PERGUNTAS.length - 1}
            />
          ))}
        </View>

        {EMAIL_SUPORTE ? (
          <>
            <Text style={styles.secao}>AJUDA</Text>

            <View style={styles.cartao}>
              <TouchableOpacity
                style={styles.linhaAjuda}
                onPress={falarComSuporte}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={cores.acento}
                />

                <View style={styles.textosAjuda}>
                  <Text style={styles.textoAjuda}>Falar com o suporte</Text>
                  <Text style={styles.descricaoAjuda}>{EMAIL_SUPORTE}</Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={cores.texto8}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        <Text style={styles.rodape}>
          GymLife • Feito por Nicolas Luz Lains
        </Text>
      </ScrollView>
    </View>
  );
}

const criarEstilos = (cores, espacoTopo) => StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundoProfundo },

  conteudo: { padding: 22, paddingTop: espacoTopo, paddingBottom: 45 },

  voltar: { alignSelf: 'flex-start', marginBottom: 20 },
  textoVoltar: { color: cores.texto3, fontSize: 16 },

  marca: { alignItems: 'center', marginBottom: 18 },

  icone: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: cores.acentoFundo,
    alignItems: 'center',
    justifyContent: 'center',
  },

  nomeApp: {
    color: cores.textoPerfil,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },

  versao: { color: cores.textoSuave, fontSize: 12, marginTop: 4 },

  descricao: {
    color: cores.texto3,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 28,
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

  bordaPergunta: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.bordaPerfil,
  },

  cabecaPergunta: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },

  textoPergunta: {
    flex: 1,
    color: cores.textoPerfil,
    fontSize: 13,
    fontWeight: '600',
  },

  resposta: {
    color: cores.textoSuave,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },

  linhaAjuda: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },

  textosAjuda: { flex: 1 },

  textoAjuda: { color: cores.textoPerfil, fontSize: 14 },

  descricaoAjuda: { color: cores.textoSuave, fontSize: 11, marginTop: 2 },

  cartaoAutor: {
    backgroundColor: cores.cartaoPerfil,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },

  topoAutor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  avatarAutor: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: cores.acentoFundo,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iniciaisAutor: {
    color: cores.acento,
    fontSize: 18,
    fontWeight: 'bold',
  },

  fotoAutor: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },

  textosAutor: { flex: 1 },

  nomeAutor: {
    color: cores.textoPerfil,
    fontSize: 16,
    fontWeight: 'bold',
  },

  funcaoAutor: {
    color: cores.textoSuave,
    fontSize: 12,
    marginTop: 2,
  },

  bioAutor: {
    color: cores.texto3,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
  },

  linksAutor: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },

  linkAutor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: cores.bordaPerfil,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  textoLinkAutor: {
    color: cores.textoPerfil,
    fontSize: 12,
    fontWeight: '600',
  },

  rodape: {
    color: cores.texto9,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 6,
  },
});


import { useCallback, useState, useMemo } from 'react';

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../lib/firebase';
import { useTema } from '../theme/TemaContext';
import { useTopo } from '../theme/layout';

// ========================================
// CONFIGURAÇÃO DAS CONQUISTAS
// ========================================

const CONQUISTAS = [
  {
    id: 'primeiro_treino',
    nome: 'Primeiro passo',
    descricao: 'Complete seu primeiro treino.',
    requisito: 1,
    bonus: 50,
    emoji: '🥉',
    raridade: 'BRONZE',
    cor: '#CD9B63',
  },
  {
    id: 'constancia_10',
    nome: 'Constância',
    descricao: 'Complete 10 treinos.',
    requisito: 10,
    bonus: 100,
    emoji: '🥈',
    raridade: 'PRATA',
    cor: '#C0C0C0',
  },
  {
    id: 'atleta_30',
    nome: 'Atleta dedicado',
    descricao: 'Complete 30 treinos.',
    requisito: 30,
    bonus: 200,
    emoji: '🥇',
    raridade: 'OURO',
    cor: '#F5C542',
  },
];

// ========================================
// TELA DE CONQUISTAS
// ========================================

export default function Conquistas({ navigation }) {
  const { cores } = useTema();
  const espacoTopo = useTopo();
  const styles = useMemo(
    () => criarEstilos(cores, espacoTopo),
    [cores, espacoTopo]
  );

  const { width } = useWindowDimensions();

  const [dados, setDados] = useState({
    xpTotal: 0,
    treinosConcluidos: 0,
    conquistas: [],
  });

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  // ======================================
  // CARREGAR DADOS DO FIREBASE
  // ======================================

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregarConquistas() {
        setCarregando(true);
        setErro(false);

        try {
          const usuario = auth.currentUser;

          if (!usuario) {
            if (ativo) setErro(true);
            return;
          }

          const referencia = doc(
            db,
            'usuarios',
            usuario.uid,
            'gamificacao',
            'perfil'
          );

          const resultado = await getDoc(referencia);

          if (ativo) {
            if (resultado.exists()) {
              const perfil = resultado.data();

              setDados({
                xpTotal: perfil.xpTotal ?? 0,
                treinosConcluidos: perfil.treinosConcluidos ?? 0,
                conquistas: Array.isArray(perfil.conquistas)
                  ? perfil.conquistas
                  : [],
              });
            } else {
              setDados({
                xpTotal: 0,
                treinosConcluidos: 0,
                conquistas: [],
              });
            }
          }
        } catch (e) {
          console.log('Erro ao carregar conquistas:', e);

          if (ativo) setErro(true);
        } finally {
          if (ativo) setCarregando(false);
        }
      }

      carregarConquistas();

      return () => {
        ativo = false;
      };
    }, [])
  );

  // ======================================
  // CÁLCULOS DE XP E NÍVEL
  // ======================================

  const nivel = Math.floor(dados.xpTotal / 200) + 1;

  const xpAtual = dados.xpTotal % 200;

  const progressoXP = (xpAtual / 200) * 100;

  const totalDesbloqueadas = CONQUISTAS.filter((item) =>
    dados.conquistas.includes(item.id)
  ).length;

  // ======================================
  // INTERFACE
  // ======================================

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollConteudo}
      >
        <View
          style={[
            styles.conteudo,
            {
              paddingHorizontal: width < 380 ? 16 : 22,
            },
          ]}
        >
          {/* VOLTAR */}

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.botaoVoltar}
            activeOpacity={0.8}
          >
            <Text style={styles.voltar}>‹</Text>

            <Text style={styles.textoVoltar}>
              Voltar ao perfil
            </Text>
          </TouchableOpacity>

          {/* CABEÇALHO */}

          <View style={styles.cabecalho}>
            <Text style={styles.etiqueta}>
              GYMLIFE • EVOLUÇÃO
            </Text>

            <Text style={styles.titulo}>
              Suas conquistas
            </Text>

            <Text style={styles.subtitulo}>
              Cada treino conta. Continue superando seus limites.
            </Text>
          </View>

          {/* CARREGAMENTO */}

          {carregando ? (
            <ActivityIndicator
              size="large"
              color={cores.acento}
              style={styles.carregando}
            />
          ) : erro ? (

            // ERRO AO CARREGAR

            <View style={styles.cardErro}>
              <Text style={styles.emojiErro}>⚠️</Text>

              <Text style={styles.tituloErro}>
                Não foi possível carregar
              </Text>

              <Text style={styles.textoErro}>
                Verifique sua conexão e tente novamente.
              </Text>

              <TouchableOpacity
                style={styles.botaoRecarregar}
                onPress={() => navigation.replace('Conquistas')}
              >
                <Text style={styles.textoBotao}>
                  TENTAR NOVAMENTE
                </Text>
              </TouchableOpacity>
            </View>

          ) : (
            <>

              {/* PAINEL DE NÍVEL */}

              <View style={styles.cardNivel}>
                <View style={styles.linhaNivel}>
                  <View style={styles.infoNivel}>
                    <Text style={styles.rotulo}>
                      SEU NÍVEL ATUAL
                    </Text>

                    <Text style={styles.nivel}>
                      Nível {nivel}
                    </Text>

                    <Text style={styles.textoNivel}>
                      Sua evolução continua!
                    </Text>
                  </View>

                  <View style={styles.iconeNivel}>
                    <Text style={styles.emojiNivel}>🏆</Text>
                  </View>
                </View>

                <View style={styles.linhaXP}>
                  <Text style={styles.rotuloXP}>
                    PROGRESSO DO NÍVEL
                  </Text>

                  <Text style={styles.valorXP}>
                    {xpAtual}/200 XP
                  </Text>
                </View>

                <View style={styles.trilho}>
                  <View
                    style={[
                      styles.progressoXP,
                      { width: `${progressoXP}%` },
                    ]}
                  />
                </View>

                <Text style={styles.legendaXP}>
                  Faltam {200 - xpAtual} XP para alcançar o nível {nivel + 1}
                </Text>

                <View style={styles.divisor} />

                <View style={styles.linhaTotalXP}>
                  <View>
                    <Text style={styles.rotulo}>
                      XP ACUMULADO
                    </Text>

                    <Text style={styles.totalXP}>
                      {dados.xpTotal} XP
                    </Text>
                  </View>

                  <View style={styles.alinhamentoDireita}>
                    <Text style={styles.rotulo}>
                      TREINOS
                    </Text>

                    <Text style={styles.totalXP}>
                      {dados.treinosConcluidos}
                    </Text>
                  </View>
                </View>
              </View>

                <TouchableOpacity
                  style={styles.botaoNiveis}
                  onPress={() => navigation.navigate('Niveis')}
                  activeOpacity={0.8}
                  >
                  <View style={styles.infoBotaoNiveis}>
                    <Text style={styles.iconeBotaoNiveis}>🏆</Text>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.tituloBotaoNiveis}>
                        Conhecer todos os níveis
                      </Text>

                      <Text style={styles.subtituloBotaoNiveis}>
                        Veja sua próxima classificação
                      </Text>
                    </View>

                    <Text style={styles.setaBotaoNiveis}>›</Text>
                  </View>
                </TouchableOpacity>

              {/* RESUMO DAS MEDALHAS */}

              <View style={styles.resumoMedalhas}>
                <View style={styles.iconeResumo}>
                  <Text style={styles.emojiResumo}>🏅</Text>
                </View>

                <View style={styles.infoResumo}>
                  <Text style={styles.tituloResumo}>
                    Coleção de medalhas
                  </Text>

                  <Text style={styles.textoResumo}>
                    {totalDesbloqueadas} de {CONQUISTAS.length} conquistas desbloqueadas
                  </Text>
                </View>

                <Text style={styles.contadorResumo}>
                  {totalDesbloqueadas}/{CONQUISTAS.length}
                </Text>
              </View>

              {/* TÍTULO DA SEÇÃO */}

              <View style={styles.cabecalhoSecao}>
                <Text style={styles.tituloSecao}>
                  Suas medalhas
                </Text>

                <Text style={styles.subtituloSecao}>
                  Continue treinando para conquistar todas.
                </Text>
              </View>

              {/* LISTA DE CONQUISTAS */}

              {CONQUISTAS.map((conquista) => {
                const desbloqueada = dados.conquistas.includes(
                  conquista.id
                );

                const progresso = Math.min(
                  dados.treinosConcluidos / conquista.requisito,
                  1
                );

                const atual = Math.min(
                  dados.treinosConcluidos,
                  conquista.requisito
                );

                return (
                  <View
                    key={conquista.id}
                    style={[
                      styles.cardMedalha,
                      desbloqueada && styles.cardDesbloqueada,
                    ]}
                  >
                    <View
                      style={[
                        styles.iconeMedalha,
                        {
                          borderColor: desbloqueada
                            ? conquista.cor
                            : cores.borda,
                        },
                        !desbloqueada && styles.iconeBloqueado,
                      ]}
                    >
                      <Text style={styles.emojiMedalha}>
                        {desbloqueada ? conquista.emoji : '🔒'}
                      </Text>
                    </View>

                    <View style={styles.infoMedalha}>
                      <View style={styles.linhaRaridade}>
                        <Text
                          style={[
                            styles.raridade,
                            { color: conquista.cor },
                          ]}
                        >
                          {conquista.raridade}
                        </Text>

                        {desbloqueada && (
                          <Text style={styles.seloDesbloqueada}>
                            ✓ CONQUISTADA
                          </Text>
                        )}
                      </View>

                      <Text style={styles.nomeMedalha}>
                        {conquista.nome}
                      </Text>

                      <Text style={styles.descricaoMedalha}>
                        {conquista.descricao}
                      </Text>

                      <Text style={styles.bonus}>
                        +{conquista.bonus} XP de bônus
                      </Text>

                      {!desbloqueada ? (
                        <>
                          <View style={styles.trilhoMedalha}>
                            <View
                              style={[
                                styles.progressoMedalha,
                                {
                                  width: `${progresso * 100}%`,
                                  backgroundColor: conquista.cor,
                                },
                              ]}
                            />
                          </View>

                          <Text style={styles.textoProgresso}>
                            {atual}/{conquista.requisito} treinos concluídos
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.textoConquistada}>
                          Medalha desbloqueada!
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}

              {/* MENSAGEM FINAL */}

              <View style={styles.mensagemFinal}>
                <Text style={styles.emojiFinal}>🔥</Text>

                <Text style={styles.textoFinal}>
                  O próximo nível depende da sua dedicação.
                </Text>

                <Text style={styles.textoFinalPequeno}>
                  Não pare agora. Sua evolução está apenas começando!
                </Text>
              </View>

            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ========================================
// ESTILIZAÇÃO
// ========================================

const criarEstilos = (cores, espacoTopo) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
  },

  scrollConteudo: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: espacoTopo,
    paddingBottom: 30,
  },

  conteudo: {
    width: '100%',
    maxWidth: 620,
    paddingBottom: 20,
  },

  botaoVoltar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    alignSelf: 'flex-start',
  },

  voltar: {
    color: cores.acento,
    fontSize: 30,
    marginRight: 8,
    marginTop: -3,
  },

  textoVoltar: {
    color: cores.textoSuave,
    fontSize: 14,
    fontWeight: '600',
  },

  cabecalho: {
    marginBottom: 25,
  },

  etiqueta: {
    color: cores.acento,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 9,
  },

  titulo: {
    color: cores.texto,
    fontSize: 29,
    fontWeight: 'bold',
  },

  subtitulo: {
    color: cores.textoSuave,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },

  carregando: {
    marginTop: 50,
  },

  // PAINEL DE NÍVEL

  cardNivel: {
    backgroundColor: cores.cardAzul2,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: cores.bordaAzul2,
    marginBottom: 18,
  },

  linhaNivel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  infoNivel: {
    flex: 1,
  },

  rotulo: {
    color: cores.texto10,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },

  nivel: {
    color: cores.texto,
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 5,
  },

  textoNivel: {
    color: cores.textoSuave,
    fontSize: 12,
    marginTop: 3,
  },

  iconeNivel: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: cores.iconeAzulFundo,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  emojiNivel: {
    fontSize: 32,
  },

  linhaXP: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 25,
  },

  rotuloXP: {
    color: cores.textoSuave,
    fontSize: 10,
    fontWeight: 'bold',
  },

  valorXP: {
    color: cores.acento,
    fontSize: 12,
    fontWeight: 'bold',
  },

  trilho: {
    height: 9,
    backgroundColor: cores.trilhoAzul,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
  },

  progressoXP: {
    height: '100%',
    backgroundColor: '#1685E5',
    borderRadius: 10,
  },

  legendaXP: {
    color: cores.textoSuave,
    fontSize: 11,
    marginTop: 8,
  },

  divisor: {
    height: 1,
    backgroundColor: cores.trilhoAzul,
    marginVertical: 18,
  },

  linhaTotalXP: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  totalXP: {
    color: cores.texto,
    fontSize: 19,
    fontWeight: 'bold',
    marginTop: 5,
  },

  alinhamentoDireita: {
    alignItems: 'flex-end',
  },

  // RESUMO DE MEDALHAS

  resumoMedalhas: {
    backgroundColor: cores.cartao,
    borderRadius: 17,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },

  iconeResumo: {
    width: 47,
    height: 47,
    borderRadius: 14,
    backgroundColor: cores.trilho2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emojiResumo: {
    fontSize: 25,
  },

  infoResumo: {
    flex: 1,
    marginLeft: 12,
  },

  tituloResumo: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: 'bold',
  },

  textoResumo: {
    color: cores.textoSuave,
    fontSize: 11,
    marginTop: 4,
  },

  contadorResumo: {
    color: cores.acento,
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 5,
  },

  // SEÇÃO DE MEDALHAS

  cabecalhoSecao: {
    marginBottom: 15,
  },

  tituloSecao: {
    color: cores.texto,
    fontSize: 20,
    fontWeight: 'bold',
  },

  subtituloSecao: {
    color: cores.textoSuave,
    fontSize: 12,
    marginTop: 5,
  },

  cardMedalha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: cores.cartao,
    borderRadius: 18,
    padding: 15,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: cores.bordaSuave,
  },

  cardDesbloqueada: {
    borderColor: cores.bordaAzul3,
    backgroundColor: cores.cardAzul3,
  },

  iconeMedalha: {
    width: 55,
    height: 55,
    borderRadius: 16,
    backgroundColor: cores.trilho2,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  iconeBloqueado: {
    opacity: 0.65,
  },

  emojiMedalha: {
    fontSize: 27,
  },

  infoMedalha: {
    flex: 1,
    minWidth: 0,
  },

  linhaRaridade: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 5,
  },

  raridade: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  seloDesbloqueada: {
    color: cores.acento,
    fontSize: 9,
    fontWeight: 'bold',
  },

  nomeMedalha: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },

  descricaoMedalha: {
    color: cores.textoSuave,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  bonus: {
    color: cores.acento,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
  },

  trilhoMedalha: {
    height: 6,
    backgroundColor: cores.trilho3,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 11,
  },

  progressoMedalha: {
    height: '100%',
    borderRadius: 8,
  },

  textoProgresso: {
    color: cores.textoSuave,
    fontSize: 10,
    marginTop: 6,
  },

  textoConquistada: {
    color: cores.acento,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },

  // ERRO

  cardErro: {
    backgroundColor: cores.cartao,
    padding: 22,
    borderRadius: 18,
    alignItems: 'center',
  },

  emojiErro: {
    fontSize: 35,
    marginBottom: 12,
  },

  tituloErro: {
    color: cores.texto,
    fontSize: 17,
    fontWeight: 'bold',
  },

  textoErro: {
    color: cores.textoSuave,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },

  botaoRecarregar: {
    backgroundColor: '#0758A4',
    borderRadius: 11,
    padding: 14,
    alignItems: 'center',
    width: '100%',
    marginTop: 18,
  },

  textoBotao: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // MENSAGEM FINAL

  mensagemFinal: {
    alignItems: 'center',
    backgroundColor: cores.cartaoAlt2,
    borderRadius: 18,
    padding: 20,
    marginTop: 13,
  },

  emojiFinal: {
    fontSize: 30,
    marginBottom: 8,
  },

  textoFinal: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  textoFinalPequeno: {
    color: cores.textoSuave,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 7,
    lineHeight: 17,
  },

  botaoNiveis: {
  backgroundColor: cores.cartao,
  borderWidth: 1,
  borderColor: '#3976B8',
  borderRadius: 13,
  padding: 15,
  marginBottom: 22,
},

infoBotaoNiveis: {
  flexDirection: 'row',
  alignItems: 'center',
},

iconeBotaoNiveis: {
  fontSize: 25,
  marginRight: 13,
},

tituloBotaoNiveis: {
  color: cores.texto,
  fontSize: 14,
  fontWeight: 'bold',
},

subtituloBotaoNiveis: {
  color: cores.textoSuave,
  fontSize: 11,
  marginTop: 4,
},

setaBotaoNiveis: {
  color: cores.acento,
  fontSize: 27,
  marginLeft: 10,
},
});

import React, { useCallback, useState, useMemo } from 'react';

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

import { auth, db } from '../lib/firebase';
import { useTema } from '../theme/TemaContext';
import { useTopo } from '../theme/layout';

// Segunda-feira, 02/11/2026: início da primeira semana do ciclo.
// As missões mudam automaticamente a cada segunda-feira.
const SEMANA_BASE = new Date(2026, 10, 2);

const XP_POR_NIVEL = 200;

function paraISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

function obterInicioSemana(data = new Date()) {
  const inicio = new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate()
  );

  const diasDesdeSegunda = (inicio.getDay() + 6) % 7;

  inicio.setDate(inicio.getDate() - diasDesdeSegunda);

  return inicio;
}

function obterDadosSemana() {
  const inicio = obterInicioSemana();
  const fim = new Date(inicio);

  fim.setDate(fim.getDate() + 6);

  const diferenca = Math.floor(
    (inicio.getTime() - SEMANA_BASE.getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );

  const numeroSemana = diferenca + 1;
  const rodada = ((diferenca % 4) + 4) % 4;

  return {
    inicio,
    fim,
    semanaId: paraISO(inicio),
    numeroSemana,
    rodada,
  };
}

// Quatro conjuntos de missões.
// Cada conjunto tem exatamente quatro missões.
const MISSOES_SEMANAIS = [
  [
    {
      id: 'treinos_2',
      titulo: 'Ritmo de treino',
      descricao: 'Finalize 2 treinos em dias diferentes.',
      icone: '🏋️',
      tipo: 'treinos',
      meta: 2,
      xp: 100,
    },
    {
      id: 'cargas_3',
      titulo: 'Anotador de cargas',
      descricao: 'Registre a carga de 3 exercícios diferentes.',
      icone: '⚖️',
      tipo: 'exercicios',
      meta: 3,
      xp: 75,
    },
    {
      id: 'medida_1',
      titulo: 'Acompanhe sua evolução',
      descricao: 'Registre pelo menos uma medida corporal.',
      icone: '📏',
      tipo: 'medidas',
      meta: 1,
      xp: 50,
    },
    {
      id: 'series_30',
      titulo: 'Série após série',
      descricao: 'Conclua 30 séries de exercícios.',
      icone: '🔥',
      tipo: 'series',
      meta: 30,
      xp: 100,
    },
  ],

  [
    {
      id: 'treinos_3',
      titulo: 'Semana consistente',
      descricao: 'Finalize 3 treinos em dias diferentes.',
      icone: '💪',
      tipo: 'treinos',
      meta: 3,
      xp: 125,
    },
    {
      id: 'grupos_2',
      titulo: 'Treino completo',
      descricao: 'Finalize treinos de 2 grupos diferentes.',
      icone: '🎯',
      tipo: 'letras',
      meta: 2,
      xp: 75,
    },
    {
      id: 'cargas_2_dias',
      titulo: 'Controle de desempenho',
      descricao: 'Registre cargas em 2 dias diferentes.',
      icone: '📈',
      tipo: 'diasCarga',
      meta: 2,
      xp: 75,
    },
    {
      id: 'medida_2',
      titulo: 'Olho na evolução',
      descricao: 'Faça pelo menos um registro de medidas nesta semana.',
      icone: '📐',
      tipo: 'medidas',
      meta: 1,
      xp: 50,
    },
  ],

  [
    {
      id: 'treinos_3_b',
      titulo: 'Disciplina em ação',
      descricao: 'Finalize 3 treinos em dias diferentes.',
      icone: '🏆',
      tipo: 'treinos',
      meta: 3,
      xp: 125,
    },
    {
      id: 'cargas_5',
      titulo: 'Evolução de cargas',
      descricao: 'Registre a carga de 5 exercícios diferentes.',
      icone: '🏋️',
      tipo: 'exercicios',
      meta: 5,
      xp: 100,
    },
    {
      id: 'medida_completa',
      titulo: 'Perfil em evolução',
      descricao: 'Faça um registro com pelo menos 3 medidas.',
      icone: '📏',
      tipo: 'medidasCompletas',
      meta: 1,
      xp: 100,
    },
    {
      id: 'series_45',
      titulo: 'Volume de treino',
      descricao: 'Conclua 45 séries de exercícios.',
      icone: '🔥',
      tipo: 'series',
      meta: 45,
      xp: 125,
    },
  ],

  [
    {
      id: 'treinos_2_c',
      titulo: 'Não perca o ritmo',
      descricao: 'Finalize 2 treinos em dias diferentes.',
      icone: '⚡',
      tipo: 'treinos',
      meta: 2,
      xp: 100,
    },
    {
      id: 'grupos_3',
      titulo: 'Versatilidade',
      descricao: 'Finalize treinos de 3 grupos diferentes.',
      icone: '🎯',
      tipo: 'letras',
      meta: 3,
      xp: 100,
    },
    {
      id: 'cargas_3_dias',
      titulo: 'Registro constante',
      descricao: 'Registre cargas em 3 dias diferentes.',
      icone: '📊',
      tipo: 'diasCarga',
      meta: 3,
      xp: 100,
    },
    {
      id: 'medidas_2_registros',
      titulo: 'Acompanhamento corporal',
      descricao: 'Faça 2 registros de medidas nesta semana.',
      icone: '📐',
      tipo: 'medidas',
      meta: 2,
      xp: 75,
    },
  ],
];

function formatarPeriodo(inicio, fim) {
  const diaInicio = inicio.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });

  const diaFim = fim.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });

  return `${diaInicio} até ${diaFim}`;
}

function contarMedidasValidas(registro) {
  const camposPossiveis = [
    'peso',
    'cintura',
    'cinturaCm',
    'peito',
    'peitoCm',
    'braco',
    'bracoCm',
    'quadril',
    'quadrilCm',
    'coxa',
    'coxaCm',
  ];

  return camposPossiveis.filter((campo) => {
    const valor = registro[campo];

    return (
      valor !== null &&
      valor !== undefined &&
      valor !== '' &&
      Number(valor) > 0
    );
  }).length;
}

function calcularMetricas(treinos, medidas, inicioISO, fimISO) {
  const treinosSemana = treinos.filter(
    (registro) =>
      registro.data >= inicioISO &&
      registro.data <= fimISO
  );

  const medidasSemana = medidas.filter(
    (registro) =>
      registro.data >= inicioISO &&
      registro.data <= fimISO
  );

  const treinosFinalizados = treinosSemana.filter(
    (registro) => registro.finalizado === true
  );

  const diasTreinados = new Set(
    treinosFinalizados.map((registro) => registro.data)
  );

  const gruposTreinados = new Set(
    treinosFinalizados
      .map((registro) => registro.treino)
      .filter(Boolean)
  );

  const exerciciosComCarga = new Set();
  const diasComCarga = new Set();

  treinosSemana.forEach((registro) => {
    let encontrouCarga = false;

    Object.entries(registro.cargas || {}).forEach(
      ([idExercicio, valor]) => {
        const carga = Number(
          String(valor).replace(',', '.')
        );

        if (Number.isFinite(carga) && carga > 0) {
          exerciciosComCarga.add(idExercicio);
          encontrouCarga = true;
        }
      }
    );

    if (encontrouCarga && registro.data) {
      diasComCarga.add(registro.data);
    }
  });

  const seriesConcluidas = treinosSemana.reduce(
    (total, registro) => {
      const series = Object.values(registro.series || {});

      return (
        total +
        series.filter((concluida) => concluida === true).length
      );
    },
    0
  );

  const medidasCompletas = medidasSemana.filter(
    (registro) => contarMedidasValidas(registro) >= 3
  ).length;

  return {
    treinos: diasTreinados.size,
    exercicios: exerciciosComCarga.size,
    medidas: medidasSemana.length,
    series: seriesConcluidas,
    letras: gruposTreinados.size,
    diasCarga: diasComCarga.size,
    medidasCompletas,
  };
}

function progressoDaMissao(missao, metricas) {
  return Number(metricas[missao.tipo]) || 0;
}

export default function Desafios({ navigation }) {
  const { cores } = useTema();
  const espacoTopo = useTopo();
  const styles = useMemo(
    () => criarEstilos(cores, espacoTopo),
    [cores, espacoTopo]
  );

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const [xpTotal, setXpTotal] = useState(0);
  const [missoes, setMissoes] = useState([]);
  const [resgatados, setResgatados] = useState([]);

  const [resgatandoId, setResgatandoId] = useState(null);

  const semana = obterDadosSemana();

  const inicioISO = paraISO(semana.inicio);
  const fimISO = paraISO(semana.fim);

  const listaMissoes = MISSOES_SEMANAIS[semana.rodada];

  const carregar = useCallback(async () => {
    const uid = auth.currentUser?.uid;

    if (!uid) {
      setErro(true);
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      setErro(false);

      const treinosConsulta = query(
        collection(db, 'usuarios', uid, 'treinos'),
        orderBy('data', 'desc'),
        limit(120)
      );

      const medidasConsulta = query(
        collection(db, 'usuarios', uid, 'medidas'),
        orderBy('data', 'desc'),
        limit(100)
      );

      const perfilRef = doc(
        db,
        'usuarios',
        uid,
        'gamificacao',
        'perfil'
      );

      const semanaRef = doc(
        db,
        'usuarios',
        uid,
        'gamificacao',
        `desafios_${semana.semanaId}`
      );

      const [
        treinosSnapshot,
        medidasSnapshot,
        perfilSnapshot,
        semanaSnapshot,
      ] = await Promise.all([
        getDocs(treinosConsulta),
        getDocs(medidasConsulta),
        getDoc(perfilRef),
        getDoc(semanaRef),
      ]);

      const treinos = treinosSnapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      const medidas = medidasSnapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      const metricas = calcularMetricas(
        treinos,
        medidas,
        inicioISO,
        fimISO
      );

      const perfil = perfilSnapshot.exists()
        ? perfilSnapshot.data()
        : {};

      const dadosSemana = semanaSnapshot.exists()
        ? semanaSnapshot.data()
        : {};

      setXpTotal(Number(perfil.xpTotal) || 0);

      setResgatados(
        Array.isArray(dadosSemana.resgatados)
          ? dadosSemana.resgatados
          : []
      );

      setMissoes(
        listaMissoes.map((missao) => {
          const progresso = progressoDaMissao(
            missao,
            metricas
          );

          return {
            ...missao,
            progresso: Math.min(progresso, missao.meta),
            concluida: progresso >= missao.meta,
          };
        })
      );
    } catch (e) {
      console.log('Erro ao carregar desafios:', e);
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, [inicioISO, fimISO, semana.semanaId, listaMissoes]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  async function resgatarRecompensa(missao) {
    const uid = auth.currentUser?.uid;

    if (!uid || !missao.concluida) return;

    if (resgatados.includes(missao.id)) return;

    try {
      setResgatandoId(missao.id);

      const perfilRef = doc(
        db,
        'usuarios',
        uid,
        'gamificacao',
        'perfil'
      );

      const semanaRef = doc(
        db,
        'usuarios',
        uid,
        'gamificacao',
        `desafios_${semana.semanaId}`
      );

      const resultado = await runTransaction(
        db,
        async (transacao) => {
          const perfilSnapshot = await transacao.get(perfilRef);
          const semanaSnapshot = await transacao.get(semanaRef);

          const dadosPerfil = perfilSnapshot.exists()
            ? perfilSnapshot.data()
            : {};

          const dadosSemana = semanaSnapshot.exists()
            ? semanaSnapshot.data()
            : {};

          const listaResgatados = Array.isArray(
            dadosSemana.resgatados
          )
            ? dadosSemana.resgatados
            : [];

          if (listaResgatados.includes(missao.id)) {
            return {
              sucesso: false,
              motivo: 'ja_resgatado',
            };
          }

          const xpAtual = Number(dadosPerfil.xpTotal) || 0;

          transacao.set(
            perfilRef,
            {
              xpTotal: xpAtual + missao.xp,
              atualizadoEm: serverTimestamp(),
            },
            { merge: true }
          );

          transacao.set(
            semanaRef,
            {
              semana: semana.semanaId,
              resgatados: [
                ...listaResgatados,
                missao.id,
              ],
              atualizadoEm: serverTimestamp(),
            },
            { merge: true }
          );

          return {
            sucesso: true,
            xpGanho: missao.xp,
          };
        }
      );

      if (resultado.sucesso) {
        await carregar();
      } else {
        await carregar();
      }
    } catch (e) {
      console.log('Erro ao resgatar recompensa:', e);
    } finally {
      setResgatandoId(null);
    }
  }

  const totalResgatadas = missoes.filter(
    (missao) => resgatados.includes(missao.id)
  ).length;

  const totalXPDisponivel = missoes
    .filter(
      (missao) =>
        missao.concluida &&
        !resgatados.includes(missao.id)
    )
    .reduce((total, missao) => total + missao.xp, 0);

  const totalXPRecebido = missoes
    .filter((missao) => resgatados.includes(missao.id))
    .reduce((total, missao) => total + missao.xp, 0);

  const nivel = Math.floor(xpTotal / XP_POR_NIVEL) + 1;
  const xpAtual = xpTotal % XP_POR_NIVEL;
  const progressoXP = (xpAtual / XP_POR_NIVEL) * 100;

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

        <Text style={styles.etiqueta}>GYMLIFE • MISSÕES</Text>

        <Text style={styles.titulo}>Desafios semanais</Text>

        <Text style={styles.subtitulo}>
          Complete missões, resgate XP e continue evoluindo.
        </Text>

        <View style={styles.cardSemana}>
          <View style={styles.linhaSemana}>
            <View>
              <Text style={styles.rotuloCard}>RODADA DE DESAFIOS</Text>
              <Text style={styles.numeroSemana}>
                Semana {semana.rodada + 1} de 4
              </Text>
            </View>

            <Text style={styles.iconeSemana}>🎯</Text>
          </View>

          <Text style={styles.periodo}>
            {formatarPeriodo(semana.inicio, semana.fim)}
          </Text>

          <Text style={styles.dicaSemana}>
            As quatro missões mudam automaticamente toda segunda-feira.
          </Text>
        </View>

        <View style={styles.cardXP}>
          <View style={styles.linhaXP}>
            <View>
              <Text style={styles.rotuloCard}>SEU NÍVEL</Text>
              <Text style={styles.valorNivel}>Nível {nivel}</Text>
            </View>

            <View style={styles.alinharDireita}>
              <Text style={styles.rotuloCard}>XP ACUMULADO</Text>
              <Text style={styles.valorXP}>{xpTotal} XP</Text>
            </View>
          </View>

          <View style={styles.trilho}>
            <View
              style={[
                styles.barraXP,
                { width: `${progressoXP}%` },
              ]}
            />
          </View>

          <Text style={styles.textoProgresso}>
            {xpAtual} de {XP_POR_NIVEL} XP para o próximo nível
          </Text>
        </View>

        {carregando ? (
          <ActivityIndicator
            size="large"
            color={cores.acento}
            style={styles.carregando}
          />
        ) : erro ? (
          <View style={styles.card}>
            <Text style={styles.textoAviso}>
              Não foi possível carregar os desafios.
            </Text>

            <TouchableOpacity
              style={styles.botaoPrincipal}
              onPress={carregar}
            >
              <Text style={styles.textoBotaoPrincipal}>
                TENTAR NOVAMENTE
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.resumo}>
              <View>
                <Text style={styles.resumoRotulo}>
                  MISSÕES RESGATADAS
                </Text>
                <Text style={styles.resumoValor}>
                  {totalResgatadas}/4
                </Text>
              </View>

              <View style={styles.alinharDireita}>
                <Text style={styles.resumoRotulo}>
                  XP DISPONÍVEL
                </Text>
                <Text style={styles.resumoXP}>
                  {totalXPDisponivel} XP
                </Text>
              </View>
            </View>

            {missoes.map((missao, indice) => {
              const resgatada = resgatados.includes(missao.id);
              const progresso = Math.round(
                (missao.progresso / missao.meta) * 100
              );

              const carregandoResgate =
                resgatandoId === missao.id;

              return (
                <View
                  key={missao.id}
                  style={[
                    styles.cardMissao,
                    missao.concluida && styles.cardMissaoConcluida,
                  ]}
                >
                  <View style={styles.topoMissao}>
                    <View style={styles.iconeMissao}>
                      <Text style={styles.emojiMissao}>
                        {missao.icone}
                      </Text>
                    </View>

                    <View style={styles.infoMissao}>
                      <Text style={styles.numeroMissao}>
                        MISSÃO {String(indice + 1).padStart(2, '0')}
                      </Text>

                      <Text style={styles.nomeMissao}>
                        {missao.titulo}
                      </Text>

                      <Text style={styles.descricaoMissao}>
                        {missao.descricao}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.linhaProgresso}>
                    <Text style={styles.textoPequeno}>
                      Progresso
                    </Text>

                    <Text style={styles.textoContador}>
                      {missao.progresso}/{missao.meta}
                    </Text>
                  </View>

                  <View style={styles.trilho}>
                    <View
                      style={[
                        styles.barraMissao,
                        { width: `${progresso}%` },
                      ]}
                    />
                  </View>

                  <View style={styles.rodapeMissao}>
                    <Text style={styles.recompensa}>
                      🎁 +{missao.xp} XP
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.botaoResgatar,
                        !missao.concluida &&
                          styles.botaoDesativado,
                        resgatada && styles.botaoResgatado,
                      ]}
                      disabled={
                        !missao.concluida ||
                        resgatada ||
                        !!resgatandoId
                      }
                      onPress={() =>
                        resgatarRecompensa(missao)
                      }
                      activeOpacity={0.8}
                    >
                      {carregandoResgate ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text
                          style={[
                            styles.textoResgatar,
                            resgatada && styles.textoResgatado,
                          ]}
                        >
                          {resgatada
                            ? '✓ RESGATADO'
                            : missao.concluida
                              ? 'RESGATAR'
                              : 'EM ANDAMENTO'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <View style={styles.cardFinal}>
              <Text style={styles.emojiFinal}>🏅</Text>

              <Text style={styles.tituloFinal}>
                Continue nessa pegada!
              </Text>

              <Text style={styles.textoFinal}>
                Você já resgatou {totalXPRecebido} XP em recompensas
                semanais. Complete as outras missões para ganhar ainda mais.
              </Text>
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.botaoNiveis}
          onPress={() => navigation.navigate('Niveis')}
        >
          <Text style={styles.textoBotaoNiveis}>
            CONHECER TODOS OS NÍVEIS
          </Text>
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

  conteudo: {
    padding: 22,
    paddingTop: espacoTopo,
    paddingBottom: 45,
  },

  voltar: {
    alignSelf: 'flex-start',
    marginBottom: 25,
  },

  textoVoltar: {
    color: cores.texto3,
    fontSize: 16,
  },

  etiqueta: {
    color: cores.acento,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 9,
  },

  titulo: {
    color: cores.texto,
    fontSize: 29,
    fontWeight: 'bold',
  },

  subtitulo: {
    color: cores.textoSuave,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 24,
  },

  cardSemana: {
    backgroundColor: cores.cartao,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 18,
    marginBottom: 14,
  },

  linhaSemana: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  rotuloCard: {
    color: cores.textoSuave,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  numeroSemana: {
    color: cores.texto,
    fontSize: 23,
    fontWeight: 'bold',
    marginTop: 5,
  },

  iconeSemana: {
    fontSize: 31,
  },

  periodo: {
    color: cores.acento,
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 13,
  },

  dicaSemana: {
    color: cores.textoSuave,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },

  cardXP: {
    backgroundColor: cores.cartao,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 18,
    marginBottom: 25,
  },

  linhaXP: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  valorNivel: {
    color: cores.texto,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 5,
  },

  alinharDireita: {
    alignItems: 'flex-end',
  },

  valorXP: {
    color: cores.acento,
    fontWeight: 'bold',
    fontSize: 17,
    marginTop: 5,
  },

  trilho: {
    height: 8,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: cores.borda,
    marginTop: 15,
  },

  barraXP: {
    height: 8,
    borderRadius: 10,
    backgroundColor: cores.acento,
  },

  textoProgresso: {
    color: cores.textoSuave,
    fontSize: 11,
    marginTop: 9,
  },

  resumo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  resumoRotulo: {
    color: cores.textoSuave,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.7,
  },

  resumoValor: {
    color: cores.texto,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
  },

  resumoXP: {
    color: cores.acento,
    fontSize: 19,
    fontWeight: 'bold',
    marginTop: 4,
  },

  carregando: {
    marginTop: 35,
  },

  card: {
    backgroundColor: cores.cartao,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 18,
  },

  textoAviso: {
    color: cores.texto3,
    textAlign: 'center',
    lineHeight: 21,
  },

  cardMissao: {
    backgroundColor: cores.cartao,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 16,
    marginBottom: 13,
  },

  cardMissaoConcluida: {
    borderColor: '#3976B8',
  },

  topoMissao: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconeMissao: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: cores.trilho,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  emojiMissao: {
    fontSize: 23,
  },

  infoMissao: {
    flex: 1,
  },

  numeroMissao: {
    color: cores.acento,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },

  nomeMissao: {
    color: cores.texto,
    fontSize: 15,
    fontWeight: 'bold',
  },

  descricaoMissao: {
    color: cores.textoSuave,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  linhaProgresso: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },

  textoPequeno: {
    color: cores.textoSuave,
    fontSize: 11,
  },

  textoContador: {
    color: cores.texto,
    fontSize: 11,
    fontWeight: 'bold',
  },

  barraMissao: {
    height: 8,
    borderRadius: 10,
    backgroundColor: '#0C75D7',
  },

  rodapeMissao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },

  recompensa: {
    color: cores.acento,
    fontSize: 13,
    fontWeight: 'bold',
  },

  botaoResgatar: {
    backgroundColor: '#0C75D7',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 9,
    minWidth: 112,
    alignItems: 'center',
  },

  botaoDesativado: {
    backgroundColor: '#3A3A3A',
  },

  botaoResgatado: {
    backgroundColor: '#263B2D',
  },

  textoResgatar: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  textoResgatado: {
    color: '#A3C4A5',
  },

  cardFinal: {
    backgroundColor: cores.cardAzulSuave,
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },

  emojiFinal: {
    fontSize: 28,
    marginBottom: 8,
  },

  tituloFinal: {
    color: cores.texto,
    fontSize: 17,
    fontWeight: 'bold',
  },

  textoFinal: {
    color: cores.texto5,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 7,
  },

  botaoPrincipal: {
    backgroundColor: '#0C75D7',
    borderRadius: 10,
    padding: 14,
    marginTop: 15,
    alignItems: 'center',
  },

  textoBotaoPrincipal: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },

  botaoNiveis: {
    borderWidth: 1,
    borderColor: '#3976B8',
    borderRadius: 11,
    padding: 16,
    alignItems: 'center',
    marginTop: 22,
  },

  textoBotaoNiveis: {
    color: cores.acento,
    fontWeight: 'bold',
    fontSize: 12,
  },
});
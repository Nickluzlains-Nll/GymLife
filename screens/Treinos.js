import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  StyleSheet,
  Animated,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';

import { auth, db } from '../lib/firebase';
import usePlano from '../hooks/usePlano';
import { formatarDuracao } from '../utils/duracao';
import TimerDescanso from '../components/TimerDescanso';
import { useTema } from '../theme/TemaContext';
import { useTopo } from '../theme/layout';

function hojeISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');

  return `${d.getFullYear()}-${mes}-${dia}`;
}

function formatarKg(valor) {
  const arredondado = Math.round(valor * 10) / 10;

  return Number.isInteger(arredondado)
    ? String(arredondado)
    : String(arredondado).replace('.', ',');
}

/*
 * Reserva um único treino por dia.
 *
 * O registro diário fica em:
 * usuarios/{uid}/diasTreino/{data}
 *
 * A transação também verifica alguns registros antigos para
 * considerar treinos iniciados ou finalizados antes desta mudança.
 */
async function reservarTreinoDoDia(uid, letra, data) {
  const diaRef = doc(
    db,
    'usuarios',
    uid,
    'diasTreino',
    data
  );

  return runTransaction(db, async (transacao) => {
    const diaSnap = await transacao.get(diaRef);

    // Se já existe uma reserva, somente o mesmo treino pode continuar.
    if (diaSnap.exists()) {
      const treinoRegistrado = diaSnap.data().treino;

      return {
        permitido: treinoRegistrado === letra,
        treino: treinoRegistrado,
      };
    }

    // Compatibilidade com registros criados antes desta atualização.
    const letrasPossiveis = ['A', 'B', 'C'];
    const referencias = [];

    letrasPossiveis.forEach((letraAntiga) => {
      referencias.push({
        letra: letraAntiga,
        tipo: 'recompensa',
        referencia: doc(
          db,
          'usuarios',
          uid,
          'recompensasTreinos',
          `${data}_${letraAntiga}`
        ),
      });

      referencias.push({
        letra: letraAntiga,
        tipo: 'treino',
        referencia: doc(
          db,
          'usuarios',
          uid,
          'treinos',
          `${data}_${letraAntiga}`
        ),
      });
    });

    const documentosAntigos = await Promise.all(
      referencias.map((item) => transacao.get(item.referencia))
    );

    let treinoEncontrado = null;
    let statusEncontrado = 'iniciado';

    // Primeiro verifica recompensas antigas.
    documentosAntigos.forEach((snapshot, indice) => {
      const referencia = referencias[indice];

      if (
        !treinoEncontrado &&
        referencia.tipo === 'recompensa' &&
        snapshot.exists()
      ) {
        treinoEncontrado = referencia.letra;
        statusEncontrado = 'finalizado';
      }
    });

    // Depois verifica treinos antigos que já foram iniciados.
    documentosAntigos.forEach((snapshot, indice) => {
      const referencia = referencias[indice];

      if (
        !treinoEncontrado &&
        referencia.tipo === 'treino' &&
        snapshot.exists()
      ) {
        const dados = snapshot.data();

        const possuiSerieConcluida = Object.values(
          dados.series || {}
        ).some(Boolean);

        const foiIniciado =
          dados.iniciadoEm !== null &&
          dados.iniciadoEm !== undefined;

        if (dados.finalizado || possuiSerieConcluida || foiIniciado) {
          treinoEncontrado = referencia.letra;
          statusEncontrado = dados.finalizado
            ? 'finalizado'
            : 'iniciado';
        }
      }
    });

    // Se encontrou um treino antigo, registra a reserva correspondente.
    if (treinoEncontrado) {
      transacao.set(diaRef, {
        data,
        treino: treinoEncontrado,
        status: statusEncontrado,
        migradoDeRegistroAntigo: true,
        atualizadoEm: serverTimestamp(),
      });

      return {
        permitido: treinoEncontrado === letra,
        treino: treinoEncontrado,
      };
    }

    // Se não havia nenhum treino no dia, reserva o escolhido agora.
    transacao.set(diaRef, {
      data,
      treino: letra,
      status: 'iniciado',
      iniciadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });

    return {
      permitido: true,
      treino: letra,
    };
  });
}

// Concede XP e desbloqueia conquistas.
async function concederXPPorTreino(uid, treinoId, letra, data) {
  const perfilRef = doc(
    db,
    'usuarios',
    uid,
    'gamificacao',
    'perfil'
  );

  const recompensaRef = doc(
    db,
    'usuarios',
    uid,
    'recompensasTreinos',
    treinoId
  );

  const diaRef = doc(
    db,
    'usuarios',
    uid,
    'diasTreino',
    data
  );

  return runTransaction(db, async (transacao) => {
    const recompensaSnap = await transacao.get(recompensaRef);
    const diaSnap = await transacao.get(diaRef);
    const perfilSnap = await transacao.get(perfilRef);

    // Não premia novamente um treino que já recebeu XP.
    if (recompensaSnap.exists()) {
      return {
        concedido: false,
        motivo: 'recompensa_existente',
        conquistasNovas: [],
        bonusXP: 0,
      };
    }

    // Segurança extra: impede XP para outro treino no mesmo dia.
    if (
      diaSnap.exists() &&
      diaSnap.data().treino !== letra
    ) {
      return {
        concedido: false,
        motivo: 'outro_treino_no_dia',
        treinoDoDia: diaSnap.data().treino,
        conquistasNovas: [],
        bonusXP: 0,
      };
    }

    const perfil = perfilSnap.exists()
      ? perfilSnap.data()
      : {};

    const xpAtual = Number(perfil.xpTotal) || 0;
    const treinosAtual = Number(perfil.treinosConcluidos) || 0;

    const conquistasAtuais = Array.isArray(perfil.conquistas)
      ? perfil.conquistas
      : [];

    const novoTotalTreinos = treinosAtual + 1;

    const listaConquistas = [
      {
        id: 'primeiro_treino',
        nome: 'Primeiro passo',
        requisito: 1,
        bonus: 50,
      },
      {
        id: 'constancia_10',
        nome: 'Constância',
        requisito: 10,
        bonus: 100,
      },
      {
        id: 'atleta_30',
        nome: 'Atleta dedicado',
        requisito: 30,
        bonus: 200,
      },
    ];

    const conquistasNovas = listaConquistas.filter(
      (conquista) =>
        novoTotalTreinos >= conquista.requisito &&
        !conquistasAtuais.includes(conquista.id)
    );

    const bonusXP = conquistasNovas.reduce(
      (total, conquista) => total + conquista.bonus,
      0
    );

    const xpGanho = 100 + bonusXP;

    transacao.set(
      perfilRef,
      {
        xpTotal: xpAtual + xpGanho,
        treinosConcluidos: novoTotalTreinos,
        conquistas: [
          ...conquistasAtuais,
          ...conquistasNovas.map((conquista) => conquista.id),
        ],
        atualizadoEm: serverTimestamp(),
      },
      { merge: true }
    );

    transacao.set(recompensaRef, {
      xp: 100,
      bonusXP,
      conquistasDesbloqueadas: conquistasNovas.map(
        (conquista) => conquista.id
      ),
      treino: letra,
      data,
      concedidoEm: serverTimestamp(),
    });

    // Marca o treino do dia como finalizado.
    transacao.set(
      diaRef,
      {
        data,
        treino: letra,
        status: 'finalizado',
        finalizadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      concedido: true,
      conquistasNovas,
      bonusXP,
      xpGanho,
    };
  });
}

function VideoExercicio({ fonte }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  const player = useVideoPlayer(fonte, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
    p.audioMixingMode = 'mixWithOthers';
  });

  return (
    <VideoView
      player={player}
      style={styles.imagemExercicio}
      contentFit="contain"
      nativeControls
    />
  );
}

export default function Treinos({ navigation }) {
  const { cores } = useTema();
  const espacoTopo = useTopo();
  const styles = useMemo(
    () => criarEstilos(cores, espacoTopo),
    [cores, espacoTopo]
  );

  const {
    plano,
    treinos,
    carregando: carregandoPlano,
  } = usePlano();

  const [treinoSelecionado, setTreinoSelecionado] = useState('A');
  const [seriesConcluidas, setSeriesConcluidas] = useState({});
  const [cargas, setCargas] = useState({});
  const [ultimasCargas, setUltimasCargas] = useState({});
  const [finalizados, setFinalizados] = useState({});
  const [inicios, setInicios] = useState({});
  const [duracoes, setDuracoes] = useState({});
  const [resumoAberto, setResumoAberto] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [gatilhoTimer, setGatilhoTimer] = useState(0);

  // Controle do treino reservado para o dia.
  const [treinoDoDia, setTreinoDoDia] = useState(null);
  const [carregandoDia, setCarregandoDia] = useState(true);

  // Estado e animação da conquista desbloqueada.
  const [celebracao, setCelebracao] = useState(null);
  const escalaMedalha = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (celebracao) {
      escalaMedalha.setValue(0.4);

      Animated.spring(escalaMedalha, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }).start();
    }
  }, [celebracao, escalaMedalha]);

  const temporizadores = useRef({});

  const letras = Object.keys(treinos || []);

  const letraAtiva = treinos?.[treinoSelecionado]
    ? treinoSelecionado
    : letras[0];

  const treino = treinos?.[letraAtiva];

  const jaFinalizado = !!finalizados[letraAtiva];

  const treinoBloqueado =
    !!treinoDoDia && treinoDoDia !== letraAtiva;

  function voltar() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  }

  // Carrega o treino que já foi reservado para hoje.
  useEffect(() => {
    let ativo = true;

    async function carregarTreinoDoDia() {
      if (carregandoPlano) return;

      const uid = auth.currentUser?.uid;

      if (!uid) {
        if (ativo) setCarregandoDia(false);
        return;
      }

      setCarregandoDia(true);

      try {
        const data = hojeISO();

        const diaRef = doc(
          db,
          'usuarios',
          uid,
          'diasTreino',
          data
        );

        const diaSnap = await getDoc(diaRef);

        if (!ativo) return;

        if (diaSnap.exists()) {
          const dados = diaSnap.data();
          const letraRegistrada = dados.treino;

          setTreinoDoDia(letraRegistrada);

          // Abre automaticamente o treino reservado para hoje.
          if (treinos?.[letraRegistrada]) {
            setTreinoSelecionado(letraRegistrada);
          }
        } else {
          setTreinoDoDia(null);
        }
      } catch (erro) {
        console.log('Erro ao carregar treino do dia:', erro);

        Alert.alert(
          'Atenção',
          'Não foi possível verificar o treino de hoje. Confira sua conexão.'
        );
      } finally {
        if (ativo) setCarregandoDia(false);
      }
    }

    carregarTreinoDoDia();

    return () => {
      ativo = false;
    };
  }, [carregandoPlano]);

  // Carrega o treino atual e as últimas cargas registradas.
  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const uid = auth.currentUser?.uid;

      if (!uid || !treino || !letraAtiva) return;

      try {
        const hoje = hojeISO();

        const treinoRef = doc(
          db,
          'usuarios',
          uid,
          'treinos',
          `${hoje}_${letraAtiva}`
        );

        const snap = await getDoc(treinoRef);

        if (!ativo) return;

        if (snap.exists()) {
          const dados = snap.data();

          setSeriesConcluidas(dados.series || {});

          const cargasSalvas = {};

          Object.entries(dados.cargas || {}).forEach(([id, valor]) => {
            cargasSalvas[id] = valor == null ? '' : String(valor);
          });

          setCargas(cargasSalvas);

          setFinalizados((anterior) => ({
            ...anterior,
            [letraAtiva]: !!dados.finalizado,
          }));

          setInicios((anterior) => ({
            ...anterior,
            [letraAtiva]: dados.iniciadoEm ?? null,
          }));

          setDuracoes((anterior) => ({
            ...anterior,
            [letraAtiva]: dados.duracaoSegundos ?? null,
          }));
        } else {
          setSeriesConcluidas({});
          setCargas({});

          setFinalizados((anterior) => ({
            ...anterior,
            [letraAtiva]: false,
          }));

          setInicios((anterior) => ({
            ...anterior,
            [letraAtiva]: null,
          }));

          setDuracoes((anterior) => ({
            ...anterior,
            [letraAtiva]: null,
          }));
        }

        const historicoRef = collection(
          db,
          'usuarios',
          uid,
          'treinos'
        );

        const historicoQuery = query(
          historicoRef,
          orderBy('finalizadoEm', 'desc'),
          limit(30)
        );

        const historicoSnap = await getDocs(historicoQuery);

        if (!ativo) return;

        const cargasAnteriores = {};

        historicoSnap.forEach((documento) => {
          const dados = documento.data();

          if (
            dados.treino === letraAtiva ||
            documento.id.endsWith(`_${letraAtiva}`)
          ) {
            Object.entries(dados.cargas || {}).forEach(([id, valor]) => {
              if (
                cargasAnteriores[id] === undefined &&
                valor !== null &&
                valor !== undefined
              ) {
                cargasAnteriores[id] = valor;
              }
            });
          }
        });

        setUltimasCargas((anterior) => ({
          ...anterior,
          ...cargasAnteriores,
        }));
      } catch (erro) {
        console.log('Erro ao carregar treino:', erro);
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [letraAtiva, treino]);

  // Inicia o cronômetro quando o usuário começa a marcar séries.
  useEffect(() => {
    if (!treino || !letraAtiva) return;

    const uid = auth.currentUser?.uid;

    if (!uid || jaFinalizado || inicios[letraAtiva]) return;

    const algumaSerieConcluida = treino.exercicios.some(
      (exercicio, indice) => {
        const quantidade = Number(exercicio.series) || 0;

        return Array.from({ length: quantidade }).some(
          (_, serie) => seriesConcluidas[`${indice}-${serie}`]
        );
      }
    );

    if (!algumaSerieConcluida) return;

    const inicio = Date.now();

    setInicios((anterior) => ({
      ...anterior,
      [letraAtiva]: inicio,
    }));
  }, [
    treino,
    letraAtiva,
    jaFinalizado,
    inicios,
    seriesConcluidas,
  ]);

  useEffect(() => {
    return () => {
      Object.values(temporizadores.current).forEach(clearInterval);
    };
  }, []);

  if (carregandoPlano || carregandoDia) {
    return (
      <View style={[styles.container, styles.centro]}>
        <ActivityIndicator size="large" color="#0c75d7" />
        <Text style={styles.textoErro}>
          Carregando seus treinos...
        </Text>
      </View>
    );
  }

  if (!treino || !treino.exercicios) {
    return (
      <View style={[styles.container, styles.centro]}>
        <Text style={styles.textoErro}>
          Não foi possível carregar seus treinos.
        </Text>

        <TouchableOpacity onPress={voltar}>
          <Text style={styles.voltar}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalSeries = treino.exercicios.reduce(
    (total, exercicio) => total + (Number(exercicio.series) || 0),
    0
  );

  const totalConcluidas = treino.exercicios.reduce(
    (total, exercicio, indice) => {
      const quantidade = Number(exercicio.series) || 0;

      const concluidas = Array.from({ length: quantidade }).filter(
        (_, serie) => seriesConcluidas[`${indice}-${serie}`]
      ).length;

      return total + concluidas;
    },
    0
  );

  const progresso =
    totalSeries > 0
      ? Math.round((totalConcluidas / totalSeries) * 100)
      : 0;

  const treinoCompleto =
    totalSeries > 0 && totalConcluidas === totalSeries;

  const cargasNumericas = treino.exercicios.map((exercicio, indice) => {
    const valor = String(cargas[indice] ?? '').replace(',', '.').trim();

    if (valor === '') return null;

    const numero = Number(valor);

    return Number.isFinite(numero) && numero >= 0 ? numero : null;
  });

  const somaCargas = cargasNumericas.reduce(
    (total, valor) => total + (valor ?? 0),
    0
  );

  const aumentos = treino.exercicios.reduce((total, exercicio, indice) => {
    const atual = cargasNumericas[indice];
    const anterior = ultimasCargas[exercicio.id];

    if (
      atual !== null &&
      anterior !== undefined &&
      atual > Number(anterior)
    ) {
      return total + 1;
    }

    return total;
  }, 0);

  const cargasValidas = treino.exercicios.filter(
    (_, indice) => cargasNumericas[indice] !== null
  ).length;

  const semCarga = treino.exercicios.length - cargasValidas;

  const somaAnterior = treino.exercicios.reduce((total, exercicio) => {
    return total + (Number(ultimasCargas[exercicio.id]) || 0);
  }, 0);

  const temHistorico = Object.keys(ultimasCargas).length > 0;

  const diferenca = temHistorico
    ? somaCargas - somaAnterior
    : null;

  const duracaoAtual = inicios[letraAtiva]
    ? Math.max(
        0,
        Math.round((Date.now() - inicios[letraAtiva]) / 1000)
      )
    : null;

  const duracaoFinal = duracoes[letraAtiva] ?? duracaoAtual;

  const textoDuracao =
    duracaoFinal !== null && duracaoFinal !== undefined
      ? formatarDuracao(duracaoFinal)
      : null;

  // Seleciona um treino, respeitando a reserva diária.
  function selecionarTreino(letra) {
    if (carregandoDia) return;

    if (treinoDoDia && treinoDoDia !== letra) {
      Alert.alert(
        'Treino diário já escolhido',
        `Você já iniciou o treino ${treinoDoDia} hoje. Os outros treinos estarão disponíveis amanhã.`
      );

      return;
    }

    setTreinoSelecionado(letra);
  }

  // Salva o estado atual do treino no Firestore.
  async function salvar(dadosExtras = {}) {
    const uid = auth.currentUser?.uid;

    if (!uid) {
      Alert.alert(
        'Sessão encerrada',
        'Entre novamente na sua conta para salvar seu treino.'
      );

      return false;
    }

    try {
      const data = hojeISO();

      const treinoRef = doc(
        db,
        'usuarios',
        uid,
        'treinos',
        `${data}_${letraAtiva}`
      );

      const seriesParaSalvar = {};

      treino.exercicios.forEach((exercicio, indice) => {
        const quantidade = Number(exercicio.series) || 0;

        for (let serie = 0; serie < quantidade; serie++) {
          seriesParaSalvar[`${indice}-${serie}`] =
            !!seriesConcluidas[`${indice}-${serie}`];
        }
      });

      const cargasParaSalvar = {};

      treino.exercicios.forEach((exercicio, indice) => {
        const valor = cargasNumericas[indice];

        if (valor !== null) {
          cargasParaSalvar[exercicio.id] = valor;
        }
      });

      await setDoc(
        treinoRef,
        {
          treino: letraAtiva,
          data,
          series: seriesParaSalvar,
          cargas: cargasParaSalvar,
          iniciadoEm: inicios[letraAtiva] ?? null,
          atualizadoEm: serverTimestamp(),
          ...dadosExtras,
        },
        { merge: true }
      );

      return true;
    } catch (erro) {
      console.log('Erro ao salvar treino:', erro);

      Alert.alert(
        'Erro ao salvar',
        'Não foi possível salvar seu treino. Verifique sua conexão.'
      );

      return false;
    }
  }

  function alterarCarga(indice, valor) {
    const valorLimpo = valor.replace(/[^0-9,.-]/g, '');

    setCargas((anterior) => ({
      ...anterior,
      [indice]: valorLimpo,
    }));
  }

  async function alternarSerie(indice, serie) {
    if (carregandoDia || finalizando) return;

    if (jaFinalizado) {
      Alert.alert(
        'Treino finalizado',
        'Este treino já foi concluído.'
      );

      return;
    }

    const uid = auth.currentUser?.uid;

    if (!uid) {
      Alert.alert(
        'Sessão encerrada',
        'Entre novamente na sua conta para registrar suas séries.'
      );

      return;
    }

    try {
      // Antes de marcar qualquer série, reserva o treino do dia.
      const data = hojeISO();

      const reserva = await reservarTreinoDoDia(
        uid,
        letraAtiva,
        data
      );

      if (!reserva.permitido) {
        setTreinoDoDia(reserva.treino);

        if (treinos?.[reserva.treino]) {
          setTreinoSelecionado(reserva.treino);
        }

        Alert.alert(
          'Limite diário atingido',
          `Você já iniciou o treino ${reserva.treino} hoje. Só será possível fazer outro treino amanhã.`
        );

        return;
      }

      setTreinoDoDia(letraAtiva);

      const chave = `${indice}-${serie}`;

      const novoEstado = {
        ...seriesConcluidas,
        [chave]: !seriesConcluidas[chave],
      };

      setSeriesConcluidas(novoEstado);

      const treinoRef = doc(
        db,
        'usuarios',
        uid,
        'treinos',
        `${data}_${letraAtiva}`
      );

      const seriesParaSalvar = {};

      treino.exercicios.forEach((exercicio, exercicioIndice) => {
        const quantidade = Number(exercicio.series) || 0;

        for (let numeroSerie = 0; numeroSerie < quantidade; numeroSerie++) {
          const id = `${exercicioIndice}-${numeroSerie}`;

          seriesParaSalvar[id] = !!novoEstado[id];
        }
      });

      await setDoc(
        treinoRef,
        {
          treino: letraAtiva,
          data,
          series: seriesParaSalvar,
          iniciadoEm: inicios[letraAtiva] ?? Date.now(),
          atualizadoEm: serverTimestamp(),
        },
        { merge: true }
      );

      if (!seriesConcluidas[chave]) {
      setGatilhoTimer((anterior) => anterior + 1);
      }

    } catch (erro) {
      console.log('Erro ao atualizar série:', erro);

      Alert.alert(
        'Erro',
        'Não foi possível registrar a série. Verifique sua conexão.'
      );
    }
  }

  async function finalizarTreino() {
    if (finalizando) return;

    if (!treinoCompleto) {
      Alert.alert(
        'Treino incompleto',
        'Conclua todas as séries antes de finalizar.'
      );

      return;
    }

    const uid = auth.currentUser?.uid;

    if (!uid) {
      Alert.alert(
        'Sessão encerrada',
        'Entre novamente na sua conta para finalizar o treino.'
      );

      return;
    }

    setFinalizando(true);

    const dataTreino = hojeISO();
    const idTreino = `${dataTreino}_${letraAtiva}`;
    const jaEstavaFinalizado = jaFinalizado;

    // Verifica e reserva o treino do dia antes de salvar como concluído.
    try {
      const reserva = await reservarTreinoDoDia(
        uid,
        letraAtiva,
        dataTreino
      );

      if (!reserva.permitido) {
        setTreinoDoDia(reserva.treino);

        if (treinos?.[reserva.treino]) {
          setTreinoSelecionado(reserva.treino);
        }

        setFinalizando(false);

        Alert.alert(
          'Limite diário atingido',
          `Você já iniciou o treino ${reserva.treino} hoje. Só será possível fazer outro treino amanhã.`
        );

        return;
      }

      setTreinoDoDia(letraAtiva);
    } catch (erro) {
      console.log('Erro ao reservar treino:', erro);

      setFinalizando(false);

      Alert.alert(
        'Erro',
        'Não foi possível confirmar seu treino do dia. Tente novamente.'
      );

      return;
    }

    const cargasParaSalvar = {};

    treino.exercicios.forEach((exercicio, indice) => {
      if (cargasNumericas[indice] !== null) {
        cargasParaSalvar[exercicio.id] = cargasNumericas[indice];
      }
    });

    let duracao = null;

    if (jaEstavaFinalizado && duracoes[letraAtiva] != null) {
      duracao = duracoes[letraAtiva];
    } else if (inicios[letraAtiva]) {
      duracao = Math.max(
        0,
        Math.round((Date.now() - inicios[letraAtiva]) / 1000)
      );
    }

    const salvou = await salvar({
      cargas: cargasParaSalvar,
      finalizado: true,
      finalizadoEm: serverTimestamp(),
      cargaTotal: somaCargas,
      seriesConcluidasTotal: totalConcluidas,
      seriesTotal: totalSeries,
      duracaoSegundos: duracao,
    });

    if (!salvou) {
      setFinalizando(false);
      return;
    }

    setFinalizados((anterior) => ({
      ...anterior,
      [letraAtiva]: true,
    }));

    setDuracoes((anterior) => ({
      ...anterior,
      [letraAtiva]: duracao,
    }));

    setResumoAberto(false);
    setFinalizando(false);

    // Não concede XP novamente para um treino já finalizado.
    if (jaEstavaFinalizado) {
      Alert.alert(
        'Treino já registrado',
        'Este treino já foi concluído. Nenhum XP adicional foi concedido.'
      );

      navigation.navigate('Home');
      return;
    }

    let mostrarCelebracao = false;

    try {
      const resultadoXP = await concederXPPorTreino(
        uid,
        idTreino,
        letraAtiva,
        dataTreino
      );

      if (resultadoXP.concedido) {
        if (resultadoXP.conquistasNovas.length > 0) {
          setCelebracao({
            conquistas: resultadoXP.conquistasNovas,
            bonusXP: resultadoXP.bonusXP,
            xpGanho: resultadoXP.xpGanho,
          });

          mostrarCelebracao = true;
        } else {
          Alert.alert(
            'Treino concluído! 🎮',
            `Você ganhou +${resultadoXP.xpGanho} XP!\n\nContinue treinando para evoluir.`
          );
        }
      } else {
        Alert.alert(
          'Treino concluído!',
          'Este treino já tinha uma recompensa registrada ou outro treino já foi realizado hoje.'
        );
      }
    } catch (erro) {
      console.log('Erro ao conceder XP:', erro);

      Alert.alert(
        'Treino salvo',
        'Seu treino foi salvo, mas não foi possível registrar o XP. Verifique sua conexão e as regras do Firestore.'
      );
    }

    if (!mostrarCelebracao) {
      navigation.navigate('Home');
    }
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={voltar}>
          <Text style={styles.voltar}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.logo}>GymLife</Text>
        <Text style={styles.subtitulo}>SEU TREINO, SUA EVOLUÇÃO</Text>

        <View style={styles.planoCard}>
          <Text style={styles.planoNome}>
            {plano.nome} · {plano.dias} dias · {plano.nivel}
          </Text>

          <Text style={styles.planoTexto}>{plano.descricao}</Text>
          <Text style={styles.planoTexto}>{plano.notaNivel}</Text>

          <Text style={styles.planoDica}>
            Para mudar o plano, atualize seu perfil.
          </Text>
        </View>

        <View style={styles.seletor}>
          {letras.map((letra) => {
            const bloqueado =
              !!treinoDoDia && treinoDoDia !== letra;

            return (
              <TouchableOpacity
                key={letra}
                style={[
                  styles.botaoTreino,
                  letraAtiva === letra && styles.botaoTreinoAtivo,
                  bloqueado && styles.botaoTreinoBloqueado,
                ]}
                onPress={() => selecionarTreino(letra)}
                disabled={carregandoDia || bloqueado}
              >
                <Text
                  style={[
                    styles.textoBotaoTreino,
                    letraAtiva === letra && styles.textoBotaoAtivo,
                    bloqueado && styles.textoBotaoBloqueado,
                  ]}
                >
                  Treino {letra}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {treinoDoDia && (
          <View style={styles.avisoDia}>
            <Text style={styles.textoAvisoDia}>
              🔒 Treino {treinoDoDia} reservado para hoje. Os outros
              treinos estarão disponíveis amanhã.
            </Text>
          </View>
        )}

        <Text style={styles.titulo}>{treino.titulo}</Text>
        <Text style={styles.grupo}>{treino.grupo}</Text>

        <View style={styles.progressoCard}>
          <View style={styles.progressoLinha}>
            <Text style={styles.progressoTexto}>
              Progresso do treino
            </Text>

            <Text style={styles.porcentagem}>{progresso}%</Text>
          </View>

          <View style={styles.trilho}>
            <View
              style={[
                styles.barra,
                { width: `${progresso}%` },
              ]}
            />
          </View>

          <Text style={styles.detalhes}>
            {totalConcluidas} de {totalSeries} séries concluídas
          </Text>
        </View>

        {treino.exercicios.map((exercicio, indice) => (
          <View
            key={`${letraAtiva}-${exercicio.id}`}
            style={styles.card}
          >
            <Text style={styles.numero}>
              EXERCÍCIO {String(indice + 1).padStart(2, '0')}
            </Text>

            {exercicio.video && (
              <VideoExercicio fonte={exercicio.video} />
            )}

            <Text style={styles.nomeExercicio}>
              {exercicio.nome}
            </Text>

            <Text style={styles.repeticoes}>
              {exercicio.series} séries · {exercicio.repeticoes} repetições
            </Text>

            <View style={styles.cargaLinha}>
              <View style={styles.cargaCaixa}>
                <TextInput
                  style={styles.inputCarga}
                  value={String(cargas[indice] ?? '')}
                  onChangeText={(valor) => alterarCarga(indice, valor)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={cores.textoMudo}
                  editable={!jaFinalizado && !treinoBloqueado}
                />

                <Text style={styles.unidade}>kg</Text>
              </View>

              <Text style={styles.ultimaCarga}>
                {ultimasCargas[exercicio.id] !== undefined
                  ? `Última vez: ${formatarKg(Number(ultimasCargas[exercicio.id]))} kg`
                  : 'Sem carga anterior'}
              </Text>
            </View>

            <View style={styles.seriesContainer}>
              {Array.from(
                { length: Number(exercicio.series) || 0 },
                (_, serie) => {
                  const chave = `${indice}-${serie}`;
                  const concluida = !!seriesConcluidas[chave];

                  return (
                    <TouchableOpacity
                      key={chave}
                      style={[
                        styles.botaoSerie,
                        concluida && styles.serieConcluida,
                      ]}
                      onPress={() => alternarSerie(indice, serie)}
                      disabled={
                        jaFinalizado ||
                        treinoBloqueado ||
                        carregandoDia ||
                        finalizando
                      }
                    >
                      <Text
                        style={[
                          styles.textoSerie,
                          concluida && styles.textoSerieConcluida,
                        ]}
                      >
                        {concluida ? '✓ ' : ''}
                        Série {serie + 1}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>
          </View>
        ))}

        {treinoCompleto || jaFinalizado ? (
  <>
    <TouchableOpacity
      style={[
        styles.botaoFinalizar,
        (jaFinalizado || treinoBloqueado) && { opacity: 0.5 },
      ]}
      onPress={() => setResumoAberto(true)}
      disabled={
        jaFinalizado ||
        treinoBloqueado ||
        carregandoDia ||
        finalizando
      }
    >
      <Text style={styles.textoFinalizar}>
        {jaFinalizado ? 'TREINO JÁ CONCLUÍDO' : 'FINALIZAR TREINO'}
      </Text>
    </TouchableOpacity>

    <Text style={styles.dicaFinalizar}>
      {jaFinalizado
        ? 'Este treino já foi registrado.'
        : 'Todas as séries foram concluídas!'}
    </Text>
  </>
  ) : (
    <View style={styles.avisoFinalizar}>
      <Text style={styles.textoAvisoFinalizar}>
      🔒 Complete todas as séries para liberar a finalização.
      </Text>

      <Text style={styles.progressoAviso}>
        {totalConcluidas} de {totalSeries} séries concluídas
      </Text>
     </View>
    )}

        <TouchableOpacity
          style={styles.botaoReiniciar}
          onPress={voltar}
        >
          <Text style={styles.textoReiniciar}>
            Voltar para o início
          </Text>
        </TouchableOpacity>

        <Text style={styles.rodape}>
          GymLife · Sua evolução começa aqui
        </Text>
      </ScrollView>
       
       <TimerDescanso gatilho={gatilhoTimer} />
       
      {/* Modal de resumo do treino */}
      <Modal
        visible={resumoAberto}
        transparent
        animationType="fade"
        onRequestClose={() =>
          !finalizando && setResumoAberto(false)
        }
      >
        <View style={styles.fundoModal}>
          <View style={styles.caixaModal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.tituloModal}>
                Resumo do treino
              </Text>

              <Text style={styles.subtituloModal}>
                Confira seus resultados antes de finalizar.
              </Text>

              <View style={styles.linhaResumo}>
                <Text style={styles.rotuloResumo}>Progresso</Text>
                <Text style={styles.valorResumo}>
                  {totalConcluidas} de {totalSeries}
                </Text>
              </View>

              {textoDuracao && (
                <View style={styles.linhaResumo}>
                  <Text style={styles.rotuloResumo}>Duração</Text>
                  <Text style={styles.valorResumo}>
                    {textoDuracao}
                  </Text>
                </View>
              )}

              <View style={styles.linhaResumo}>
                <Text style={styles.rotuloResumo}>
                  Soma das cargas
                </Text>

                <Text style={styles.valorResumo}>
                  {formatarKg(somaCargas)} kg
                </Text>
              </View>

              <View style={styles.linhaResumo}>
                <Text style={styles.rotuloResumo}>
                  Exercícios feitos
                </Text>

                <Text style={styles.valorResumo}>
                  {treino.exercicios.length}
                </Text>
              </View>

              {diferenca !== null && (
                <View style={styles.linhaResumo}>
                  <Text style={styles.rotuloResumo}>
                    Em relação à última vez
                  </Text>

                  <Text
                    style={[
                      styles.valorResumo,
                      diferenca > 0 && styles.subiu,
                      diferenca < 0 && styles.desceu,
                    ]}
                  >
                    {diferenca > 0 ? '+' : ''}
                    {formatarKg(diferenca)} kg
                  </Text>
                </View>
              )}

              {aumentos > 0 && (
                <Text style={styles.destaque}>
                  🔥 Você aumentou a carga em {aumentos}{' '}
                  {aumentos === 1 ? 'exercício' : 'exercícios'}!
                </Text>
              )}

              {diferenca === null && (
                <Text style={styles.observacao}>
                  Na próxima vez que fizer este treino, você poderá
                  comparar suas cargas com as de hoje.
                </Text>
              )}

              {semCarga > 0 && (
                <Text style={styles.observacao}>
                  {semCarga}{' '}
                  {semCarga === 1
                    ? 'exercício está sem carga registrada'
                    : 'exercícios estão sem carga registrada'}
                  . Anote para acompanhar sua evolução no histórico.
                </Text>
              )}

              <TouchableOpacity
                style={[
                  styles.botaoConfirmar,
                  finalizando && styles.botaoDesativado,
                ]}
                onPress={finalizarTreino}
                disabled={finalizando}
                activeOpacity={0.8}
              >
                {finalizando ? (
                  <ActivityIndicator color={cores.botaoTexto} />
                ) : (
                  <Text style={styles.textoConfirmar}>
                    FINALIZAR E IR PARA O INÍCIO
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setResumoAberto(false)}
                disabled={finalizando}
              >
                <Text style={styles.cancelar}>
                  Continuar treinando
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal animado de conquista desbloqueada */}
      <Modal
        visible={!!celebracao}
        transparent
        animationType="fade"
        onRequestClose={() => setCelebracao(null)}
      >
        <View style={styles.fundoCelebracao}>
          <View style={styles.caixaCelebracao}>
            <Animated.Text
              style={[
                styles.iconeCelebracao,
                { transform: [{ scale: escalaMedalha }] },
              ]}
            >
              🏆
            </Animated.Text>

            <Text style={styles.tituloCelebracao}>
              CONQUISTA DESBLOQUEADA!
            </Text>

            <Text style={styles.subtituloCelebracao}>
              Seu esforço está dando resultado!
            </Text>

            {celebracao?.conquistas?.map((conquista) => (
              <View key={conquista.id} style={styles.itemConquista}>
                <Text style={styles.nomeConquista}>
                  🥇 {conquista.nome}
                </Text>

                <Text style={styles.bonusConquista}>
                  +{conquista.bonus} XP
                </Text>
              </View>
            ))}

            <View style={styles.totalXP}>
              <Text style={styles.textoTotalXP}>XP recebido</Text>

              <Text style={styles.valorTotalXP}>
                +{celebracao?.xpGanho ?? 0} XP
              </Text>
            </View>

            <TouchableOpacity
              style={styles.botaoCelebracao}
              activeOpacity={0.85}
              onPress={() => {
                setCelebracao(null);
                navigation.navigate('Home');
              }}
            >
              <Text style={styles.textoBotaoCelebracao}>
                CONTINUAR
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
    padding: 20,
    paddingTop: espacoTopo,
    paddingBottom: 35,
  },
  textoErro: {
    color: cores.texto,
    fontSize: 16,
    marginBottom: 16,
  },
  voltar: {
    color: '#0c75d7',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 0,
  },
  logo: {
    color: '#0758a4',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 14,
  },
  subtitulo: {
    color: cores.texto6,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 20,
  },
  planoCard: {
    backgroundColor: cores.cartao,
    borderRadius: 14,
    padding: 14,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  planoNome: {
    color: cores.textoForte,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  planoTexto: {
    color: cores.texto3,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  planoDica: {
    color: '#0c75d7',
    fontSize: 12,
    marginTop: 4,
  },
  seletor: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  botaoTreino: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0758a469',
    alignItems: 'center',
  },
  botaoTreinoAtivo: {
    backgroundColor: cores.fundo,
    borderColor: '#0c75d7',
  },
  botaoTreinoBloqueado: {
    opacity: 0.35,
  },
  textoBotaoTreino: {
    color: cores.textoForte,
    fontWeight: '600',
    fontSize: 13,
  },
  textoBotaoAtivo: {
    color: cores.textoForte,
  },
  textoBotaoBloqueado: {
    color: cores.textoSuave,
  },
  avisoDia: {
    backgroundColor: cores.cartao,
    borderWidth: 1,
    borderColor: '#0758a4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  textoAvisoDia: {
    color: cores.acento,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  titulo: {
    color: cores.textoForte,
    fontSize: 27,
    fontWeight: 'bold',
  },
  grupo: {
    color: cores.textoSuave,
    fontSize: 17,
    marginTop: 5,
    marginBottom: 20,
  },
  progressoCard: {
    backgroundColor: cores.fundo,
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#0758a469',
  },
  progressoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressoTexto: {
    color: cores.textoForte,
    fontSize: 15,
  },
  porcentagem: {
    color: cores.textoForte,
    fontSize: 21,
    fontWeight: 'bold',
  },
  trilho: {
    height: 7,
    backgroundColor: '#0758a469',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 12,
  },
  barra: {
    height: '100%',
    backgroundColor: '#0c75d7',
    borderRadius: 10,
  },
  detalhes: {
    color: cores.textoForte,
    fontSize: 12,
    marginTop: 10,
  },
  card: {
    backgroundColor: cores.fundo,
    borderRadius: 18,
    padding: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0758a469',
  },
  numero: {
    color: cores.textoForte,
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  imagemExercicio: {
    width: '100%',
    height: 180,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: cores.fundo,
    borderRadius: 12,
  },
  nomeExercicio: {
    color: cores.textoForte,
    fontSize: 18,
    fontWeight: 'bold',
  },
  repeticoes: {
    color: cores.textoForte,
    marginTop: 6,
    marginBottom: 12,
    fontSize: 13,
  },
  cargaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  cargaCaixa: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 110,
    height: 44,
    backgroundColor: cores.cartao,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0758a469',
    paddingRight: 12,
  },
  inputCarga: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    color: cores.textoForte,
    fontSize: 15,
  },
  unidade: {
    color: cores.textoSuave,
    fontSize: 13,
  },
  ultimaCarga: {
    color: cores.textoSuave,
    fontSize: 12,
    flexShrink: 1,
  },
  seriesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  botaoSerie: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: cores.fundo,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#0758a469',
  },
  serieConcluida: {
    backgroundColor: '#0c75d7',
    borderColor: '#171717',
  },
  textoSerie: {
    color: cores.textoForte,
    fontSize: 11,
    fontWeight: '600',
  },
  textoSerieConcluida: {
    color: cores.botaoTexto,
  },
  botaoFinalizar: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#0c75d7',
    marginTop: 6,
    marginBottom: 12,
  },
  textoFinalizar: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  dicaFinalizar: {
    color: cores.textoSuave,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  botaoReiniciar: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.selecaoBorda,
    marginTop: 5,
  },
  textoReiniciar: {
    color: cores.texto4,
    fontWeight: '600',
  },
  rodape: {
    textAlign: 'center',
    color: cores.texto4,
    marginTop: 25,
    fontSize: 12,
  },
  fundoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    padding: 22,
  },
  caixaModal: {
    backgroundColor: cores.cartao,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: cores.borda,
    maxHeight: '90%',
  },
  tituloModal: {
    color: cores.texto,
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtituloModal: {
    color: cores.textoSuave,
    fontSize: 14,
    marginTop: 6,
    marginBottom: 18,
  },
  linhaResumo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: cores.bordaSuave,
  },
  rotuloResumo: {
    color: cores.texto3,
    fontSize: 14,
    flexShrink: 1,
    paddingRight: 10,
  },
  valorResumo: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: 'bold',
  },
  subiu: {
    color: cores.verde,
  },
  desceu: {
    color: cores.vermelho,
  },
  destaque: {
    color: cores.textoForte,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    lineHeight: 20,
  },
  observacao: {
    color: cores.textoSuave,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
  },
  botaoConfirmar: {
    height: 54,
    backgroundColor: cores.botaoFundo,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  botaoDesativado: {
    opacity: 0.6,
  },
  textoConfirmar: {
    color: cores.botaoTexto,
    fontWeight: 'bold',
    fontSize: 14,
  },
  cancelar: {
    color: cores.texto3,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 4,
  },

  // Estilos da animação de conquista.
  fundoCelebracao: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  caixaCelebracao: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: cores.cartao,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0c75d7',
  },
  iconeCelebracao: {
    fontSize: 76,
    marginBottom: 12,
  },
  tituloCelebracao: {
    color: cores.texto,
    fontSize: 21,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtituloCelebracao: {
    color: cores.textoSuave,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  itemConquista: {
    width: '100%',
    backgroundColor: cores.fundo,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  nomeConquista: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  bonusConquista: {
    color: cores.acento,
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalXP: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 6,
    marginBottom: 14,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  textoTotalXP: {
    color: cores.textoSuave,
    fontSize: 13,
  },
  valorTotalXP: {
    color: cores.acento,
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  botaoCelebracao: {
    width: '100%',
    backgroundColor: '#0c75d7',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  textoBotaoCelebracao: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  avisoFinalizar: {
  backgroundColor: cores.cartao,
  borderRadius: 12,
  padding: 16,
  marginTop: 6,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: cores.borda,
  alignItems: 'center',
},

textoAvisoFinalizar: {
  color: cores.textoSuave,
  fontSize: 13,
  textAlign: 'center',
},

progressoAviso: {
  color: cores.acento,
  fontSize: 14,
  fontWeight: 'bold',
  marginTop: 8,
},
});
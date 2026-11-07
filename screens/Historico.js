
import { useState, useCallback, useMemo } from 'react';
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
} from 'firebase/firestore';

import { auth, db } from '../lib/firebase';
import { exercicios } from '../data/exercicios';
import { montarPlano } from '../data/Planos';
import usePlano from '../hooks/usePlano';
import GraficoCarga from '../components/GraficosCarga';
import { formatarDuracao } from '../utils/duracao';
import { useTema } from '../theme/TemaContext';
import { useTopo } from '../theme/layout';

const TREINOS_ANTIGOS = montarPlano({
  diasTreino: 3,
  experiencia: 'Intermediário',
}).treinos;

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function dataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

function formatarDataCompleta(iso) {
  if (!iso) return 'Data não informada';

  const [ano, mes, dia] = iso.split('-');

  if (!ano || !mes || !dia) return iso;

  return `${dia}/${mes}/${ano}`;
}

function formatarMes(data) {
  const texto = data.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarKg(valor) {
  const arredondado = Math.round(Number(valor) * 10) / 10;

  return Number.isInteger(arredondado)
    ? String(arredondado)
    : String(arredondado).replace('.', ',');
}

// Lê as séries tanto no formato atual quanto no formato antigo.
function serieFoiConcluida(registro, exercicio, indiceExercicio, serie) {
  const series = registro.series || {};

  const chavesPossiveis = [
    `${indiceExercicio}-${serie}`,
    `${exercicio.id}_${serie}`,
    `${exercicio.id}-${serie}`,
  ];

  return chavesPossiveis.some((chave) => series[chave] === true);
}

function resumirRegistro(registro, treinosAtuais) {
  let titulo;
  let grupo;
  let lista;

  if (
    Array.isArray(registro.exerciciosPlano) &&
    registro.exerciciosPlano.length > 0
  ) {
    titulo = registro.titulo ?? `Treino ${registro.treino}`;
    grupo = registro.grupo ?? '';

    lista = registro.exerciciosPlano.map((e) => ({
      id: e.id,
      series: Number(e.series) || 0,
      nome: e.nome ?? exercicios[e.id]?.nome ?? e.id,
    }));
  } else {
    // Primeiro tenta utilizar o plano atual do usuário.
    // Depois utiliza o plano antigo como alternativa.
    const plano =
      treinosAtuais?.[registro.treino] ??
      TREINOS_ANTIGOS?.[registro.treino];

    if (!plano) return null;

    titulo = registro.titulo ?? plano.titulo;
    grupo = registro.grupo ?? plano.grupo ?? '';

    lista = plano.exercicios.map((e) => ({
      id: e.id,
      series: Number(e.series) || 0,
      nome: e.nome ?? exercicios[e.id]?.nome ?? e.id,
    }));
  }

  const total = lista.reduce(
    (soma, e) => soma + e.series,
    0
  );

  let concluidas = 0;

  lista.forEach((exercicio, indiceExercicio) => {
    for (let serie = 0; serie < exercicio.series; serie++) {
      if (
        serieFoiConcluida(
          registro,
          exercicio,
          indiceExercicio,
          serie
        )
      ) {
        concluidas++;
      }
    }
  });

  const temCarga = Object.values(registro.cargas || {}).some(
    (valor) =>
      valor !== null &&
      valor !== undefined &&
      valor !== '' &&
      Number.isFinite(Number(valor))
  );

  // Recupera a data do próprio documento, quando necessário.
  const data =
    registro.data ??
    String(registro.id).match(
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}/
    )?.[0];

  if (concluidas === 0 && !temCarga) return null;

  return {
    ...registro,
    data,
    titulo,
    grupo,
    lista,
    total,
    concluidas,
    pct:
      total === 0
        ? 0
        : Math.round((concluidas / total) * 100),
    finalizado: registro.finalizado === true,
    duracao: Number.isFinite(registro.duracaoSegundos)
      ? registro.duracaoSegundos
      : null,
    cargaTotal: Number.isFinite(registro.cargaTotal)
      ? registro.cargaTotal
      : null,
  };
}

export default function Historico({ navigation }) {
  const { cores } = useTema();
  const espacoTopo = useTopo();
  const styles = useMemo(
    () => criarEstilos(cores, espacoTopo),
    [cores, espacoTopo]
  );

  const { treinos } = usePlano();

  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const [letraEscolhida, setLetraEscolhida] = useState('A');
  const [exercicioEscolhido, setExercicioEscolhido] = useState(null);

  const [aberto, setAberto] = useState(null);
  const [filtro, setFiltro] = useState('todos');

  const [mesExibido, setMesExibido] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );

  const [diaSelecionado, setDiaSelecionado] = useState(null);

  // Atualiza o histórico sempre que a tela recebe foco.
  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregar() {
        const uid = auth.currentUser?.uid;

        if (!uid) {
          if (ativo) {
            setRegistros([]);
            setCarregando(false);
          }

          return;
        }

        try {
          setCarregando(true);
          setErro(false);

          const consulta = query(
            collection(db, 'usuarios', uid, 'treinos'),
            orderBy('data', 'desc'),
            limit(120)
          );

          const resultado = await getDocs(consulta);

          if (!ativo) return;

          const dados = resultado.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));

          setRegistros(dados);
        } catch (e) {
          console.log('Erro ao carregar histórico:', e);

          if (ativo) setErro(true);
        } finally {
          if (ativo) setCarregando(false);
        }
      }

      carregar();

      return () => {
        ativo = false;
      };
    }, [])
  );

  const lista = useMemo(
    () =>
      registros
        .map((registro) => resumirRegistro(registro, treinos))
        .filter(Boolean)
        .sort((a, b) => (b.data || '').localeCompare(a.data || '')),
    [registros, treinos]
  );

  const finalizadosLista = lista.filter(
    (registro) => registro.finalizado
  );

  const comDuracao = finalizadosLista.filter(
    (registro) => registro.duracao !== null
  );

  const mediaDuracao =
    comDuracao.length > 0
      ? comDuracao.reduce(
          (total, registro) => total + registro.duracao,
          0
        ) / comDuracao.length
      : null;

  const hoje = dataISO(new Date());

  const inicioUltimosSeteDias = new Date();
  inicioUltimosSeteDias.setHours(0, 0, 0, 0);
  inicioUltimosSeteDias.setDate(
    inicioUltimosSeteDias.getDate() - 6
  );

  const dataInicioSeteDias = dataISO(inicioUltimosSeteDias);

  const treinosUltimosSeteDias = new Set(
    finalizadosLista
      .filter(
        (registro) =>
          registro.data >= dataInicioSeteDias &&
          registro.data <= hoje
      )
      .map((registro) => registro.data)
  ).size;

  const prefixoMes = `${mesExibido.getFullYear()}-${String(
    mesExibido.getMonth() + 1
  ).padStart(2, '0')}`;

  const diasAtivosMes = new Set(
    lista
      .filter(
        (registro) =>
          registro.data?.startsWith(prefixoMes) &&
          (registro.concluidas > 0 || registro.finalizado)
      )
      .map((registro) => registro.data)
  ).size;

  const diasComTreino = useMemo(
    () =>
      new Set(
        lista
          .filter(
            (registro) =>
              registro.concluidas > 0 || registro.finalizado
          )
          .map((registro) => registro.data)
      ),
    [lista]
  );

  // Monta o calendário do mês exibido.
  const calendario = useMemo(() => {
    const ano = mesExibido.getFullYear();
    const mes = mesExibido.getMonth();

    const primeiroDia = new Date(ano, mes, 1).getDay();
    const quantidadeDias = new Date(ano, mes + 1, 0).getDate();

    const quantidadeCelulas = Math.ceil(
      (primeiroDia + quantidadeDias) / 7
    ) * 7;

    return Array.from({ length: quantidadeCelulas }, (_, indice) => {
      const numeroDia = indice - primeiroDia + 1;

      if (numeroDia < 1 || numeroDia > quantidadeDias) {
        return null;
      }

      const data = dataISO(new Date(ano, mes, numeroDia));

      return {
        dia: numeroDia,
        data,
        temTreino: diasComTreino.has(data),
        futuro: data > hoje,
      };
    });
  }, [mesExibido, diasComTreino, hoje]);

  function mudarMes(direcao) {
    setMesExibido((anterior) => {
      return new Date(
        anterior.getFullYear(),
        anterior.getMonth() + direcao,
        1
      );
    });

    setDiaSelecionado(null);
  }

  function selecionarDia(data) {
    setDiaSelecionado((anterior) =>
      anterior === data ? null : data
    );

    setAberto(null);
  }

  const listaVisivel = lista.filter((registro) => {
    const passaFiltro =
      filtro === 'finalizados'
        ? registro.finalizado
        : true;

    const passaData =
      !diaSelecionado || registro.data === diaSelecionado;

    return passaFiltro && passaData;
  });

  const letras = Object.keys(treinos || {});

  const letra = treinos?.[letraEscolhida]
    ? letraEscolhida
    : letras[0];

  const exerciciosDoTreino =
    treinos?.[letra]?.exercicios ?? [];

  const exercicioAtual =
    exerciciosDoTreino.find(
      (e) => e.id === exercicioEscolhido
    ) ?? exerciciosDoTreino[0];

  const idAtual = exercicioAtual?.id;

  const pontos = idAtual
    ? registros
        .filter(
          (registro) =>
            registro.finalizado &&
            registro.data &&
            registro.cargas &&
            registro.cargas[idAtual] != null
        )
        .map((registro) => ({
          data: registro.data,
          valor: Number(registro.cargas[idAtual]),
        }))
        .filter((ponto) => Number.isFinite(ponto.valor))
        .sort((a, b) => a.data.localeCompare(b.data))
        .slice(-12)
    : [];

  const primeiro =
    pontos.length > 0 ? pontos[0].valor : null;

  const atual =
    pontos.length > 0
      ? pontos[pontos.length - 1].valor
      : null;

  const diferenca =
    pontos.length > 1 ? atual - primeiro : null;

  function trocarTreino(novaLetra) {
    setLetraEscolhida(novaLetra);
    setExercicioEscolhido(
      treinos[novaLetra].exercicios[0]?.id ?? null
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.conteudo}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.voltar}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Histórico</Text>

        <Text style={styles.subtitulo}>
          Acompanhe sua evolução e sua frequência.
        </Text>

        {carregando ? (
          <ActivityIndicator
            color="#0c75d7"
            style={{ marginTop: 40 }}
            size="large"
          />
        ) : erro ? (
          <View style={styles.card}>
            <Text style={styles.textoAviso}>
              Não foi possível carregar o histórico.
              Verifique sua conexão e volte para esta tela.
            </Text>
          </View>
        ) : (
          <>
            {/* RESUMO GERAL */}
            <Text style={styles.tituloSecao}>
              Seu desempenho
            </Text>

            <View style={styles.estatisticas}>
              <View style={styles.estatistica}>
                <Text style={styles.estatisticaValor}>
                  {finalizadosLista.length}
                </Text>

                <Text style={styles.estatisticaRotulo}>
                  Treinos concluídos
                </Text>
              </View>

              <View style={styles.divisor} />

              <View style={styles.estatistica}>
                <Text style={styles.estatisticaValor}>
                  {treinosUltimosSeteDias}
                </Text>

                <Text style={styles.estatisticaRotulo}>
                  Últimos 7 dias
                </Text>
              </View>
            </View>

            <View style={styles.estatisticas}>
              <View style={styles.estatistica}>
                <Text style={styles.estatisticaValor}>
                  {diasAtivosMes}
                </Text>

                <Text style={styles.estatisticaRotulo}>
                  Dias ativos no mês
                </Text>
              </View>

              <View style={styles.divisor} />

              <View style={styles.estatistica}>
                <Text style={styles.estatisticaValor}>
                  {mediaDuracao !== null
                    ? formatarDuracao(mediaDuracao)
                    : '-'}
                </Text>

                <Text style={styles.estatisticaRotulo}>
                  Duração média
                </Text>
              </View>
            </View>

            {/* CALENDÁRIO */}
            <Text style={styles.tituloSecao}>
              Calendário de atividades
            </Text>

            <View style={styles.calendarioCard}>
              <View style={styles.mesNavegacao}>
                <TouchableOpacity
                  style={styles.botaoMes}
                  onPress={() => mudarMes(-1)}
                >
                  <Text style={styles.setaMes}>‹</Text>
                </TouchableOpacity>

                <Text style={styles.mesTitulo}>
                  {formatarMes(mesExibido)}
                </Text>

                <TouchableOpacity
                  style={styles.botaoMes}
                  onPress={() => mudarMes(1)}
                >
                  <Text style={styles.setaMes}>›</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.gradeCalendario}>
                {DIAS_SEMANA.map((dia, indice) => (
                  <View
                    key={`${dia}-${indice}`}
                    style={styles.celulaSemana}
                  >
                    <Text style={styles.textoSemana}>
                      {dia}
                    </Text>
                  </View>
                ))}

                {calendario.map((celula, indice) => {
                  if (!celula) {
                    return (
                      <View
                        key={`vazio-${indice}`}
                        style={styles.celulaDia}
                      />
                    );
                  }

                  const selecionado =
                    diaSelecionado === celula.data;

                  return (
                    <TouchableOpacity
                      key={celula.data}
                      style={[
                        styles.celulaDia,
                        celula.temTreino && styles.diaComTreino,
                        selecionado && styles.diaSelecionado,
                        celula.futuro && styles.diaFuturo,
                      ]}
                      disabled={celula.futuro}
                      onPress={() => selecionarDia(celula.data)}
                    >
                      <Text
                        style={[
                          styles.numeroDia,
                          celula.temTreino &&
                            styles.numeroDiaComTreino,
                          selecionado && styles.numeroDiaSelecionado,
                          celula.futuro && styles.numeroDiaFuturo,
                        ]}
                      >
                        {celula.dia}
                      </Text>

                      {celula.temTreino && (
                        <View
                          style={[
                            styles.pontoCalendario,
                            selecionado &&
                              styles.pontoCalendarioSelecionado,
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.legendaCalendario}>
                <View style={styles.pontoLegenda} />

                <Text style={styles.textoLegenda}>
                  Dia com atividade
                </Text>
              </View>

              {diaSelecionado && (
                <TouchableOpacity
                  style={styles.limparData}
                  onPress={() => setDiaSelecionado(null)}
                >
                  <Text style={styles.textoLimparData}>
                    Limpar seleção · {formatarDataCompleta(diaSelecionado)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* EVOLUÇÃO DAS CARGAS */}
            <Text style={styles.tituloSecao}>
              Evolução das cargas
            </Text>

            {letras.length > 0 && exercicioAtual ? (
              <>
                <View style={styles.seletor}>
                  {letras.map((l) => (
                    <TouchableOpacity
                      key={l}
                      style={[
                        styles.botaoTreino,
                        letra === l && styles.botaoTreinoAtivo,
                      ]}
                      onPress={() => trocarTreino(l)}
                    >
                      <Text
                        style={[
                          styles.textoBotaoTreino,
                          letra === l && styles.textoBotaoAtivo,
                        ]}
                      >
                        Treino {l}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chips}
                >
                  {exerciciosDoTreino.map((e) => (
                    <TouchableOpacity
                      key={e.id}
                      style={[
                        styles.chip,
                        idAtual === e.id && styles.chipAtivo,
                      ]}
                      onPress={() => setExercicioEscolhido(e.id)}
                    >
                      <Text
                        style={[
                          styles.textoChip,
                          idAtual === e.id && styles.textoChipAtivo,
                        ]}
                      >
                        {e.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.card}>
                  <Text style={styles.nomeExercicio}>
                    {exercicioAtual.nome}
                  </Text>

                  {pontos.length > 0 && (
                    <Text style={styles.resumo}>
                      {diferenca === null
                        ? `Carga registrada: ${formatarKg(atual)} kg`
                        : `${formatarKg(primeiro)} kg → ${formatarKg(atual)} kg`}

                      {diferenca !== null && diferenca !== 0 && (
                        <Text
                          style={
                            diferenca > 0
                              ? styles.subiu
                              : styles.desceu
                          }
                        >
                          {'  '}
                          {diferenca > 0 ? '+' : ''}
                          {formatarKg(diferenca)} kg
                        </Text>
                      )}
                    </Text>
                  )}

                  <GraficoCarga pontos={pontos} />

                  {pontos.length === 0 && (
                    <Text style={styles.dica}>
                      Ainda não existem cargas registradas para
                      este exercício em treinos finalizados.
                    </Text>
                  )}

                  {pontos.length === 1 && (
                    <Text style={styles.dica}>
                      Registre a carga em mais um dia para ver
                      a linha de evolução.
                    </Text>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.card}>
                <Text style={styles.textoAviso}>
                  Não foi possível encontrar exercícios para
                  montar o gráfico.
                </Text>
              </View>
            )}

            {/* LISTA DE TREINOS */}
            <Text style={styles.tituloSecao}>
              Treinos realizados
            </Text>

            <View style={styles.filtros}>
              <TouchableOpacity
                style={[
                  styles.filtro,
                  filtro === 'todos' && styles.filtroAtivo,
                ]}
                onPress={() => setFiltro('todos')}
              >
                <Text
                  style={[
                    styles.textoFiltro,
                    filtro === 'todos' && styles.textoFiltroAtivo,
                  ]}
                >
                  Todos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filtro,
                  filtro === 'finalizados' && styles.filtroAtivo,
                ]}
                onPress={() => setFiltro('finalizados')}
              >
                <Text
                  style={[
                    styles.textoFiltro,
                    filtro === 'finalizados' &&
                      styles.textoFiltroAtivo,
                  ]}
                >
                  Finalizados
                </Text>
              </TouchableOpacity>
            </View>

            {diaSelecionado && (
              <Text style={styles.textoFiltroData}>
                Mostrando registros de {formatarDataCompleta(diaSelecionado)}
              </Text>
            )}

            {listaVisivel.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.textoAviso}>
                  {diaSelecionado
                    ? 'Nenhum treino encontrado nesta data.'
                    : filtro === 'finalizados'
                      ? 'Nenhum treino finalizado ainda. Conclua todas as séries e finalize seu treino.'
                      : 'Nenhum treino registrado ainda. Marque séries ou anote cargas na tela de treinos.'}
                </Text>
              </View>
            ) : (
              listaVisivel.map((r) => {
                const expandido = aberto === r.id;

                const textoDuracao =
                  r.duracao !== null
                    ? formatarDuracao(r.duracao)
                    : null;

                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.card,
                      r.finalizado && styles.cardFinalizado,
                    ]}
                    activeOpacity={0.8}
                    onPress={() =>
                      setAberto(expandido ? null : r.id)
                    }
                  >
                    <View style={styles.linhaTopo}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.linhaData}>
                          <Text style={styles.data}>
                            {formatarDataCompleta(r.data)}
                          </Text>

                          <View
                            style={[
                              styles.selo,
                              r.finalizado
                                ? styles.seloFinalizado
                                : styles.seloPendente,
                            ]}
                          >
                            <Text
                              style={[
                                styles.textoSelo,
                                r.finalizado
                                  ? styles.textoSeloFinalizado
                                  : styles.textoSeloPendente,
                              ]}
                            >
                              {r.finalizado
                                ? '✓ Finalizado'
                                : 'Não finalizado'}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.nomeTreino}>
                          {r.titulo}
                          {r.grupo ? ` · ${r.grupo}` : ''}
                        </Text>
                      </View>

                      <Text style={styles.porcentagem}>
                        {r.pct}%
                      </Text>
                    </View>

                    <View style={styles.trilho}>
                      <View
                        style={[
                          styles.barra,
                          { width: `${r.pct}%` },
                        ]}
                      />
                    </View>

                    <Text style={styles.detalhes}>
                      {r.concluidas} de {r.total} séries concluídas
                      {expandido ? '  ▲' : '  ▼'}
                    </Text>

                    {r.finalizado &&
                      (textoDuracao || r.cargaTotal !== null) && (
                        <Text style={styles.meta}>
                          {textoDuracao
                            ? `⏱ ${textoDuracao}`
                            : ''}

                          {textoDuracao && r.cargaTotal !== null
                            ? '  ·  '
                            : ''}

                          {r.cargaTotal !== null
                            ? `${formatarKg(r.cargaTotal)} kg de carga`
                            : ''}
                        </Text>
                      )}

                    {expandido && (
                      <View style={styles.detalheLista}>
                        {r.lista.map((e, indiceExercicio) => {
                          let feitas = 0;

                          for (
                            let i = 0;
                            i < e.series;
                            i++
                          ) {
                            if (
                              serieFoiConcluida(
                                r,
                                e,
                                indiceExercicio,
                                i
                              )
                            ) {
                              feitas++;
                            }
                          }

                          const carga = r.cargas?.[e.id];

                          return (
                            <View
                              key={e.id}
                              style={styles.linhaExercicio}
                            >
                              <Text style={styles.exercicioNome}>
                                {e.nome}
                              </Text>

                              <Text style={styles.exercicioInfo}>
                                {feitas}/{e.series} séries ·{' '}
                                {carga != null
                                  ? `${formatarKg(Number(carga))} kg`
                                  : 'sem carga'}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
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
    padding: 20,
    paddingTop: espacoTopo,
    paddingBottom: 40,
  },

  voltar: {
    color: '#0c75d7',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 18,
  },

  titulo: {
    color: cores.texto,
    fontSize: 30,
    fontWeight: 'bold',
  },

  subtitulo: {
    color: cores.textoSuave,
    fontSize: 15,
    marginTop: 6,
    marginBottom: 22,
  },

  tituloSecao: {
    color: cores.texto,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 14,
    marginTop: 12,
  },

  // Estatísticas
  estatisticas: {
    flexDirection: 'row',
    backgroundColor: cores.cartao,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cores.borda,
    paddingVertical: 16,
    marginBottom: 12,
  },

  estatistica: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },

  estatisticaValor: {
    color: cores.texto,
    fontSize: 21,
    fontWeight: 'bold',
  },

  estatisticaRotulo: {
    color: cores.textoSuave,
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },

  divisor: {
    width: 1,
    backgroundColor: cores.borda,
  },

  // Calendário
  calendarioCard: {
    backgroundColor: cores.cartao,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: cores.borda,
    marginBottom: 16,
  },

  mesNavegacao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  mesTitulo: {
    color: cores.texto,
    fontSize: 17,
    fontWeight: 'bold',
  },

  botaoMes: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: cores.trilho4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  setaMes: {
    color: cores.acento,
    fontSize: 28,
    lineHeight: 31,
  },

  gradeCalendario: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  celulaSemana: {
    width: '14.2857%',
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoSemana: {
    color: cores.textoSuave,
    fontWeight: 'bold',
    fontSize: 12,
  },

  celulaDia: {
    width: '14.2857%',
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    position: 'relative',
  },

  diaComTreino: {
    backgroundColor: '#0758a433',
  },

  diaSelecionado: {
    backgroundColor: '#0c75d7',
  },

  diaFuturo: {
    opacity: 0.35,
  },

  numeroDia: {
    color: cores.texto3,
    fontSize: 14,
    fontWeight: '500',
  },

  numeroDiaComTreino: {
    color: cores.acento,
    fontWeight: 'bold',
  },

  numeroDiaSelecionado: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  numeroDiaFuturo: {
    color: cores.texto8,
  },

  pontoCalendario: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: cores.acento,
    position: 'absolute',
    bottom: 4,
  },

  pontoCalendarioSelecionado: {
    backgroundColor: cores.botaoFundo,
  },

  legendaCalendario: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    gap: 7,
  },

  pontoLegenda: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: cores.acento,
  },

  textoLegenda: {
    color: cores.textoSuave,
    fontSize: 12,
  },

  limparData: {
    paddingTop: 13,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },

  textoLimparData: {
    color: cores.acento,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Seletores de treino e exercício
  seletor: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },

  botaoTreino: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0758a469',
    alignItems: 'center',
  },

  botaoTreinoAtivo: {
    borderColor: '#0c75d7',
    backgroundColor: '#0758a433',
  },

  textoBotaoTreino: {
    color: cores.textoForte,
    fontWeight: '600',
    fontSize: 13,
  },

  textoBotaoAtivo: {
    color: cores.acento,
  },

  chips: {
    gap: 8,
    paddingBottom: 14,
  },

  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.cartao,
  },

  chipAtivo: {
    backgroundColor: '#0c75d7',
    borderColor: '#0c75d7',
  },

  textoChip: {
    color: cores.texto3,
    fontSize: 13,
  },

  textoChipAtivo: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // Cards e gráficos
  card: {
    backgroundColor: cores.fundo,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0758a469',
  },

  cardFinalizado: {
    borderColor: '#2f6f4a',
  },

  nomeExercicio: {
    color: cores.textoForte,
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 6,
  },

  resumo: {
    color: cores.texto3,
    fontSize: 14,
    marginBottom: 12,
  },

  subiu: {
    color: cores.verde,
    fontWeight: 'bold',
  },

  desceu: {
    color: cores.vermelho,
    fontWeight: 'bold',
  },

  dica: {
    color: cores.textoSuave,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },

  textoAviso: {
    color: cores.textoSuave,
    fontSize: 14,
    lineHeight: 20,
  },

  // Filtros
  filtros: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },

  filtro: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.cartao,
  },

  filtroAtivo: {
    backgroundColor: '#0c75d7',
    borderColor: '#0c75d7',
  },

  textoFiltro: {
    color: cores.texto3,
    fontSize: 13,
  },

  textoFiltroAtivo: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  textoFiltroData: {
    color: cores.acento,
    fontSize: 13,
    marginBottom: 12,
  },

  // Lista de treinos
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  linhaData: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },

  data: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: 'bold',
  },

  selo: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 10,
  },

  seloFinalizado: {
    backgroundColor: '#14532d',
  },

  seloPendente: {
    backgroundColor: cores.divisor,
  },

  textoSelo: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  textoSeloFinalizado: {
    color: cores.verde,
  },

  textoSeloPendente: {
    color: cores.textoSuave,
  },

  nomeTreino: {
    color: cores.textoSuave,
    fontSize: 13,
    marginTop: 4,
  },

  porcentagem: {
    color: cores.textoForte,
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 10,
  },

  trilho: {
    height: 7,
    backgroundColor: '#0758a469',
    borderRadius: 10,
    overflow: 'hidden',
  },

  barra: {
    height: '100%',
    backgroundColor: '#0c75d7',
    borderRadius: 10,
  },

  detalhes: {
    color: cores.texto3,
    fontSize: 12,
    marginTop: 10,
  },

  meta: {
    color: cores.textoForte,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },

  detalheLista: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: cores.divisor,
    gap: 10,
  },

  linhaExercicio: {
    gap: 2,
  },

  exercicioNome: {
    color: cores.textoForte,
    fontSize: 14,
    fontWeight: '600',
  },

  exercicioInfo: {
    color: cores.textoSuave,
    fontSize: 12,
  },
});

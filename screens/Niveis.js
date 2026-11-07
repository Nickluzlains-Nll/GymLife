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

import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../lib/firebase';
import { useTema } from '../theme/TemaContext';
import { useTopo } from '../theme/layout';

const XP_POR_NIVEL = 200;

const FAIXAS = [
  {
    nome: 'Iniciante',
    inicio: 1,
    fim: 1,
    emoji: '🌱',
    cor: '#A3A3A3',
    descricao: 'O começo de uma nova jornada.',
  },
  {
    nome: 'Dedicado',
    inicio: 2,
    fim: 4,
    emoji: '💪',
    cor: '#60A5FA',
    descricao: 'Você está criando consistência.',
  },
  {
    nome: 'Experiente',
    inicio: 5,
    fim: 9,
    emoji: '⚡',
    cor: '#38BDF8',
    descricao: 'Sua dedicação está ficando evidente.',
  },
  {
    nome: 'Avançado',
    inicio: 10,
    fim: 14,
    emoji: '🔥',
    cor: '#F59E0B',
    descricao: 'Você já construiu uma boa trajetória.',
  },
  {
    nome: 'Elite',
    inicio: 15,
    fim: 19,
    emoji: '🏆',
    cor: '#C084FC',
    descricao: 'Uma jornada marcada pela dedicação.',
  },
  {
    nome: 'Lenda',
    inicio: 20,
    fim: Infinity,
    emoji: '👑',
    cor: '#FACC15',
    descricao: 'O topo da evolução GymLife.',
  },
];

function obterFaixa(nivel) {
  return (
    FAIXAS.find(
      (faixa) =>
        nivel >= faixa.inicio &&
        nivel <= faixa.fim
    ) || FAIXAS[0]
  );
}

export default function Niveis({ navigation }) {
  const { cores } = useTema();
  const espacoTopo = useTopo();
  const styles = useMemo(
    () => criarEstilos(cores, espacoTopo),
    [cores, espacoTopo]
  );

  const [xpTotal, setXpTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregarXP() {
        const uid = auth.currentUser?.uid;

        if (!uid) {
          if (ativo) {
            setErro(true);
            setCarregando(false);
          }

          return;
        }

        try {
          setCarregando(true);
          setErro(false);

          const referencia = doc(
            db,
            'usuarios',
            uid,
            'gamificacao',
            'perfil'
          );

          const resultado = await getDoc(referencia);

          if (!ativo) return;

          if (resultado.exists()) {
            const dados = resultado.data();

            setXpTotal(Number(dados.xpTotal) || 0);
          } else {
            setXpTotal(0);
          }
        } catch (e) {
          console.log('Erro ao carregar níveis:', e);

          if (ativo) setErro(true);
        } finally {
          if (ativo) setCarregando(false);
        }
      }

      carregarXP();

      return () => {
        ativo = false;
      };
    }, [])
  );

  const nivel = Math.floor(xpTotal / XP_POR_NIVEL) + 1;
  const xpAtual = xpTotal % XP_POR_NIVEL;
  const faltamXP = XP_POR_NIVEL - xpAtual;
  const progresso = (xpAtual / XP_POR_NIVEL) * 100;

  const faixaAtual = obterFaixa(nivel);

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

        <Text style={styles.etiqueta}>GYMLIFE • PROGRESSÃO</Text>

        <Text style={styles.titulo}>Meus níveis</Text>

        <Text style={styles.subtitulo}>
          Descubra os níveis disponíveis e acompanhe sua evolução.
        </Text>

        {carregando ? (
          <ActivityIndicator
            size="large"
            color={cores.acento}
            style={styles.carregando}
          />
        ) : erro ? (
          <View style={styles.card}>
            <Text style={styles.textoErro}>
              Não foi possível carregar seus pontos de XP.
            </Text>

            <TouchableOpacity
              style={styles.botao}
              onPress={() => navigation.replace('Niveis')}
            >
              <Text style={styles.textoBotao}>
                TENTAR NOVAMENTE
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.cardAtual}>
              <Text style={styles.rotulo}>
                SEU NÍVEL ATUAL
              </Text>

              <View style={styles.linhaAtual}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nomeFaixa}>
                    {faixaAtual.nome}
                  </Text>

                  <Text style={styles.numeroNivel}>
                    Nível {nivel}
                  </Text>

                  <Text style={styles.descricaoAtual}>
                    {faixaAtual.descricao}
                  </Text>
                </View>

                <View style={styles.iconeAtual}>
                  <Text style={styles.emojiAtual}>
                    {faixaAtual.emoji}
                  </Text>
                </View>
              </View>

              <View style={styles.linhaXP}>
                <Text style={styles.rotulo}>
                  PROGRESSO DO NÍVEL
                </Text>

                <Text style={styles.valorXP}>
                  {xpAtual}/{XP_POR_NIVEL} XP
                </Text>
              </View>

              <View style={styles.trilho}>
                <View
                  style={[
                    styles.barra,
                    { width: `${progresso}%` },
                  ]}
                />
              </View>

              <Text style={styles.faltam}>
                Faltam {faltamXP} XP para o nível {nivel + 1}.
              </Text>

              <View style={styles.divisor} />

              <Text style={styles.rotulo}>
                XP ACUMULADO
              </Text>

              <Text style={styles.totalXP}>
                {xpTotal} XP
              </Text>
            </View>

            <Text style={styles.tituloSecao}>
              Todos os níveis
            </Text>

            <Text style={styles.textoSecao}>
              A cada 200 XP você sobe um nível.
            </Text>

            {FAIXAS.map((faixa) => {
              const desbloqueada = nivel >= faixa.inicio;
              const atual =
                nivel >= faixa.inicio &&
                nivel <= faixa.fim;

              const nivelTexto =
                faixa.fim === Infinity
                  ? `Nível ${faixa.inicio}+`
                  : faixa.inicio === faixa.fim
                    ? `Nível ${faixa.inicio}`
                    : `Níveis ${faixa.inicio}–${faixa.fim}`;

              const xpNecessario =
                (faixa.inicio - 1) * XP_POR_NIVEL;

              return (
                <View
                  key={faixa.nome}
                  style={[
                    styles.cardFaixa,
                    atual && styles.cardFaixaAtual,
                  ]}
                >
                  <View
                    style={[
                      styles.iconeFaixa,
                      !desbloqueada && styles.iconeBloqueado,
                    ]}
                  >
                    <Text style={styles.emojiFaixa}>
                      {desbloqueada ? faixa.emoji : '🔒'}
                    </Text>
                  </View>

                  <View style={styles.infoFaixa}>
                    <View style={styles.linhaNomeFaixa}>
                      <Text
                        style={[
                          styles.nomeNivel,
                          { color: desbloqueada ? faixa.cor : cores.textoMudo },
                        ]}
                      >
                        {faixa.nome}
                      </Text>

                      {atual && (
                        <View style={styles.seloAtual}>
                          <Text style={styles.textoSeloAtual}>
                            ATUAL
                          </Text>
                        </View>
                      )}

                      {!desbloqueada && (
                        <Text style={styles.seloBloqueado}>
                          BLOQUEADO
                        </Text>
                      )}
                    </View>

                    <Text style={styles.faixaNivel}>
                      {nivelTexto}
                    </Text>

                    <Text style={styles.descricaoFaixa}>
                      {faixa.descricao}
                    </Text>

                    <Text style={styles.xpNecessario}>
                      A partir de {xpNecessario.toLocaleString('pt-BR')} XP
                    </Text>
                  </View>
                </View>
              );
            })}

            <View style={styles.cardInformacao}>
              <Text style={styles.emojiInformacao}>💡</Text>

              <Text style={styles.tituloInformacao}>
                Como subir de nível?
              </Text>

              <Text style={styles.textoInformacao}>
                Conclua seus treinos e participe dos desafios
                semanais para acumular XP. A cada 200 XP,
                você avança um nível.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.botaoDesafios}
              onPress={() => navigation.navigate('Desafios')}
              activeOpacity={0.8}
            >
              <Text style={styles.textoBotaoDesafios}>
                VER DESAFIOS SEMANAIS
              </Text>
            </TouchableOpacity>
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

  carregando: {
    marginTop: 40,
  },

  cardAtual: {
    backgroundColor: cores.cartao,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 17,
    padding: 19,
    marginBottom: 29,
  },

  rotulo: {
    color: cores.textoSuave,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  linhaAtual: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    marginBottom: 22,
  },

  nomeFaixa: {
    color: cores.acento,
    fontSize: 23,
    fontWeight: 'bold',
  },

  numeroNivel: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },

  descricaoAtual: {
    color: cores.textoSuave,
    fontSize: 12,
    marginTop: 6,
  },

  iconeAtual: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: cores.trilho,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  emojiAtual: {
    fontSize: 35,
  },

  linhaXP: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  valorXP: {
    color: cores.acento,
    fontSize: 12,
    fontWeight: 'bold',
  },

  trilho: {
    height: 8,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: cores.borda,
    marginTop: 11,
  },

  barra: {
    height: 8,
    borderRadius: 10,
    backgroundColor: '#0C75D7',
  },

  faltam: {
    color: cores.textoSuave,
    fontSize: 11,
    marginTop: 10,
  },

  divisor: {
    height: 1,
    backgroundColor: cores.borda,
    marginVertical: 17,
  },

  totalXP: {
    color: cores.texto,
    fontSize: 23,
    fontWeight: 'bold',
    marginTop: 5,
  },

  tituloSecao: {
    color: cores.texto,
    fontSize: 21,
    fontWeight: 'bold',
  },

  textoSecao: {
    color: cores.textoSuave,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 16,
  },

  cardFaixa: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.cartao,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 15,
    marginBottom: 11,
  },

  cardFaixaAtual: {
    borderColor: '#3976B8',
  },

  iconeFaixa: {
    width: 52,
    height: 52,
    borderRadius: 13,
    backgroundColor: cores.trilho,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  iconeBloqueado: {
    backgroundColor: cores.trilho5,
  },

  emojiFaixa: {
    fontSize: 25,
  },

  infoFaixa: {
    flex: 1,
  },

  linhaNomeFaixa: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },

  nomeNivel: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  seloAtual: {
    backgroundColor: cores.seloAtualFundo,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },

  textoSeloAtual: {
    color: cores.acentoClaro,
    fontSize: 8,
    fontWeight: 'bold',
  },

  seloBloqueado: {
    color: cores.textoMudo,
    fontSize: 8,
    fontWeight: 'bold',
  },

  faixaNivel: {
    color: cores.texto3,
    fontSize: 11,
    marginTop: 4,
  },

  descricaoFaixa: {
    color: cores.textoSuave,
    fontSize: 11,
    marginTop: 4,
  },

  xpNecessario: {
    color: cores.acento,
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 6,
  },

  cardInformacao: {
    backgroundColor: cores.cardAzulSuave,
    borderRadius: 14,
    padding: 18,
    marginTop: 18,
  },

  emojiInformacao: {
    fontSize: 25,
    marginBottom: 7,
  },

  tituloInformacao: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: 'bold',
  },

  textoInformacao: {
    color: cores.texto5,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },

  botaoDesafios: {
    backgroundColor: '#0C75D7',
    borderRadius: 11,
    padding: 16,
    alignItems: 'center',
    marginTop: 19,
  },

  textoBotaoDesafios: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },

  card: {
    backgroundColor: cores.cartao,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: cores.borda,
  },

  textoErro: {
    color: cores.texto3,
    textAlign: 'center',
    lineHeight: 20,
  },

  botao: {
    backgroundColor: '#0C75D7',
    padding: 14,
    borderRadius: 9,
    marginTop: 15,
    alignItems: 'center',
  },

  textoBotao: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
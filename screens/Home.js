
import { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
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
} from 'firebase/firestore';

import { auth, db } from '../lib/firebase';
import usePlano from '../hooks/usePlano';
import { iniciais } from '../utils/iniciais';
import { useTema } from '../theme/TemaContext';

const XP_POR_NIVEL = 200;

function paraISO(d) {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function inicioDaSemanaISO() {
  const d = new Date();
  const diasDesdeSegunda = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diasDesdeSegunda);
  return paraISO(d);
}

function diasDesde(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const dataTreino = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((hoje - dataTreino) / 86400000);
}

function textoDias(n) {
  if (n <= 0) return 'Hoje';
  if (n === 1) return 'Ontem';
  return `Há ${n} dias`;
}

function saudacaoDoHorario() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

function nomeDoNivel(nivel) {
  if (nivel >= 20) return 'Lenda';
  if (nivel >= 15) return 'Elite';
  if (nivel >= 10) return 'Avançado';
  if (nivel >= 5) return 'Experiente';
  if (nivel >= 2) return 'Dedicado';
  return 'Iniciante';
}

export default function Home({ navigation }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  const { perfil, plano } = usePlano();

  const [registros, setRegistros] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [xpTotal, setXpTotal] = useState(0);
  const [xpCarregado, setXpCarregado] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregar() {
        const uid = auth.currentUser?.uid;

        if (!uid) {
          if (ativo) {
            setCarregado(true);
            setXpCarregado(true);
          }
          return;
        }

        try {
          const consulta = query(
            collection(db, 'usuarios', uid, 'treinos'),
            orderBy('data', 'desc'),
            limit(60)
          );

          const [resultadoTreinos, resultadoXP] = await Promise.all([
            getDocs(consulta),
            getDoc(
              doc(db, 'usuarios', uid, 'gamificacao', 'perfil')
            ),
          ]);

          if (!ativo) return;

          setRegistros(
            resultadoTreinos.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }))
          );

          if (resultadoXP.exists()) {
            const dadosXP = resultadoXP.data();

            // Compatível com os nomes de campo mais comuns.
            const valorXP =
              dadosXP.xp ??
              dadosXP.xpTotal ??
              dadosXP.totalXP ??
              0;

            setXpTotal(
              Number.isFinite(Number(valorXP))
                ? Math.max(0, Number(valorXP))
                : 0
            );
          } else {
            setXpTotal(0);
          }
        } catch (erro) {
          console.log('Erro ao carregar dados da Home:', erro);
        } finally {
          if (ativo) {
            setCarregado(true);
            setXpCarregado(true);
          }
        }
      }

      setCarregado(false);
      setXpCarregado(false);
      carregar();

      return () => {
        ativo = false;
      };
    }, [])
  );

  const nomeCompleto = perfil?.nome ?? '';
  const nome = nomeCompleto.split(' ')[0] || 'Atleta';

  const finalizados = registros.filter(
    (r) => r.finalizado === true
  );

  const inicioSemana = inicioDaSemanaISO();

  const feitosNaSemana = finalizados.filter(
    (r) => r.data >= inicioSemana
  ).length;

  const metaDias = perfil?.diasTreino ?? plano.dias;

  const progressoMeta =
    metaDias > 0
      ? Math.min(
          100,
          Math.round((feitosNaSemana / metaDias) * 100)
        )
      : 0;

  const metaBatida =
    metaDias > 0 && feitosNaSemana >= metaDias;

  const ultimo = registros.find(
    (r) =>
      r.finalizado === true ||
      Object.values(r.series || {}).some(Boolean)
  );

  const textoUltimo = ultimo
    ? textoDias(diasDesde(ultimo.data))
    : '-';

  const detalheUltimo = ultimo
    ? ultimo.titulo ?? `Treino ${ultimo.treino}`
    : 'Nenhum ainda';

  // Cálculo do nível e da barra de XP.
  const nivelAtual =
    Math.floor(xpTotal / XP_POR_NIVEL) + 1;

  const xpNoNivel = xpTotal % XP_POR_NIVEL;

  const progressoXP = Math.round(
    (xpNoNivel / XP_POR_NIVEL) * 100
  );

  const xpFaltante = XP_POR_NIVEL - xpNoNivel;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.conteudo}
      >
        <View style={styles.topo}>
          <Text style={styles.logo}>GymLife</Text>

          <TouchableOpacity
            style={styles.avatar}
            onPress={() => navigation.navigate('Perfil')}
            activeOpacity={0.8}
          >
            <Text style={styles.textoAvatar}>
              {iniciais(nomeCompleto)}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.saudacao}>
          {saudacaoDoHorario()}, {nome}! 👋
        </Text>

        <Text style={styles.subtitulo}>
          Pronto para superar seus limites?
        </Text>

        <View style={styles.heroi}>
          <Text style={styles.heroiRotulo}>SEU PLANO</Text>

          <Text style={styles.heroiTitulo}>
            {plano.nome}
          </Text>

          <View style={styles.pilulas}>
            {perfil?.objetivo ? (
              <View style={styles.pilula}>
                <Text style={styles.textoPilula}>
                  🎯 {perfil.objetivo}
                </Text>
              </View>
            ) : null}

            <View style={styles.pilula}>
              <Text style={styles.textoPilula}>
                {plano.nivel}
              </Text>
            </View>

            <View style={styles.pilula}>
              <Text style={styles.textoPilula}>
                {plano.dias} dias por semana
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.botaoHeroi}
            onPress={() => navigation.navigate('Treinos')}
            activeOpacity={0.85}
          >
            <Text style={styles.textoBotaoHeroi}>
              COMEÇAR TREINO →
            </Text>
          </TouchableOpacity>
        </View>

        {/* PAINEL DE XP E NÍVEL */}
        <View style={styles.cardXP}>
          <View style={styles.topoXP}>
            <View style={styles.iconeXP}>
              <Text style={styles.raioXP}>⚡</Text>
            </View>

            <View style={styles.infoNivel}>
              <Text style={styles.rotuloXP}>
                SUA EVOLUÇÃO
              </Text>

              <Text style={styles.tituloNivel}>
                Nível {nivelAtual} · {nomeDoNivel(nivelAtual)}
              </Text>
            </View>

            <View style={styles.pilulaXP}>
              <Text style={styles.valorXP}>
                {xpCarregado ? `${xpTotal} XP` : '...'}
              </Text>
            </View>
          </View>

          <View style={styles.linhaProgressoXP}>
            <Text style={styles.textoProgressoXP}>
              Progresso para o próximo nível
            </Text>

            <Text style={styles.porcentagemXP}>
              {xpCarregado ? `${progressoXP}%` : '...'}
            </Text>
          </View>

          <View style={styles.trilhoXP}>
            <View
              style={[
                styles.barraXP,
                {
                  width: xpCarregado
                    ? `${progressoXP}%`
                    : '0%',
                },
              ]}
            />
          </View>

          <Text style={styles.rodapeXP}>
            {xpCarregado
              ? `Faltam ${xpFaltante} XP para o nível ${nivelAtual + 1}`
              : 'Carregando sua evolução...'}
          </Text>
        </View>

        {/* META SEMANAL */}
        <View style={styles.card}>
          <View style={styles.linhaMeta}>
            <Text style={styles.tituloCard}>
              Meta da semana
            </Text>

            <Text style={styles.valorMeta}>
              {feitosNaSemana}
              <Text style={styles.valorMetaTotal}>
                {' '}/ {metaDias}
              </Text>
            </Text>
          </View>

          <View style={styles.trilho}>
            <View
              style={[
                styles.barra,
                { width: `${progressoMeta}%` },
              ]}
            />
          </View>

          <Text style={styles.textoMeta}>
            {metaBatida
              ? 'Meta da semana batida! 🎉'
              : `${feitosNaSemana} de ${metaDias} treinos finalizados esta semana`}
          </Text>
        </View>

        {/* ESTATÍSTICAS */}
        <View style={styles.linhaEstatisticas}>
          <View style={styles.estatistica}>
            <Text style={styles.estatisticaValor}>
              {carregado ? finalizados.length : '-'}
            </Text>

            <Text style={styles.estatisticaRotulo}>
              Treinos finalizados
            </Text>
          </View>

          <View style={styles.estatistica}>
            <Text style={styles.estatisticaValor}>
              {carregado ? textoUltimo : '-'}
            </Text>

            <Text style={styles.estatisticaRotulo}>
              {carregado
                ? `Último: ${detalheUltimo}`
                : 'Último treino'}
            </Text>
          </View>
        </View>

        {/* ATALHOS */}
        <Text style={styles.tituloSecao}>Atalhos</Text>

       <View style={styles.atalhos}>
      <TouchableOpacity
      style={styles.atalho}
      onPress={() => navigation.navigate('Treinos')}
      activeOpacity={0.8}
      >
      <Text style={styles.atalhoIcone}>🏋️</Text>
      <Text style={styles.atalhoTitulo}>Treinos</Text>
      <Text style={styles.atalhoTexto}>
        Séries, cargas e vídeos
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.atalho}
      onPress={() => navigation.navigate('Biblioteca')}
      activeOpacity={0.8}
    >
      <Text style={styles.atalhoIcone}>🎬</Text>
      <Text style={styles.atalhoTitulo}>Biblioteca</Text>
      <Text style={styles.atalhoTexto}>
        Exercícios e demonstrações
    </Text>
  </TouchableOpacity>

    <TouchableOpacity
      style={styles.atalho}
      onPress={() => navigation.navigate('Historico')}
      activeOpacity={0.8}
    >
      <Text style={styles.atalhoIcone}>📈</Text>
      <Text style={styles.atalhoTitulo}>Histórico</Text>
      <Text style={styles.atalhoTexto}>
        Evolução das cargas
      </Text>
    </TouchableOpacity>
  </View>
  
        <Text style={styles.rodape}>
          Disciplina hoje, resultado amanhã!
        </Text>
      </ScrollView>
    </View>
  );
}

const criarEstilos = (cores) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
  },

  conteudo: {
    padding: 24,
    paddingTop: 55,
    paddingBottom: 40,
  },

  topo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  logo: {
    color: '#0C75D7',
    fontSize: 22,
    fontWeight: 'bold',
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0758A4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0C75D7',
  },

  textoAvatar: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },

  saudacao: {
    color: cores.texto,
    fontSize: 28,
    fontWeight: 'bold',
  },

  subtitulo: {
    color: cores.textoSuave,
    fontSize: 15,
    marginTop: 6,
    marginBottom: 24,
  },

  heroi: {
    backgroundColor: '#0758A4',
    borderRadius: 20,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#0C75D7',
  },

  heroiRotulo: {
    color: '#BFDBFE',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  heroiTitulo: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 14,
  },

  pilulas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },

  pilula: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },

  textoPilula: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  botaoHeroi: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },

  textoBotaoHeroi: {
    color: '#0758A4',
    fontWeight: 'bold',
    fontSize: 15,
  },

  // Estilos do painel de gamificação
  cardXP: {
    backgroundColor: cores.cartao,
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#0758A4',
  },

  topoXP: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    gap: 12,
  },

  iconeXP: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#0758A4',
    justifyContent: 'center',
    alignItems: 'center',
  },

  raioXP: {
    fontSize: 23,
    color: '#FFFFFF',
  },

  infoNivel: {
    flex: 1,
  },

  rotuloXP: {
    color: cores.textoSuave,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    marginBottom: 5,
  },

  tituloNivel: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: 'bold',
  },

  pilulaXP: {
    backgroundColor: '#0758A4',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
  },

  valorXP: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  linhaProgressoXP: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },

  textoProgressoXP: {
    color: cores.texto3,
    fontSize: 12,
    flex: 1,
  },

  porcentagemXP: {
    color: cores.acento,
    fontSize: 13,
    fontWeight: 'bold',
  },

  trilhoXP: {
    height: 8,
    backgroundColor: cores.borda,
    borderRadius: 10,
    overflow: 'hidden',
  },

  barraXP: {
    height: '100%',
    backgroundColor: '#0C75D7',
    borderRadius: 10,
  },

  rodapeXP: {
    color: cores.textoSuave,
    fontSize: 12,
    marginTop: 11,
  },

  // Meta semanal
  card: {
    backgroundColor: cores.cartao,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: cores.borda,
  },

  linhaMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  tituloCard: {
    color: cores.texto,
    fontSize: 17,
    fontWeight: 'bold',
  },

  valorMeta: {
    color: cores.texto,
    fontSize: 24,
    fontWeight: 'bold',
  },

  valorMetaTotal: {
    color: cores.textoSuave,
    fontSize: 16,
    fontWeight: '600',
  },

  trilho: {
    height: 8,
    backgroundColor: cores.borda,
    borderRadius: 10,
    overflow: 'hidden',
  },

  barra: {
    height: '100%',
    backgroundColor: '#0C75D7',
    borderRadius: 10,
  },

  textoMeta: {
    color: cores.texto3,
    fontSize: 13,
    marginTop: 12,
  },

  linhaEstatisticas: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },

  estatistica: {
    flex: 1,
    backgroundColor: cores.cartao,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: cores.borda,
  },

  estatisticaValor: {
    color: cores.texto,
    fontSize: 22,
    fontWeight: 'bold',
  },

  estatisticaRotulo: {
    color: cores.textoSuave,
    fontSize: 12,
    marginTop: 6,
  },

  tituloSecao: {
    color: cores.texto,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 14,
  },
 
 atalhos: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 12,
 },

 atalho: {
  width: '48%',
  flexGrow: 1,
  backgroundColor: cores.cartao,
  borderRadius: 16,
  padding: 16,
  borderWidth: 1,
  borderColor: cores.borda,
 },


  atalhoIcone: {
    fontSize: 28,
    marginBottom: 12,
  },

  atalhoTitulo: {
    color: cores.texto,
    fontSize: 17,
    fontWeight: 'bold',
  },

  atalhoTexto: {
    color: cores.textoSuave,
    fontSize: 12,
    marginTop: 4,
  },

  rodape: {
    color: cores.textoMudo,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 30,
  },
});

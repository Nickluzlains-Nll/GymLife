import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTema } from '../theme/TemaContext';
import { useTopo } from '../theme/layout';
import { CORES_CLARO, CORES_ESCURO } from '../theme/cores';

import {
  carregarPreferencias,
  salvarPreferencias,
  PREFERENCIAS_PADRAO,
} from '../utils/preferencias';

const OPCOES_TEMA = [
  {
    id: 'sistema',
    titulo: 'Automático',
    descricao: 'Acompanha o tema do seu celular',
    icone: 'phone-portrait-outline',
  },
  {
    id: 'claro',
    titulo: 'Claro',
    descricao: 'Fundo claro, ótimo de dia',
    icone: 'sunny-outline',
  },
  {
    id: 'escuro',
    titulo: 'Escuro',
    descricao: 'Fundo escuro, confortável à noite',
    icone: 'moon-outline',
  },
];

// Miniatura de uma tela do app com as cores de um tema.
function MiniTela({ paleta }) {
  return (
    <View style={[miniatura.tela, { backgroundColor: paleta.fundo }]}>
      <View
        style={[miniatura.titulo, { backgroundColor: paleta.texto }]}
      />

      <View
        style={[
          miniatura.cartao,
          {
            backgroundColor: paleta.cartao,
            borderColor: paleta.borda,
          },
        ]}
      >
        <View
          style={[
            miniatura.linha,
            { backgroundColor: paleta.textoSuave },
          ]}
        />

        <View
          style={[
            miniatura.linha,
            { backgroundColor: paleta.textoSuave, width: '55%' },
          ]}
        />
      </View>

      <View style={miniatura.botao} />
    </View>
  );
}

function PreviaTema({ id }) {
  return (
    <View style={miniatura.moldura}>
      {id === 'sistema' ? (
        <View style={miniatura.dividida}>
          <MiniTela paleta={CORES_ESCURO} />
          <MiniTela paleta={CORES_CLARO} />
        </View>
      ) : (
        <MiniTela
          paleta={id === 'claro' ? CORES_CLARO : CORES_ESCURO}
        />
      )}
    </View>
  );
}

export default function Aparencia({ navigation }) {
  const { cores, modo, definirModo } = useTema();
  const espacoTopo = useTopo();
  const styles = useMemo(
    () => criarEstilos(cores, espacoTopo),
    [cores, espacoTopo]
  );

  const [feedbackTatil, setFeedbackTatil] = useState(
    PREFERENCIAS_PADRAO.feedbackTatil
  );

  useEffect(() => {
    carregarPreferencias().then((prefs) =>
      setFeedbackTatil(prefs.feedbackTatil)
    );
  }, []);

  function escolherTema(id) {
    if (id === modo) return;

    definirModo(id);

    if (feedbackTatil) {
      Haptics.selectionAsync().catch(() => {});
    }
  }

  async function alterarFeedbackTatil(valor) {
    setFeedbackTatil(valor);
    await salvarPreferencias({ feedbackTatil: valor });

    // Pequena vibração só para mostrar o efeito ao ativar.
    if (valor) {
      Haptics.selectionAsync().catch(() => {});
    }
  }

  function restaurarPadroes() {
    Alert.alert(
      'Restaurar padrões',
      'Voltar o tema e as preferências visuais para o padrão do GymLife?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: async () => {
            definirModo(PREFERENCIAS_PADRAO.tema);
            setFeedbackTatil(PREFERENCIAS_PADRAO.feedbackTatil);

            await salvarPreferencias({
              tema: PREFERENCIAS_PADRAO.tema,
              feedbackTatil: PREFERENCIAS_PADRAO.feedbackTatil,
            });
          },
        },
      ]
    );
  }

  const temaAtual = OPCOES_TEMA.find((t) => t.id === modo);

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

        <Text style={styles.etiqueta}>GYMLIFE • PERSONALIZAÇÃO</Text>
        <Text style={styles.titulo}>Aparência</Text>
        <Text style={styles.subtitulo}>
          Escolha como o GymLife aparece para você. A mudança é aplicada
          na hora.
        </Text>

        <Text style={styles.secao}>TEMA</Text>

        <View style={styles.linhaTemas}>
          {OPCOES_TEMA.map((tema) => {
            const selecionado = modo === tema.id;

            return (
              <TouchableOpacity
                key={tema.id}
                style={[
                  styles.cartaoTema,
                  selecionado && styles.cartaoTemaAtivo,
                ]}
                onPress={() => escolherTema(tema.id)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: selecionado }}
              >
                <PreviaTema id={tema.id} />

                <View style={styles.rodapeTema}>
                  <Ionicons
                    name={
                      selecionado
                        ? 'checkmark-circle'
                        : 'ellipse-outline'
                    }
                    size={16}
                    color={
                      selecionado ? cores.acento : cores.textoMudo
                    }
                  />

                  <Text
                    style={[
                      styles.textoTema,
                      selecionado && { color: cores.acento },
                    ]}
                  >
                    {tema.titulo}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.descricaoTema}>
          {temaAtual?.descricao}
        </Text>

        <Text style={styles.secao}>INTERAÇÃO</Text>

        <View style={styles.linhaOpcao}>
          <Ionicons
            name="phone-portrait-outline"
            size={18}
            color={cores.acento}
          />

          <View style={styles.textosOpcao}>
            <Text style={styles.tituloOpcao}>Feedback tátil</Text>
            <Text style={styles.descricaoOpcao}>
              Vibração leve quando o timer de descanso termina.
            </Text>
          </View>

          <Switch
            value={feedbackTatil}
            onValueChange={alterarFeedbackTatil}
            trackColor={{ false: cores.borda, true: '#0758A4' }}
            thumbColor={feedbackTatil ? '#FFFFFF' : cores.textoSuave}
          />
        </View>

        <TouchableOpacity
          style={styles.botaoRestaurar}
          onPress={restaurarPadroes}
          activeOpacity={0.7}
        >
          <Ionicons
            name="refresh-outline"
            size={16}
            color={cores.textoSuave}
          />

          <Text style={styles.textoRestaurar}>
            Restaurar padrões
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// Miniaturas usam as paletas fixas de cada tema (não mudam com o tema atual).
const miniatura = StyleSheet.create({
  moldura: {
    height: 86,
    borderRadius: 9,
    overflow: 'hidden',
  },

  tela: {
    flex: 1,
    padding: 7,
    gap: 5,
  },

  dividida: {
    flexDirection: 'row',
    flex: 1,
  },

  titulo: {
    height: 5,
    width: '45%',
    borderRadius: 3,
  },

  cartao: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 5,
    padding: 5,
    gap: 4,
  },

  linha: {
    height: 3,
    width: '85%',
    borderRadius: 2,
    opacity: 0.8,
  },

  botao: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0C75D7',
  },
});

const criarEstilos = (cores, espacoTopo) => StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundoProfundo },

  conteudo: {
    padding: 22,
    paddingTop: espacoTopo,
    paddingBottom: 45,
  },

  voltar: { alignSelf: 'flex-start', marginBottom: 25 },
  textoVoltar: { color: cores.texto3, fontSize: 16 },

  etiqueta: {
    color: cores.acento,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 9,
  },

  titulo: {
    color: cores.textoPerfil,
    fontSize: 28,
    fontWeight: 'bold',
  },

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

  linhaTemas: {
    flexDirection: 'row',
    gap: 8,
  },

  cartaoTema: {
    flex: 1,
    backgroundColor: cores.cartaoPerfil,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: cores.bordaPerfil,
    padding: 7,
    gap: 8,
  },

  cartaoTemaAtivo: {
    borderColor: cores.acento,
  },

  rodapeTema: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingBottom: 3,
  },

  textoTema: {
    color: cores.textoPerfil,
    fontSize: 12,
    fontWeight: '600',
  },

  descricaoTema: {
    color: cores.textoSuave,
    fontSize: 12,
    marginTop: 10,
    marginBottom: 28,
    textAlign: 'center',
  },

  linhaOpcao: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.cartaoPerfil,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },

  textosOpcao: { flex: 1 },

  tituloOpcao: {
    color: cores.textoPerfil,
    fontSize: 14,
    fontWeight: '600',
  },

  descricaoOpcao: {
    color: cores.textoSuave,
    fontSize: 11,
    marginTop: 3,
  },

  botaoRestaurar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 26,
    paddingVertical: 10,
  },

  textoRestaurar: {
    color: cores.textoSuave,
    fontSize: 12,
    fontWeight: '500',
  },
});

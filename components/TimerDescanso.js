
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { carregarPreferencias } from '../utils/preferencias';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useTema } from '../theme/TemaContext';

const formatarTempo = (segundos) => {
  const minutos = Math.floor(segundos / 60);
  const segundosRestantes = segundos % 60;

  return `${String(minutos).padStart(2, '0')}:${String(
    segundosRestantes
  ).padStart(2, '0')}`;
};

export default function TimerDescanso({ gatilho = 0 }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  const [visivel, setVisivel] = useState(false);
  const [minimizado, setMinimizado] = useState(false);

  const [tempoPersonalizado, setTempoPersonalizado] = useState('60');
  const [tempoRestante, setTempoRestante] = useState(60);

  const [ativo, setAtivo] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [existeTimer, setExisteTimer] = useState(false);

  const [fimEm, setFimEm] = useState(null);

  const gatilhoAnterior = useRef(gatilho);
  const avisoDisparado = useRef(false);
  const [iniciado, setIniciado] = useState(false);

  // Inicia o cronômetro
  const iniciarTimer = useCallback((segundos) => {
    const tempo = Number(segundos);

    if (
      !Number.isInteger(tempo) ||
      tempo < 1 ||
      tempo > 3600
    ) {
      Alert.alert(
        'Tempo inválido',
        'Digite um tempo entre 1 e 3600 segundos.'
      );
      return;
    }

    Keyboard.dismiss();

    avisoDisparado.current = false;

    setTempoPersonalizado(String(tempo));
    setTempoRestante(tempo);
    setFimEm(Date.now() + tempo * 1000);

    setAtivo(true);
    setConcluido(false);
    setExisteTimer(true);

    setMinimizado(false);
    setVisivel(true);
    setIniciado(true);
  }, []);

  // Apenas mostra o botão flutuante quando uma série é concluída
useEffect(() => {
  if (gatilho > gatilhoAnterior.current) {
    setTempoPersonalizado('60');
    setTempoRestante(60);

    setAtivo(false);
    setIniciado(false);
    setConcluido(false);

    setFimEm(null);
    setExisteTimer(true);

    // Não abre a janela e não inicia a contagem
    setVisivel(false);
    setMinimizado(true);

    avisoDisparado.current = false;
  }

  gatilhoAnterior.current = gatilho;
}, [gatilho]);

  // Atualiza o cronômetro
  useEffect(() => {
    if (!ativo || !fimEm) return;

    const intervalo = setInterval(() => {
      const restante = Math.max(
        0,
        Math.ceil((fimEm - Date.now()) / 1000)
      );

      setTempoRestante(restante);

      if (restante <= 0) {
        setAtivo(false);
        setConcluido(true);
        setFimEm(null);

       if (!avisoDisparado.current) {
      avisoDisparado.current = true;

      carregarPreferencias().then((prefs) => {
        if (prefs.feedbackTatil) {
          Haptics.impactAsync(
            Haptics.ImpactFeedbackStyle.Light
          ).catch(() => {});
        }
      });
        }
      }
    }, 250);

    return () => clearInterval(intervalo);
  }, [ativo, fimEm]);

  // Pausa o cronômetro
  const pausarTimer = () => {
    setAtivo(false);
    setFimEm(null);
  };

  // Continua o cronômetro
  const continuarTimer = () => {
    if (tempoRestante <= 0) return;

    setFimEm(Date.now() + tempoRestante * 1000);
    setAtivo(true);
    setConcluido(false);
    setIniciado(true);
    avisoDisparado.current = false;
  };

  // Minimiza e mostra o botão flutuante
  const minimizarTimer = () => {
    Keyboard.dismiss();
    setVisivel(false);
    setMinimizado(true);
  };

  // Abre novamente o cronômetro
  const abrirTimer = () => {
    setMinimizado(false);
    setVisivel(true);
  };

  // Encerra completamente o descanso
  const encerrarTimer = () => {
    Keyboard.dismiss();

    setAtivo(false);
    setFimEm(null);
    setTempoRestante(0);
    setIniciado(false);
    setConcluido(false);
    setExisteTimer(false);
    setMinimizado(false);
    setVisivel(false);

    avisoDisparado.current = false;
  };

  // Inicia o tempo digitado
  const aplicarTempoPersonalizado = () => {
    Keyboard.dismiss();
    iniciarTimer(tempoPersonalizado);
  };

  return (
    <>
      {/* Janela principal do cronômetro */}
      <Modal
        visible={visivel}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={minimizarTimer}
      >
        <KeyboardAvoidingView
          style={styles.modalArea}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <Text style={styles.titulo}>
                ⏱️ Tempo de descanso
              </Text>

              <Text style={styles.subtitulo}>
                Recupere suas energias para a próxima série!
              </Text>

              {/* Tempo restante */}
              <Text
                style={[
                  styles.cronometro,
                  concluido && styles.cronometroConcluido,
                ]}
              >
                {formatarTempo(tempoRestante)}
              </Text>

              <Text style={styles.status}>
               {concluido
                ? 'Descanso concluído!'
                : ativo
                ? 'Descansando...'
                : iniciado
                ? 'Cronômetro pausado'
                : 'Escolha o tempo para começar'}
              </Text>

              {/* Tempos predefinidos */}
              <Text style={styles.rotulo}>
                Escolha o tempo de descanso
              </Text>

              <View style={styles.presets}>
                {[
                  { nome: '30s', valor: 30 },
                  { nome: '1 min', valor: 60 },
                  { nome: '1:30', valor: 90 },
                  { nome: '2 min', valor: 120 },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.valor}
                    style={styles.botaoPreset}
                   onPress={() => {
                    setTempoPersonalizado(String(item.valor));
                    setTempoRestante(item.valor);
                    setAtivo(false);
                    setIniciado(false);
                    setConcluido(false);
                    setFimEm(null);
                    }}
                  >
                    <Text style={styles.textoPreset}>
                      {item.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tempo personalizado */}
              <Text style={styles.rotulo}>
                Ou digite o tempo em segundos
              </Text>

              <TextInput
                style={styles.input}
                value={tempoPersonalizado}
                onChangeText={setTempoPersonalizado}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="Ex: 60"
                placeholderTextColor={cores.texto8}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />

              {/* Botão para fechar o teclado do celular */}
              <TouchableOpacity
                style={styles.botaoFecharTeclado}
                onPress={Keyboard.dismiss}
              >
                <Text style={styles.textoFecharTeclado}>
                  Fechar teclado
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botaoIniciar}
                onPress={() => iniciarTimer(tempoPersonalizado)}
                >
                <Text style={styles.textoBotaoIniciar}>
                    Iniciar descanso
                </Text>
              </TouchableOpacity>


              {/* Controles do cronômetro */}
              <View style={styles.acoes}>
                {iniciado && !concluido && (
                 <TouchableOpacity
                    style={styles.botaoPausar}
                    onPress={ativo ? pausarTimer : continuarTimer}
                >
                    <Text style={styles.textoBotao}>
                    {ativo ? 'Pausar' : 'Continuar'}
                    </Text>
                </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.botaoMinimizar}
                  onPress={minimizarTimer}
                >
                  <Text style={styles.textoBotao}>
                    Minimizar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botaoEncerrar}
                  onPress={encerrarTimer}
                >
                  <Text style={styles.textoBotao}>
                    {concluido ? 'Concluir' : 'Pular'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Botão flutuante no canto superior direito */}
      {minimizado && existeTimer && (
        <TouchableOpacity
          style={[
            styles.botaoFlutuante,
            concluido && styles.botaoFlutuanteConcluido,
          ]}
          onPress={abrirTimer}
          activeOpacity={0.8}
        >

          <Text style={styles.iconeFlutuante}>
            ⏱
          </Text>

          <View>
            <Text style={styles.rotuloFlutuante}>
              {concluido ? 'CONCLUÍDO' : 'DESCANSO'}
            </Text>

            <Text
              style={[
                styles.tempoFlutuante,
                concluido && styles.tempoFlutuanteConcluido,
              ]}
            >
              {formatarTempo(tempoRestante)}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </>
  );
}

const criarEstilos = (cores) => StyleSheet.create({
  modalArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
  },

  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },

  card: {
    backgroundColor: cores.cartao,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: cores.borda,
  },

  titulo: {
    color: cores.texto,
    fontSize: 23,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  subtitulo: {
    color: cores.texto7,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },

  cronometro: {
    color: cores.acento,
    fontSize: 58,
    fontWeight: 'bold',
    marginTop: 8,
  },

  cronometroConcluido: {
    color: cores.verde,
  },

  status: {
    color: cores.texto7,
    fontSize: 14,
    marginBottom: 22,
  },

  rotulo: {
    color: cores.texto,
    fontSize: 14,
    alignSelf: 'flex-start',
    marginBottom: 10,
    marginTop: 8,
  },

  presets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
    gap: 7,
  },

  botaoPreset: {
    flex: 1,
    backgroundColor: '#0758A4',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  textoPreset: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },

  input: {
    backgroundColor: cores.fundo,
    color: cores.texto,
    width: '100%',
    borderRadius: 10,
    padding: 13,
    fontSize: 18,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: cores.borda2,
  },

  botaoFecharTeclado: {
    alignSelf: 'flex-end',
    paddingVertical: 10,
  },

  textoFecharTeclado: {
    color: cores.acento,
    fontSize: 13,
    fontWeight: '600',
  },

  botaoIniciar: {
    backgroundColor: '#0758A4',
    width: '100%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 5,
  },

  textoBotaoIniciar: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },

  acoes: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginTop: 18,
  },

  botaoPausar: {
    flex: 1,
    backgroundColor: '#404040',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  botaoMinimizar: {
    flex: 1,
    backgroundColor: '#0758A4',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  botaoEncerrar: {
    flex: 1,
    backgroundColor: '#991B1B',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  textoBotao: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },

  // Botão flutuante
  botaoFlutuante: {
    position: 'absolute',
    top: 60,
    right: 15,
    zIndex: 9999,
    elevation: 12,

    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0758A4',

    paddingHorizontal: 13,
    paddingVertical: 10,

    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#60A5FA',

    gap: 9,
  },

  iconeFlutuante: {
    fontSize: 25,
    color: '#FFFFFF',
  },

  rotuloFlutuante: {
    color: '#DDEEFF',
    fontSize: 9,
    fontWeight: 'bold',
  },

  tempoFlutuante: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },

  botaoFlutuanteConcluido: {
  backgroundColor: '#14532D',
  borderColor: '#4ADE80',
},

  tempoFlutuanteConcluido: {
  color: '#4ADE80',
},
});

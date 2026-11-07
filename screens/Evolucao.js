import { useState, useCallback, useMemo } from 'react';

import {
  ActivityIndicator,
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

import { auth, db } from '../lib/firebase';
import GraficoCarga from '../components/GraficosCarga';
import { useTema } from '../theme/TemaContext';
import { useTopo } from '../theme/layout';

function dataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

function formatarData(data) {
  if (!data) return '-';

  const [ano, mes, dia] = data.split('-');

  return `${dia}/${mes}/${ano}`;
}

function converterNumero(valor) {
  if (!valor || !valor.trim()) return null;

  const numero = Number(valor.replace(',', '.'));

  return Number.isFinite(numero) && numero > 0
    ? numero
    : null;
}

function formatarMedida(valor) {
  if (valor == null) return '-';

  return String(valor).replace('.', ',');
}

export default function Evolucao({ navigation }) {
  const { cores } = useTema();
  const espacoTopo = useTopo();
  const styles = useMemo(
    () => criarEstilos(cores, espacoTopo),
    [cores, espacoTopo]
  );

  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(false);

  const [peso, setPeso] = useState('');
  const [cintura, setCintura] = useState('');
  const [peito, setPeito] = useState('');
  const [braco, setBraco] = useState('');
  const [quadril, setQuadril] = useState('');
  const [coxa, setCoxa] = useState('');

  const uid = auth.currentUser?.uid;

  const carregarMedidas = useCallback(async () => {
    if (!uid) {
      setRegistros([]);
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      setErro(false);

      const consulta = query(
        collection(db, 'usuarios', uid, 'medidas'),
        orderBy('data', 'desc'),
        limit(100)
      );

      const resultado = await getDocs(consulta);

      const dados = resultado.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      setRegistros(dados);
    } catch (e) {
      console.log('Erro ao carregar medidas:', e);
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      carregarMedidas();
    }, [carregarMedidas])
  );

  async function salvarMedidas() {
    if (!uid) {
      Alert.alert('Erro', 'Você precisa estar conectado para salvar suas medidas.');
      return;
    }

    const medidas = {
      peso: converterNumero(peso),
      cintura: converterNumero(cintura),
      peito: converterNumero(peito),
      braco: converterNumero(braco),
      quadril: converterNumero(quadril),
      coxa: converterNumero(coxa),
    };

    const preenchidas = Object.values(medidas).filter(
      (valor) => valor !== null
    );

    if (preenchidas.length === 0) {
      Alert.alert(
        'Atenção',
        'Preencha pelo menos uma medida antes de salvar.'
      );
      return;
    }

    // Impede salvar um campo preenchido com valor inválido.
    const campos = [
      { valor: peso, numero: medidas.peso, nome: 'Peso' },
      { valor: cintura, numero: medidas.cintura, nome: 'Cintura' },
      { valor: peito, numero: medidas.peito, nome: 'Peito' },
      { valor: braco, numero: medidas.braco, nome: 'Braço' },
      { valor: quadril, numero: medidas.quadril, nome: 'Quadril' },
      { valor: coxa, numero: medidas.coxa, nome: 'Coxa' },
    ];

    const invalido = campos.find(
      (campo) => campo.valor.trim() !== '' && campo.numero === null
    );

    if (invalido) {
      Alert.alert(
        'Valor inválido',
        `Confira o valor informado para ${invalido.nome}.`
      );
      return;
    }

    try {
      setSalvando(true);
      Keyboard.dismiss();

      const lote = writeBatch(db);

      const referenciaMedida = doc(
        collection(db, 'usuarios', uid, 'medidas')
      );

      lote.set(referenciaMedida, {
        ...medidas,
        data: dataISO(new Date()),
        criadoEm: serverTimestamp(),
      });

      // Mantém o peso atual do perfil sincronizado.
      if (medidas.peso !== null) {
        lote.set(
          doc(db, 'usuarios', uid),
          {
            peso: medidas.peso,
            atualizadoEm: serverTimestamp(),
          },
          { merge: true }
        );
      }

      await lote.commit();

      setPeso('');
      setCintura('');
      setPeito('');
      setBraco('');
      setQuadril('');
      setCoxa('');

      await carregarMedidas();

      Alert.alert(
        'Medidas salvas!',
        'Seu registro foi adicionado à sua evolução física.'
      );
    } catch (e) {
      console.log('Erro ao salvar medidas:', e);

      Alert.alert(
        'Erro',
        'Não foi possível salvar suas medidas. Verifique sua conexão e tente novamente.'
      );
    } finally {
      setSalvando(false);
    }
  }

  const registrosPeso = registros
    .filter(
      (registro) =>
        typeof registro.peso === 'number' &&
        Number.isFinite(registro.peso)
    )
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  const primeiroPeso =
    registrosPeso.length > 0
      ? registrosPeso[0].peso
      : null;

  const ultimoPeso =
    registrosPeso.length > 0
      ? registrosPeso[registrosPeso.length - 1].peso
      : null;

  const variacao =
    registrosPeso.length > 1
      ? ultimoPeso - primeiroPeso
      : null;

  const pontosPeso = registrosPeso.slice(-12).map((registro) => ({
    data: registro.data,
    valor: registro.peso,
  }));

  const ultimaMedida = registros[0] ?? null;

  function renderCampo(rotulo, valor, alterar, unidade) {
    return (
      <View style={styles.campo}>
        <Text style={styles.rotuloCampo}>{rotulo}</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={valor}
            onChangeText={alterar}
            keyboardType="decimal-pad"
            placeholder="0,0"
            placeholderTextColor={cores.textoMudo}
            maxLength={7}
          />

          <Text style={styles.unidade}>{unidade}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.voltar}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Evolução física</Text>

        <Text style={styles.subtitulo}>
          Registre suas medidas e acompanhe suas mudanças ao longo do tempo.
        </Text>

        {/* RESUMO DO PESO */}
        <Text style={styles.tituloSecao}>Seu peso</Text>

        <View style={styles.resumoContainer}>
          <View style={styles.resumoItem}>
            <Text style={styles.resumoRotulo}>Peso atual</Text>

            <Text style={styles.resumoValor}>
              {ultimoPeso !== null
                ? `${formatarMedida(ultimoPeso)} kg`
                : '--'}
            </Text>
          </View>

          <View style={styles.divisor} />

          <View style={styles.resumoItem}>
            <Text style={styles.resumoRotulo}>Variação</Text>

            <Text
              style={[
                styles.resumoValor,
                variacao !== null && styles.valorVariacao,
              ]}
            >
              {variacao !== null
                ? `${variacao > 0 ? '+' : ''}${formatarMedida(
                    Math.round(variacao * 10) / 10
                  )} kg`
                : '--'}
            </Text>
          </View>
        </View>

        <Text style={styles.dicaResumo}>
          A variação compara o primeiro registro com o mais recente. Ela não representa, por si só, uma avaliação de saúde ou desempenho.
        </Text>

        {/* GRÁFICO */}
        <Text style={styles.tituloSecao}>Histórico do peso</Text>

        <View style={styles.card}>
          {pontosPeso.length > 0 ? (
            <>
              <GraficoCarga pontos={pontosPeso} />

              {pontosPeso.length === 1 && (
                <Text style={styles.dica}>
                  Registre seu peso em outra data para começar a visualizar a evolução.
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.textoVazio}>
              Você ainda não possui registros de peso. Adicione sua primeira medição abaixo.
            </Text>
          )}
        </View>

        {/* FORMULÁRIO */}
        <Text style={styles.tituloSecao}>Registrar medidas</Text>

        <View style={styles.card}>
          <Text style={styles.descricaoCard}>
            Preencha os campos que desejar. Todas as medidas são opcionais, mas é necessário preencher pelo menos uma.
          </Text>

          <View style={styles.gradeCampos}>
            {renderCampo('Peso', peso, setPeso, 'kg')}
            {renderCampo('Cintura', cintura, setCintura, 'cm')}
            {renderCampo('Peito', peito, setPeito, 'cm')}
            {renderCampo('Braço', braco, setBraco, 'cm')}
            {renderCampo('Quadril', quadril, setQuadril, 'cm')}
            {renderCampo('Coxa', coxa, setCoxa, 'cm')}
          </View>

          <TouchableOpacity
            style={[
              styles.botaoSalvar,
              salvando && styles.botaoDesativado,
            ]}
            onPress={salvarMedidas}
            disabled={salvando}
            activeOpacity={0.85}
          >
            {salvando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.textoBotaoSalvar}>
                SALVAR MEDIDAS
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* HISTÓRICO DE MEDIDAS */}
        <Text style={styles.tituloSecao}>Registros anteriores</Text>

        {carregando ? (
          <ActivityIndicator
            color="#0c75d7"
            size="large"
            style={{ marginTop: 20 }}
          />
        ) : erro ? (
          <View style={styles.card}>
            <Text style={styles.textoVazio}>
              Não foi possível carregar suas medidas. Verifique sua conexão e tente novamente.
            </Text>

            <TouchableOpacity
              style={styles.botaoRecarregar}
              onPress={carregarMedidas}
            >
              <Text style={styles.textoRecarregar}>TENTAR NOVAMENTE</Text>
            </TouchableOpacity>
          </View>
        ) : registros.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.textoVazio}>
              Nenhuma medida registrada ainda.
            </Text>
          </View>
        ) : (
          registros.map((registro) => {
            const itens = [
              { nome: 'Peso', valor: registro.peso, unidade: 'kg' },
              { nome: 'Cintura', valor: registro.cintura, unidade: 'cm' },
              { nome: 'Peito', valor: registro.peito, unidade: 'cm' },
              { nome: 'Braço', valor: registro.braco, unidade: 'cm' },
              { nome: 'Quadril', valor: registro.quadril, unidade: 'cm' },
              { nome: 'Coxa', valor: registro.coxa, unidade: 'cm' },
            ].filter((item) => item.valor !== null && item.valor !== undefined);

            return (
              <View key={registro.id} style={styles.cardRegistro}>
                <Text style={styles.dataRegistro}>
                  {formatarData(registro.data)}
                </Text>

                <View style={styles.medidasRegistro}>
                  {itens.map((item) => (
                    <View key={item.nome} style={styles.itemMedida}>
                      <Text style={styles.nomeMedida}>
                        {item.nome}
                      </Text>

                      <Text style={styles.valorMedida}>
                        {formatarMedida(item.valor)} {item.unidade}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}

        {ultimaMedida && (
          <Text style={styles.rodape}>
            Último registro: {formatarData(ultimaMedida.data)}
          </Text>
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
    paddingBottom: 45,
  },

  voltar: {
    color: '#0c75d7',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 20,
  },

  titulo: {
    color: cores.texto,
    fontSize: 30,
    fontWeight: 'bold',
  },

  subtitulo: {
    color: cores.textoSuave,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    marginBottom: 20,
  },

  tituloSecao: {
    color: cores.texto,
    fontSize: 19,
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 12,
  },

  resumoContainer: {
    flexDirection: 'row',
    backgroundColor: cores.cartao,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: cores.borda,
    paddingVertical: 20,
  },

  resumoItem: {
    flex: 1,
    alignItems: 'center',
  },

  resumoRotulo: {
    color: cores.textoSuave,
    fontSize: 13,
    marginBottom: 8,
  },

  resumoValor: {
    color: cores.texto,
    fontSize: 23,
    fontWeight: 'bold',
  },

  valorVariacao: {
    color: cores.acento,
  },

  divisor: {
    width: 1,
    backgroundColor: cores.borda,
  },

  dicaResumo: {
    color: cores.textoMudo,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 10,
  },

  card: {
    backgroundColor: cores.cartao,
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: cores.borda,
    marginBottom: 12,
  },

  descricaoCard: {
    color: cores.textoSuave,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },

  gradeCampos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  campo: {
    width: '48%',
    marginBottom: 15,
  },

  rotuloCampo: {
    color: cores.texto3,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.fundo,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 10,
    paddingHorizontal: 11,
  },

  input: {
    flex: 1,
    color: cores.texto,
    fontSize: 16,
    paddingVertical: 12,
  },

  unidade: {
    color: cores.textoMudo,
    fontSize: 12,
    marginLeft: 5,
  },

  botaoSalvar: {
    backgroundColor: '#0c75d7',
    paddingVertical: 15,
    borderRadius: 11,
    alignItems: 'center',
    marginTop: 5,
  },

  botaoDesativado: {
    opacity: 0.6,
  },

  textoBotaoSalvar: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },

  textoVazio: {
    color: cores.textoSuave,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: 12,
  },

  dica: {
    color: cores.textoSuave,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 12,
  },

  cardRegistro: {
    backgroundColor: cores.cartao,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: cores.borda,
  },

  dataRegistro: {
    color: cores.acento,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 13,
  },

  medidasRegistro: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
  },

  itemMedida: {
    width: '33.33%',
  },

  nomeMedida: {
    color: cores.textoSuave,
    fontSize: 11,
    marginBottom: 4,
  },

  valorMedida: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '600',
  },

  botaoRecarregar: {
    alignItems: 'center',
    padding: 10,
  },

  textoRecarregar: {
    color: cores.acento,
    fontSize: 12,
    fontWeight: 'bold',
  },

  rodape: {
    color: cores.textoMudo,
    textAlign: 'center',
    fontSize: 11,
    marginTop: 8,
  },
});
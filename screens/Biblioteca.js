
import React, { useEffect, useMemo, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoView, useVideoPlayer } from 'expo-video';

import { auth } from '../lib/firebase';
import { exercicios } from '../data/exercicios';
import { useTema } from '../theme/TemaContext';
import { useTopo } from '../theme/layout';

const CATEGORIAS = [
  'Todos',
  'Favoritos',
  'Peito',
  'Ombros',
  'Tríceps',
  'Costas',
  'Bíceps',
  'Trapézio',
  'Pernas',
  'Glúteos',
  'Abdômen',
];

const GRUPOS = {
  a1: 'Peito',
  a2: 'Peito',
  a3: 'Peito',
  a4: 'Ombros',
  a5: 'Tríceps',
  a6: 'Ombros',
  a7: 'Ombros',
  a8: 'Peito',
  a9: 'Peito',
  a10: 'Peito',
  a11: 'Peito',
  a12: 'Peito',
  a13: 'Peito',
  a14: 'Ombros',
  a15: 'Ombros',
  a16: 'Ombros',
  a17: 'Tríceps',
  a18: 'Tríceps',
  a19: 'Tríceps',
  a20: 'Tríceps',
  a21: 'Peito',
  a22: 'Tríceps',
  a23: 'Tríceps',
  a24: 'Tríceps',
  a25: 'Tríceps',
  a26: 'Tríceps',

  b1: 'Costas',
  b2: 'Costas',
  b3: 'Costas',
  b4: 'Bíceps',
  b5: 'Bíceps',
  b6: 'Trapézio',
  b7: 'Trapézio',
  b8: 'Costas',
  b9: 'Costas',
  b10: 'Costas',
  b11: 'Costas',
  b12: 'Bíceps',
  b13: 'Bíceps',
  b14: 'Bíceps',
  b15: 'Bíceps',
  b16: 'Bíceps',
  b17: 'Trapézio',
  b18: 'Trapézio',
  b19: 'Trapézio',
  b20: 'Bíceps',
  b21: 'Bíceps',
  b22: 'Bíceps',
  b23: 'Costas',
  b24: 'Costas',
  b25: 'Costas',

  c1: 'Pernas',
  c2: 'Pernas',
  c3: 'Pernas',
  c4: 'Pernas',
  c5: 'Pernas',
  c6: 'Pernas',
  c7: 'Pernas',
  c8: 'Abdômen',
  c9: 'Pernas',
  c10: 'Glúteos',
  c11: 'Glúteos',
  c12: 'Glúteos',
  c13: 'Pernas',
  c14: 'Glúteos',
  c15: 'Abdômen',
  c16: 'Abdômen',
  c17: 'Abdômen',
  c18: 'Abdômen',
  c19: 'Glúteos',
  c20: 'Pernas',
};

function normalizar(texto = '') {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function VideoExercicio({ fonte }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  const player = useVideoPlayer(fonte, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.video}
      contentFit="contain"
      nativeControls
    />
  );
}

export default function Biblioteca({ navigation }) {
  const { cores } = useTema();
  const espacoTopo = useTopo();
  const styles = useMemo(
    () => criarEstilos(cores, espacoTopo),
    [cores, espacoTopo]
  );

  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('Todos');
  const [selecionado, setSelecionado] = useState(null);

  const [favoritos, setFavoritos] = useState([]);
  const [favoritosCarregados, setFavoritosCarregados] = useState(false);

  const uid = auth.currentUser?.uid;
  const chaveFavoritos = `@gymlife:favoritos:${uid ?? 'local'}`;

  // Carrega os favoritos salvos no dispositivo.
  useEffect(() => {
    let ativo = true;

    async function carregarFavoritos() {
      try {
        const salvos = await AsyncStorage.getItem(chaveFavoritos);

        if (ativo && salvos) {
          const dados = JSON.parse(salvos);

          if (Array.isArray(dados)) {
            setFavoritos(dados);
          }
        }
      } catch (erro) {
        console.log('Erro ao carregar favoritos:', erro);
      } finally {
        if (ativo) {
          setFavoritosCarregados(true);
        }
      }
    }

    setFavoritos([]);
    setFavoritosCarregados(false);

    carregarFavoritos();

    return () => {
      ativo = false;
    };
  }, [chaveFavoritos]);

  // Salva automaticamente quando a lista de favoritos muda.
  useEffect(() => {
    if (!favoritosCarregados) return;

    AsyncStorage.setItem(
      chaveFavoritos,
      JSON.stringify(favoritos)
    ).catch((erro) => {
      console.log('Erro ao salvar favoritos:', erro);
    });
  }, [favoritos, favoritosCarregados, chaveFavoritos]);

  // Adiciona ou remove um exercício dos favoritos.
  function alternarFavorito(id) {
    setFavoritos((atuais) =>
      atuais.includes(id)
        ? atuais.filter((item) => item !== id)
        : [...atuais, id]
    );
  }

  // Pesquisa e filtros da biblioteca.
  const listaExercicios = useMemo(() => {
    return Object.values(exercicios)
      .map((exercicio) => ({
        ...exercicio,
        grupo: GRUPOS[exercicio.id] ?? 'Outros',
      }))
      .filter((exercicio) => {
        const termo = normalizar(busca);

        const correspondeBusca =
          normalizar(exercicio.nome).includes(termo) ||
          normalizar(exercicio.grupo).includes(termo);

        const correspondeCategoria =
          categoria === 'Todos' ||
          (categoria === 'Favoritos'
            ? favoritos.includes(exercicio.id)
            : exercicio.grupo === categoria);

        return correspondeBusca && correspondeCategoria;
      });
  }, [busca, categoria, favoritos]);

  function fecharVideo() {
    setSelecionado(null);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.voltar}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.logo}>GymLife</Text>

        <Text style={styles.subtitulo}>
          BIBLIOTECA DE EXERCÍCIOS
        </Text>

        {/* BANNER */}
        <View style={styles.banner}>
          <Text style={styles.bannerIcone}>🎬</Text>

          <Text style={styles.bannerTitulo}>
            Aprenda cada movimento
          </Text>

          <Text style={styles.bannerTexto}>
            Encontre exercícios, veja demonstrações e consulte
            séries e repetições de referência.
          </Text>

          <Text style={styles.total}>
            {Object.keys(exercicios).length} exercícios disponíveis
          </Text>

          <View style={styles.contadorFavoritos}>
            <Text style={styles.contadorFavoritosTexto}>
              ★ {favoritos.length} favoritos
            </Text>
          </View>
        </View>

        {/* BUSCA */}
        <TextInput
          style={styles.inputBusca}
          placeholder="Buscar exercício ou grupo muscular..."
          placeholderTextColor={cores.textoMudo}
          value={busca}
          onChangeText={setBusca}
          autoCapitalize="none"
          returnKeyType="search"
        />

        {/* FILTROS */}
        <Text style={styles.tituloSecao}>
          Grupo muscular
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtros}
          keyboardShouldPersistTaps="handled"
        >
          {CATEGORIAS.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.filtro,
                categoria === item && styles.filtroAtivo,
              ]}
              onPress={() => setCategoria(item)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filtroTexto,
                  categoria === item && styles.filtroTextoAtivo,
                ]}
              >
                {item === 'Favoritos' ? '★ Favoritos' : item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* RESULTADOS */}
        <View style={styles.linhaResultados}>
          <Text style={styles.tituloSecao}>
            Exercícios
          </Text>

          <Text style={styles.quantidade}>
            {listaExercicios.length} encontrados
          </Text>
        </View>

        {listaExercicios.length === 0 ? (
          <View style={styles.vazio}>
            <Text style={styles.vazioIcone}>🔎</Text>

            <Text style={styles.vazioTitulo}>
              Nenhum exercício encontrado
            </Text>

            <Text style={styles.vazioTexto}>
              {categoria === 'Favoritos'
                ? 'Você ainda não adicionou exercícios aos favoritos.'
                : 'Tente outro nome ou selecione outro grupo muscular.'}
            </Text>

            {categoria === 'Favoritos' && favoritos.length === 0 && (
              <TouchableOpacity
                style={styles.botaoLimpar}
                onPress={() => setCategoria('Todos')}
              >
                <Text style={styles.textoBotaoLimpar}>
                  VER TODOS OS EXERCÍCIOS
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          listaExercicios.map((exercicio) => {
            const favorito = favoritos.includes(exercicio.id);

            return (
              <View
                key={exercicio.id}
                style={styles.card}
              >
                <View style={styles.cardTopo}>
                  <View style={styles.iconeCard}>
                    <Text style={styles.iconeTexto}>🏋️</Text>
                  </View>

                  <View style={styles.infoCard}>
                    <Text style={styles.nomeExercicio}>
                      {exercicio.nome.trim()}
                    </Text>

                    <Text style={styles.grupo}>
                      {exercicio.grupo}
                    </Text>
                  </View>

                  {/* FAVORITO */}
                  <TouchableOpacity
                    style={styles.botaoFavorito}
                    onPress={() => alternarFavorito(exercicio.id)}
                    activeOpacity={0.7}
                    disabled={!favoritosCarregados}
                  >
                    <Text
                      style={[
                        styles.textoFavorito,
                        favorito && styles.textoFavoritoAtivo,
                      ]}
                    >
                      {favorito ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.detalhes}>
                  <View style={styles.detalhe}>
                    <Text style={styles.detalheValor}>
                      {exercicio.series}
                    </Text>

                    <Text style={styles.detalheRotulo}>
                      Séries
                    </Text>
                  </View>

                  <View style={styles.separador} />

                  <View style={styles.detalhe}>
                    <Text style={styles.detalheValor}>
                      {exercicio.reps ?? exercicio.repeticoes ?? '-'}
                    </Text>

                    <Text style={styles.detalheRotulo}>
                      Repetições
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.botaoVideo}
                  onPress={() => setSelecionado(exercicio)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.textoBotaoVideo}>
                    ▶  Assistir demonstração
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <Text style={styles.rodape}>
          Disciplina hoje, resultado amanhã!
        </Text>
      </ScrollView>

      {/* MODAL DE VÍDEO */}
      <Modal
        visible={!!selecionado}
        transparent
        animationType="slide"
        onRequestClose={fecharVideo}
      >
        <View style={styles.fundoModal}>
          <View style={styles.modal}>
            {selecionado && (
              <>
                <View style={styles.modalTopo}>
                  <View style={styles.modalInfo}>
                    <Text style={styles.modalTitulo}>
                      {selecionado.nome.trim()}
                    </Text>

                    <Text style={styles.modalGrupo}>
                      {GRUPOS[selecionado.id] ?? 'Outros'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={fecharVideo}
                    style={styles.botaoFechar}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.fecharTexto}>✕</Text>
                  </TouchableOpacity>
                </View>

                {selecionado.video ? (
                  <VideoExercicio
                    key={selecionado.id}
                    fonte={selecionado.video}
                  />
                ) : (
                  <View style={styles.videoIndisponivel}>
                    <Text style={styles.videoIndisponivelTexto}>
                      Vídeo de demonstração indisponível.
                    </Text>
                  </View>
                )}

                <View style={styles.resumoVideo}>
                  <Text style={styles.resumoTitulo}>
                    Referência de treino
                  </Text>

                  <Text style={styles.resumoTexto}>
                    {selecionado.series} séries ·{' '}
                    {selecionado.reps ?? selecionado.repeticoes ?? '-'} repetições
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.botaoFavoritoModal}
                  onPress={() => alternarFavorito(selecionado.id)}
                >
                  <Text style={styles.botaoFavoritoModalTexto}>
                    {favoritos.includes(selecionado.id)
                      ? '★ Remover dos favoritos'
                      : '☆ Adicionar aos favoritos'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.aviso}>
                  Ajuste as séries e repetições conforme seu plano
                  de treino e sua orientação profissional.
                </Text>

                <TouchableOpacity
                  style={styles.botaoFecharGrande}
                  onPress={fecharVideo}
                  activeOpacity={0.8}
                >
                  <Text style={styles.botaoFecharGrandeTexto}>
                    Voltar à biblioteca
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    paddingBottom: 35,
  },

  voltar: {
    color: cores.acento,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
  },

  logo: {
    color: '#0C75D7',
    fontSize: 30,
    fontWeight: 'bold',
  },

  subtitulo: {
    color: cores.textoSuave,
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 4,
    marginBottom: 22,
  },

  banner: {
    backgroundColor: '#0758A4',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#0C75D7',
  },

  bannerIcone: {
    fontSize: 30,
    marginBottom: 10,
  },

  bannerTitulo: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  bannerTexto: {
    color: '#DBEAFE',
    fontSize: 13,
    lineHeight: 19,
  },

  total: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 14,
  },

  contadorFavoritos: {
    alignSelf: 'flex-start',
    backgroundColor: '#06447D',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 12,
  },

  contadorFavoritosTexto: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  inputBusca: {
    backgroundColor: cores.cartao,
    color: cores.texto,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    paddingHorizontal: 15,
    fontSize: 15,
    marginBottom: 22,
  },

  tituloSecao: {
    color: cores.texto,
    fontSize: 18,
    fontWeight: 'bold',
  },

  filtros: {
    gap: 8,
    paddingVertical: 14,
  },

  filtro: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: cores.borda,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: cores.cartao,
  },

  filtroAtivo: {
    backgroundColor: '#0758A4',
    borderColor: '#0C75D7',
  },

  filtroTexto: {
    color: cores.texto3,
    fontSize: 12,
    fontWeight: '600',
  },

  filtroTextoAtivo: {
    color: '#FFFFFF',
  },

  linhaResultados: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },

  quantidade: {
    color: cores.textoSuave,
    fontSize: 12,
  },

  card: {
    backgroundColor: cores.cartao,
    borderRadius: 16,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: cores.borda,
  },

  cardTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconeCard: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: '#0758A4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconeTexto: {
    fontSize: 23,
  },

  infoCard: {
    flex: 1,
  },

  nomeExercicio: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: 'bold',
  },

  grupo: {
    color: cores.acento,
    fontSize: 12,
    marginTop: 5,
  },

  botaoFavorito: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: cores.cartaoAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: cores.borda,
  },

  textoFavorito: {
    color: cores.textoSuave,
    fontSize: 25,
    fontWeight: 'bold',
    lineHeight: 29,
  },

  textoFavoritoAtivo: {
    color: cores.acento,
  },

  detalhes: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.cartaoAlt,
    borderRadius: 12,
    marginTop: 15,
    marginBottom: 14,
    paddingVertical: 12,
  },

  detalhe: {
    flex: 1,
    alignItems: 'center',
  },

  detalheValor: {
    color: cores.texto,
    fontSize: 15,
    fontWeight: 'bold',
  },

  detalheRotulo: {
    color: cores.textoSuave,
    fontSize: 11,
    marginTop: 4,
  },

  separador: {
    width: 1,
    height: 28,
    backgroundColor: cores.borda,
  },

  botaoVideo: {
    backgroundColor: '#0758A4',
    paddingVertical: 13,
    borderRadius: 11,
    alignItems: 'center',
  },

  textoBotaoVideo: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },

  vazio: {
    backgroundColor: cores.cartao,
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
    marginTop: 5,
  },

  vazioIcone: {
    fontSize: 30,
    marginBottom: 10,
  },

  vazioTitulo: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  vazioTexto: {
    color: cores.textoSuave,
    textAlign: 'center',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 19,
  },

  botaoLimpar: {
    backgroundColor: '#0758A4',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },

  textoBotaoLimpar: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  fundoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 18,
  },

  modal: {
    backgroundColor: cores.cartao,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: cores.borda,
  },

  modalTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },

  modalInfo: {
    flex: 1,
  },

  modalTitulo: {
    color: cores.texto,
    fontSize: 20,
    fontWeight: 'bold',
  },

  modalGrupo: {
    color: cores.acento,
    fontSize: 13,
    marginTop: 5,
  },

  botaoFechar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fecharTexto: {
    color: cores.texto,
    fontSize: 18,
  },

  video: {
    width: '100%',
    height: 230,
    backgroundColor: cores.fundo,
    borderRadius: 12,
  },

  videoIndisponivel: {
    width: '100%',
    height: 180,
    backgroundColor: cores.fundo,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  videoIndisponivelTexto: {
    color: cores.textoSuave,
    fontSize: 13,
    textAlign: 'center',
  },

  resumoVideo: {
    backgroundColor: cores.cartaoAlt,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },

  resumoTitulo: {
    color: cores.texto,
    fontWeight: 'bold',
    fontSize: 14,
  },

  resumoTexto: {
    color: cores.texto3,
    fontSize: 13,
    marginTop: 6,
  },

  botaoFavoritoModal: {
    backgroundColor: cores.cartaoAlt,
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0758A4',
    marginTop: 12,
  },

  botaoFavoritoModalTexto: {
    color: cores.acento,
    fontSize: 13,
    fontWeight: 'bold',
  },

  aviso: {
    color: cores.textoSuave,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },

  botaoFecharGrande: {
    backgroundColor: '#0758A4',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 16,
  },

  botaoFecharGrandeTexto: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  rodape: {
    color: cores.textoMudo,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },
});

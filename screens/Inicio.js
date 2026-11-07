import { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity
} from 'react-native';
import { useTema } from '../theme/TemaContext';

export default function Inicio({ navigation }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);


  return (
    <View style={styles.container}>

      <View style={styles.conteudo}>

        <Text style={styles.logo}>
          GymLife
        </Text>

        <Text style={styles.subtitulo}>
          Seu treino. Seu progresso.
        </Text>

        <Text style={styles.descricao}>
          Organize seus treinos, acompanhe sua evolução
          e alcance seus objetivos.
        </Text>

        <TouchableOpacity
          style={styles.botao}
          onPress={() => navigation.navigate('Cadastro')}
        >
          <Text style={styles.textoBotao}>
            COMEÇAR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.login}>
            Já tenho uma conta
          </Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

const criarEstilos = (cores) => StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: cores.fundo,
  },

  conteudo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0b6ac3',
    marginBottom: 10,
  },

  subtitulo: {
    fontSize: 20,
    color: cores.texto3,
    marginBottom: 20,
  },

  descricao: {
    fontSize: 15,
    color: cores.textoSuave,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },

  botao: {
    width: '100%',
    height: 55,
    backgroundColor: cores.botaoFundo,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  textoBotao: {
    color: cores.botaoTexto,
    fontSize: 16,
    fontWeight: 'bold',
  },

  login: {
    color: cores.texto3,
    fontSize: 15,
  },

});
import { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { useTema } from '../theme/TemaContext';

export default function CampoSenha({
  value,
  onChangeText,
  placeholder = 'Digite sua senha',
}) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  const [visivel, setVisivel] = useState(false);

  return (
    <View style={styles.caixa}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={cores.textoMudo}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visivel}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity
        onPress={() => setVisivel(!visivel)}
        style={styles.botao}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.texto}>{visivel ? 'Ocultar' : 'Mostrar'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const criarEstilos = (cores) => StyleSheet.create({
  caixa: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.cartao,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: cores.borda,
  },

  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 15,
    color: cores.texto,
    fontSize: 15,
  },

  botao: {
    paddingHorizontal: 15,
  },

  texto: {
    color: '#0c75d7',
    fontSize: 13,
    fontWeight: '600',
  },
});
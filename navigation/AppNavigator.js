
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Inicio from '../screens/Inicio';
import Cadastro from '../screens/Cadastro';
import Login from '../screens/Login';
import Home from '../screens/Home';
import Treinos from '../screens/Treinos';
import RecuperarSenha from '../screens/RecuperarSenha';
import Historico from '../screens/Historico';
import EditarPerfil from '../screens/EditarPerfil';
import Perfil from '../screens/Perfil';
import Conquistas from '../screens/Conquistas';
import Biblioteca from '../screens/Biblioteca';
import Evolucao from '../screens/Evolucao';
import Desafios from '../screens/Desafios';
import Niveis from '../screens/Niveis';
import { useTema } from '../theme/TemaContext';
import Aparencia from '../screens/Aparencia';
import Privacidade from '../screens/Privacidade';
import Sobre from '../screens/Sobre';

const Stack = createNativeStackNavigator();

export default function AppNavigator({ sessao }) {
  const { cores } = useTema();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: cores.fundo,
        },
      }}
    >
      {sessao ? (
        <>
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="Perfil" component={Perfil} />
          <Stack.Screen name="Conquistas" component={Conquistas} />
          <Stack.Screen name="Desafios" component={Desafios} />
          <Stack.Screen name="Niveis" component={Niveis}/>
          <Stack.Screen name="Treinos" component={Treinos} />
          <Stack.Screen name="Biblioteca" component={Biblioteca} />
          <Stack.Screen name="Historico" component={Historico} />
          <Stack.Screen name="EditarPerfil" component={EditarPerfil} />
          <Stack.Screen name="Evolucao" component={Evolucao} />
          <Stack.Screen name="Aparencia" component={Aparencia} />
          <Stack.Screen name="Privacidade" component={Privacidade} />
          <Stack.Screen name="Sobre" component={Sobre} />
        </>
      ) : (
        <>
          <Stack.Screen name="Inicio" component={Inicio} />
          <Stack.Screen name="Cadastro" component={Cadastro} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="RecuperarSenha" component={RecuperarSenha} />
        </>
      )}
    </Stack.Navigator>
  );
}

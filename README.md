# GymLife 💪

Aplicativo de treinos e evolução física feito com **React Native + Expo** e **Firebase**.
Monte seu plano, registre suas cargas, acompanhe sua evolução, ganhe XP, suba de nível e mantenha a constância.

## Funcionalidades

- Cadastro, login e recuperação de senha (Firebase Authentication) com verificação de e-mail
- Plano de treino montado a partir do seu objetivo, experiência e dias por semana
- Biblioteca de exercícios com vídeos e favoritos
- Registro de séries, cargas e timer de descanso
- Histórico de treinos em calendário
- Evolução de medidas e gráficos de carga
- XP, níveis, conquistas e desafios
- Perfil com foto, dados pessoais, privacidade e exclusão de conta
- Tema **claro, escuro ou automático**

## Baixar e instalar

Acesse a página de [**Releases**](../../releases) e baixe a versão mais recente.

### Android (APK)

1. Baixe o arquivo `GymLife-vX.Y.Z.apk` pelo celular.
2. Abra o arquivo. Se pedir, permita "instalar apps desconhecidos" para o navegador ou gerenciador de arquivos que você usou.
3. Se o Google Play Protect avisar que o app não é conhecido, é porque ele não está na loja: escolha "Instalar mesmo assim".

### iPhone / iPad (iOS)

A Apple não permite instalar apps fora da App Store sem uma conta de desenvolvedor paga, então não existe um "APK do iPhone" gratuito para o público. Opções:

- **Versão web (recomendado, grátis):** abra o endereço do app no Safari, toque em **Compartilhar → Adicionar à Tela de Início**. Ele abre em tela cheia, como um app.
  Endereço: `https://nickluzlains-nll.github.io/GymLife`
- **Teste pelo TestFlight:** exige a conta Apple Developer do autor (US$ 99/ano) e convite individual.
- **Instalar por conta própria (AltStore/Sideloadly):** é possível gerar o `.ipa` com o próprio código, mas com Apple ID gratuito o app expira a cada 7 dias e há limite de 3 apps.

## Rodar o projeto

Requisitos: Node 22+ e o app **Expo Go** no celular (ou um emulador).

```bash
git clone https://github.com/Nickluzlains-Nll/GymLife.git
cd GymLife
npm install
cp .env.example .env     # preencha com os dados do SEU projeto Firebase
npx expo start
```

Leia o QR code com o Expo Go.

### Configurar o Firebase

1. Crie um projeto em <https://console.firebase.google.com>.
2. Ative **Authentication** (método E-mail/senha) e o **Firestore**.
3. Registre um app **Web** e copie as chaves para o `.env`.
4. Configure as **regras de segurança do Firestore** para que cada usuário acesse apenas os próprios dados (`usuarios/{uid}`).

> As chaves `EXPO_PUBLIC_*` ficam visíveis dentro do app compilado. Isso é normal no Firebase: quem protege os dados são as **regras do Firestore**, não o segredo da chave.

## Gerar o APK

```bash
npm install -g eas-cli
eas login
eas init                 # vincula o projeto à sua conta Expo (só na primeira vez)
```

Cadastre as variáveis do Firebase no ambiente `preview` do EAS (o `.env` não vai para a nuvem de build). Pelo site em *expo.dev → seu projeto → Environment variables*, ou pelo terminal, uma por vez:

```bash
eas env:create --environment preview --name EXPO_PUBLIC_FIREBASE_API_KEY --value "SUA_CHAVE" --visibility plaintext
# repita para as outras 5 variáveis do .env.example
```

Depois:

```bash
npm run build:apk        # equivale a: eas build -p android --profile preview
```

Ao terminar, o EAS mostra o link para baixar o `.apk`.

## Publicar uma versão (GitHub Releases)

**Manual:** baixe o APK do link do EAS e anexe em *Releases → Draft a new release*.

**Automático:** o workflow `.github/workflows/release-android.yml` gera o APK e cria a Release sozinho quando você envia uma tag:

1. No site do Expo, crie um token em *Account settings → Access tokens*.
2. No GitHub: *Settings → Secrets and variables → Actions → New repository secret*, nome `EXPO_TOKEN`.
3. No terminal:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

Importante: use sempre o mesmo projeto EAS (ele guarda a chave de assinatura do app). Com chaves diferentes, o Android não deixa atualizar por cima da versão instalada.

## Versão web (GitHub Pages)

O workflow `.github/workflows/deploy-web.yml` publica o site a cada push na `main`. Configure uma vez:

1. *Settings → Pages → Source:* **GitHub Actions**.
2. *Settings → Secrets and variables → Actions → aba Variables:* crie as 6 variáveis `EXPO_PUBLIC_FIREBASE_*`.
3. No Firebase: *Authentication → Settings → Authorized domains* → adicione `nickluzlains-nll.github.io`.

## Tecnologias

React Native · Expo · React Navigation · Firebase (Auth + Firestore) · expo-video · react-native-svg

## Licença

Projeto desenvolvido por **Nicolas Luz Lains** (Etec — Desenvolvimento de Sistemas).

Defina a licença do projeto no arquivo `LICENSE`.

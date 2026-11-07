import { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText,} from 'react-native-svg';
import { useTema } from '../theme/TemaContext';

function formatarKg(valor) {
  return Number.isInteger(valor)
    ? String(valor)
    : valor.toFixed(1).replace('.', ',');
}

function formatarData(iso) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export default function GraficoCarga({ pontos }) {
  const { cores } = useTema();
  const styles = useMemo(() => criarEstilos(cores), [cores]);

  const { width: larguraTela } = useWindowDimensions();

  const largura = Math.max(larguraTela - 40 - 32, 200);
  const altura = 210;
  const margem = { esquerda: 44, direita: 16, topo: 18, base: 30 };

  const areaLargura = largura - margem.esquerda - margem.direita;
  const areaAltura = altura - margem.topo - margem.base;

  if (!pontos || pontos.length === 0) {
    return (
      <View style={styles.vazio}>
        <Text style={styles.textoVazio}>
          Ainda não há cargas registradas para este exercício.
        </Text>
      </View>
    );
  }

  const valores = pontos.map((p) => p.valor);
  let yMin = Math.min(...valores);
  let yMax = Math.max(...valores);

  if (yMin === yMax) {
    yMin = Math.max(0, yMin - 5);
    yMax = yMax + 5;
  } else {
    const folga = (yMax - yMin) * 0.15;
    yMin = Math.max(0, yMin - folga);
    yMax = yMax + folga;
  }

  const n = pontos.length;

  const posX = (i) =>
    n === 1
      ? margem.esquerda + areaLargura / 2
      : margem.esquerda + (areaLargura * i) / (n - 1);

  const posY = (valor) =>
    margem.topo +
    areaAltura -
    ((valor - yMin) / (yMax - yMin)) * areaAltura;

  const coordenadas = pontos.map((p, i) => ({
    x: posX(i),
    y: posY(p.valor),
  }));

  const linha = coordenadas.map((c) => `${c.x},${c.y}`).join(' ');

  const grade = [0, 0.5, 1].map((fracao) => ({
    y: margem.topo + areaAltura - fracao * areaAltura,
    valor: yMin + (yMax - yMin) * fracao,
  }));

  const indicesData = new Set([0, n - 1]);
  if (n > 2) indicesData.add(Math.floor((n - 1) / 2));

  const mostrarValores = n <= 8;

  return (
    <View>
      <Svg width={largura} height={altura}>
        {grade.map((g, i) => (
          <Line
            key={`grade-${i}`}
            x1={margem.esquerda}
            x2={largura - margem.direita}
            y1={g.y}
            y2={g.y}
            stroke={cores.divisor}
            strokeWidth={1}
          />
        ))}

        {grade.map((g, i) => (
          <SvgText
            key={`rotulo-${i}`}
            x={margem.esquerda - 8}
            y={g.y + 4}
            fill={cores.textoSuave}
            fontSize={10}
            textAnchor="end"
          >
            {formatarKg(Math.round(g.valor * 10) / 10)}
          </SvgText>
        ))}

        {n > 1 && (
          <Polyline
            points={linha}
            fill="none"
            stroke="#0c75d7"
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {coordenadas.map((c, i) => (
          <Circle
            key={`ponto-${i}`}
            cx={c.x}
            cy={c.y}
            r={5}
            fill={cores.fundo}
            stroke="#0c75d7"
            strokeWidth={3}
          />
        ))}

        {mostrarValores &&
          coordenadas.map((c, i) => (
            <SvgText
              key={`valor-${i}`}
              x={c.x}
              y={c.y - 11}
              fill={cores.textoForte}
              fontSize={11}
              fontWeight="bold"
              textAnchor="middle"
            >
              {formatarKg(pontos[i].valor)}
            </SvgText>
          ))}

        {pontos.map((p, i) =>
          indicesData.has(i) ? (
            <SvgText
              key={`data-${i}`}
              x={coordenadas[i].x}
              y={altura - 8}
              fill={cores.textoSuave}
              fontSize={10}
              textAnchor="middle"
            >
              {formatarData(p.data)}
            </SvgText>
          ) : null
        )}
      </Svg>

      <Text style={styles.legenda}>Carga em kg por dia de treino</Text>
    </View>
  );
}

const criarEstilos = (cores) => StyleSheet.create({
  vazio: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },

  textoVazio: {
    color: cores.textoSuave,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  legenda: {
    color: cores.textoMudo,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
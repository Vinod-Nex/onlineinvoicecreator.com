/**
 * Conversor de Valores Monetários para Extenso em Português Brasileiro (BRL)
 *
 * Suporta:
 * - Centavos (0 a 99) com concordância singular ("um centavo") e plural ("cinquenta centavos")
 * - Unidades, dezenas e centenas com "e" ("cento e um", "duzentos e cinquenta")
 * - Milhares com regra contábil ("mil duzentos e cinquenta", "dois mil")
 * - Milhões com "de reais" quando redondo ("um milhão de reais") ou "e" / espaço composto
 * - Concordância de moeda: "um real" vs "reais", "zero reais"
 *
 * Exemplo:
 * 1250.50 -> "mil duzentos e cinquenta reais e cinquenta centavos"
 */

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const ESPECIAIS = [
  'dez',
  'onze',
  'doze',
  'treze',
  'quatorze',
  'quinze',
  'dezesseis',
  'dezessete',
  'dezoito',
  'dezenove',
];
const DEZENAS = [
  '',
  '',
  'vinte',
  'trinta',
  'quarenta',
  'cinquenta',
  'sessenta',
  'setenta',
  'oitenta',
  'noventa',
];
const CENTENAS = [
  '',
  'cento',
  'duzentos',
  'trezentos',
  'quatrocentos',
  'quinhentos',
  'seiscentos',
  'setecentos',
  'oitocentos',
  'novecentos',
];

/**
 * Converte um número de 0 a 999 em palavras em português.
 */
export function converterCentena(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';

  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];

  if (c > 0) partes.push(CENTENAS[c]);

  if (r > 0) {
    if (r < 10) {
      partes.push(UNIDADES[r]);
    } else if (r < 20) {
      partes.push(ESPECIAIS[r - 10]);
    } else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      partes.push(DEZENAS[d]);
      if (u > 0) partes.push(UNIDADES[u]);
    }
  }

  return partes.join(' e ');
}

/**
 * Converte um valor monetário em reais (BRL) para texto por extenso.
 *
 * @param valor - Quantia numérica em reais (ex: 1250.50)
 * @returns String formatada por extenso em português do Brasil
 */
export function numeroPorExtenso(valor: number): string {
  if (typeof valor !== 'number' || isNaN(valor) || valor < 0) {
    return '';
  }

  const fixed = valor.toFixed(2);
  const [inteiroStr, centavosStr] = fixed.split('.');
  const inteiro = parseInt(inteiroStr, 10);
  const centavos = parseInt(centavosStr, 10);

  if (inteiro === 0 && centavos === 0) {
    return 'zero reais';
  }

  const partes: string[] = [];

  if (inteiro > 0) {
    const milhoes = Math.floor(inteiro / 1000000);
    const milhares = Math.floor((inteiro % 1000000) / 1000);
    const unidadesCentena = inteiro % 1000;

    interface Bloco {
      texto: string;
      n: number;
      tipo: 'milhoes' | 'milhares' | 'unidades';
    }

    const blocos: Bloco[] = [];

    if (milhoes > 0) {
      const textoMilhao =
        milhoes === 1 ? 'um milhão' : `${converterCentena(milhoes)} milhões`;
      blocos.push({ texto: textoMilhao, n: milhoes, tipo: 'milhoes' });
    }

    if (milhares > 0) {
      const textoMilhar =
        milhares === 1 ? 'mil' : `${converterCentena(milhares)} mil`;
      blocos.push({ texto: textoMilhar, n: milhares, tipo: 'milhares' });
    }

    if (unidadesCentena > 0) {
      blocos.push({
        texto: converterCentena(unidadesCentena),
        n: unidadesCentena,
        tipo: 'unidades',
      });
    }

    let textoInteiro = blocos[0].texto;
    for (let i = 1; i < blocos.length; i++) {
      const curr = blocos[i];
      if (curr.tipo === 'unidades' && (curr.n < 100 || curr.n % 100 === 0)) {
        textoInteiro += ` e ${curr.texto}`;
      } else if (
        curr.tipo === 'milhares' &&
        (curr.n < 100 || curr.n % 100 === 0) &&
        unidadesCentena === 0
      ) {
        textoInteiro += ` e ${curr.texto}`;
      } else {
        textoInteiro += ` ${curr.texto}`;
      }
    }

    if (milhoes > 0 && milhares === 0 && unidadesCentena === 0) {
      textoInteiro += ' de reais';
    } else if (inteiro === 1) {
      textoInteiro += ' real';
    } else {
      textoInteiro += ' reais';
    }

    partes.push(textoInteiro);
  }

  if (centavos > 0) {
    const textoCentavos = `${converterCentena(centavos)} ${
      centavos === 1 ? 'centavo' : 'centavos'
    }`;
    partes.push(textoCentavos);
  }

  return partes.join(' e ');
}


import { describe, it, expect } from 'vitest';
import { numeroPorExtenso } from '../src/lib/extenso';

describe('Brazilian Portuguese Currency to Words (Extenso)', () => {
  const testCases: [number, string][] = [
    // 1. Prompt mandated example
    [1250.5, 'mil duzentos e cinquenta reais e cinquenta centavos'],

    // 2. Exact singular real
    [1.0, 'um real'],

    // 3. Exact plural small reais
    [2.0, 'dois reais'],

    // 4. Centavos only (singular)
    [0.01, 'um centavo'],

    // 5. Centavos only (plural)
    [0.5, 'cinquenta centavos'],

    // 6. Centavos composite
    [0.75, 'setenta e cinco centavos'],

    // 7. Singular real with singular centavo
    [1.01, 'um real e um centavo'],

    // 8. Singular real with plural centavos
    [1.5, 'um real e cinquenta centavos'],

    // 9. Zero
    [0.0, 'zero reais'],

    // 10. Tens
    [15.0, 'quinze reais'],
    [21.0, 'vinte e um reais'],

    // 11. Exact hundreds
    [100.0, 'cem reais'],

    // 12. Hundred and something
    [101.0, 'cento e um reais'],
    [250.0, 'duzentos e cinquenta reais'],

    // 13. Exact thousand
    [1000.0, 'mil reais'],

    // 14. Thousand with tens
    [1050.0, 'mil e cinquenta reais'],

    // 15. Thousand with round hundred
    [1100.0, 'mil e cem reais'],

    // 16. Thousand with units
    [2005.0, 'dois mil e cinco reais'],

    // 17. Composite thousands with cents
    [2345.67, 'dois mil trezentos e quarenta e cinco reais e sessenta e sete centavos'],

    // 18. Hundred thousand
    [100000.0, 'cem mil reais'],

    // 19. Exact one million (de reais)
    [1000000.0, 'um milhão de reais'],

    // 20. Exact plural millions (de reais)
    [2000000.0, 'dois milhões de reais'],

    // 21. Millions with thousands and units
    [1500250.0, 'um milhão quinhentos mil duzentos e cinquenta reais'],

    // 22. Millions with round thousands
    [1500000.0, 'um milhão e quinhentos mil reais'],
  ];

  it('verifies 22 distinct currency amounts convert accurately to Brazilian Portuguese', () => {
    expect(testCases.length).toBeGreaterThanOrEqual(20);

    for (const [amount, expected] of testCases) {
      const result = numeroPorExtenso(amount);
      expect(result).toBe(expected);
    }
  });

  it('handles negative or invalid numbers safely', () => {
    expect(numeroPorExtenso(-10)).toBe('');
    expect(numeroPorExtenso(NaN)).toBe('');
  });
});


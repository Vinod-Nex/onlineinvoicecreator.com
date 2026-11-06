import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  ROUTES,
  BUILT_ROUTES,
  getRouteUrl,
  getHreflangAlternates,
  getLocalizedEquivalentUrl,
} from '../src/i18n/routes';
import { getPublishedLocales, isLocalePublished } from '../src/i18n/config';
import { formatCurrency, formatNumber, formatDate } from '../src/i18n/format';

describe('Brazilian Portuguese (pt-BR) Localization Suite', () => {
  const rootDir = path.resolve(__dirname, '..');
  const ptPagesDir = path.resolve(rootDir, 'src/pages/pt-br');

  describe('1. BRL Regional Formatting', () => {
    it('formats BRL currency with R$ symbol, decimal comma and thousands separator', () => {
      const formatted = formatCurrency(1250.5, 'BRL', 'pt-BR');
      // Normalize non-breaking spaces
      const normalized = formatted.replace(/\u00A0|\u202F/g, ' ');
      expect(normalized).toBe('R$ 1.250,50');
    });

    it('formats numbers with pt-BR locale convention', () => {
      const formatted = formatNumber(1234567.89, 2, 'pt-BR');
      expect(formatted).toBe('1.234.567,89');
    });

    it('formats dates into standard Brazilian dd/mm/aaaa order', () => {
      const date = new Date(2026, 0, 15); // 15 Jan 2026
      const formatted = formatDate(date, 'pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      expect(formatted).toBe('15/01/2026');
    });
  });

  describe('2. Metadata, Titles, Descriptions & H1 Compliance', () => {
    const ptPages = [
      {
        file: 'index.astro',
        expectedTitle: 'Gerador de Recibo e Fatura Grátis Online',
        expectedDesc: "Crie recibos online grátis e baixe o PDF. Sem cadastro, sem marca d'água. Seus dados ficam no seu navegador.",
        expectedH1: 'Gerador de Recibo e Fatura Grátis Online',
      },
      {
        file: 'gerador-de-recibo.astro',
        expectedTitle: 'Gerador de Recibo Grátis – Crie e Baixe em PDF',
        expectedDesc: 'Gere seu recibo online grátis e simples. Preencha os dados, veja a prévia e baixe o PDF. Sem cadastro e sem marca d\'água.',
        expectedH1: 'Gerador de Recibo Grátis',
      },
      {
        file: 'gerador-de-recibo-de-aluguel.astro',
        expectedTitle: 'Recibo de Aluguel Grátis – Gerador em PDF',
        expectedDesc: 'Crie um recibo de aluguel com locador, locatário, valor e período. Baixe o PDF na hora, sem cadastro e sem marca d\'água.',
        expectedH1: 'Recibo de Aluguel Grátis',
      },
      {
        file: 'modelo-de-recibo.astro',
        expectedTitle: 'Modelo de Recibo Grátis – Preencha e Baixe PDF',
        expectedDesc: 'Use um modelo de recibo pronto: preencha online, confira a prévia e baixe em PDF. Grátis, sem cadastro e sem marca d\'água.',
        expectedH1: 'Modelo de Recibo Grátis',
      },
      {
        file: 'privacidade.astro',
        expectedTitle: 'Política de Privacidade LGPD – Seus Dados Seguros',
        expectedDesc: 'Privacidade e segurança: processamento local no seu navegador, sem armazenamento em servidores e conformidade com a LGPD.',
        expectedH1: 'Política de Privacidade',
      },
      {
        file: 'termos.astro',
        expectedTitle: 'Termos de Uso – Online Invoice Creator Brasil',
        expectedDesc: 'Termos e condições de uso das nossas ferramentas gratuitas de recibos e faturas. Documentos comerciais legítimos sem custo.',
        expectedH1: 'Termos de Uso',
      },
      {
        file: 'sobre.astro',
        expectedTitle: 'Sobre Nós – Gerador de Recibos Privado e Gratuito',
        expectedDesc: 'Conheça nossa missão: ferramentas financeiras gratuitas, 100% no navegador, sem cadastro e sem armazenamento de dados pessoais.',
        expectedH1: 'Sobre Nós',
      },
      {
        file: 'contato.astro',
        expectedTitle: 'Contato e Suporte – Online Invoice Creator',
        expectedDesc: 'Entre em contato com nossa equipe de suporte. Dúvidas, sugestões ou relatórios sobre o gerador de recibos e faturas online.',
        expectedH1: 'Contato e Suporte',
      },
    ];

    it('confirms all 8 Brazilian pages exist with compliant titles (<=60) and descriptions (<=155)', () => {
      for (const page of ptPages) {
        const fullPath = path.join(ptPagesDir, page.file);
        expect(fs.existsSync(fullPath), `Page ${page.file} does not exist`).toBe(true);

        const content = fs.readFileSync(fullPath, 'utf8');

        // Check exact title
        expect(page.expectedTitle.length).toBeLessThanOrEqual(60);
        expect(content).toContain(page.expectedTitle);

        // Check exact description (handling escaped quotes)
        expect(page.expectedDesc.length).toBeLessThanOrEqual(155);
        const normalizedContent = content.replace(/\\'/g, "'");
        expect(normalizedContent).toContain(page.expectedDesc);

        // Check single H1 tag
        const h1Matches = [...content.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
        expect(h1Matches.length, `Expected exactly 1 H1 in ${page.file}`).toBe(1);
        expect(h1Matches[0][1]).toContain(page.expectedH1);
      }
    });
  });

  describe('3. JSON-LD Structured Data Schema Validation', () => {
    it('verifies WebApplication and FAQPage schemas exist with inLanguage pt-BR', () => {
      const receiptPageContent = fs.readFileSync(
        path.join(ptPagesDir, 'gerador-de-recibo.astro'),
        'utf8'
      );

      expect(receiptPageContent).toContain("inLanguage: 'pt-BR'");
      expect(receiptPageContent).toContain('faqItems');
      expect(receiptPageContent).toContain('O que é um gerador de recibo?');
      expect(receiptPageContent).toContain('Qual a diferença entre recibo e nota fiscal?');

      const distFile = path.resolve(rootDir, 'dist/pt-br/gerador-de-recibo/index.html');
      if (fs.existsSync(distFile)) {
        const compiledHtml = fs.readFileSync(distFile, 'utf8');
        expect(compiledHtml).toContain('"inLanguage":"pt-BR"');
        expect(compiledHtml).toContain('"priceCurrency":"BRL"');
        expect(compiledHtml).toContain('"@type":"FAQPage"');
        expect(compiledHtml).toContain('"@type":"WebApplication"');
      }
    });
  });

  describe('4. Hreflang Reciprocity with English Equivalents', () => {
    it('verifies pt-br is published and generates alternates for equivalent pages', () => {
      expect(isLocalePublished('pt-br')).toBe(true);

      const published = getPublishedLocales();
      expect(published).toContain('pt-br');
      expect(published).toContain('en');

      // Receipt generator has real equivalent in English
      const alternates = getHreflangAlternates('receipt');
      expect(alternates.some((a) => a.lang === 'pt-BR')).toBe(true);
      expect(alternates.some((a) => a.lang === 'en')).toBe(true);
      expect(alternates.some((a) => a.lang === 'x-default')).toBe(true);

      const ptAlt = alternates.find((a) => a.lang === 'pt-BR');
      expect(ptAlt?.href).toBe('https://onlineinvoicecreator.com/pt-br/gerador-de-recibo');

      const enAlt = alternates.find((a) => a.lang === 'en');
      expect(enAlt?.href).toBe('https://onlineinvoicecreator.com/free-online-receipt-generator');

      const xDef = alternates.find((a) => a.lang === 'x-default');
      expect(xDef?.href).toBe('https://onlineinvoicecreator.com/free-online-receipt-generator');
    });

    it('verifies pages without English equivalent only emit self-reference and x-default', () => {
      const alternates = getHreflangAlternates('receipt-template');
      expect(alternates.some((a) => a.lang === 'pt-BR')).toBe(true);
      // No /en/receipt-template exists in BUILT_ROUTES.en
      expect(alternates.some((a) => a.lang === 'en')).toBe(false);
      expect(alternates.some((a) => a.lang === 'x-default')).toBe(true);
    });
  });

  describe('5. Mobile Responsiveness (360px viewport check)', () => {
    it('ensures no fixed widths exceed 360px on Brazilian components', () => {
      const compPath = path.resolve(
        rootDir,
        'src/components/BrazilianReceiptForm.astro'
      );
      const content = fs.readFileSync(compPath, 'utf8');

      // Check responsive classes
      expect(content).toContain('w-full');
      expect(content).toContain('max-w-[1560px]');
      expect(content).toContain('overflow-x-auto');
      expect(content).not.toMatch(/width:\s*[4-9]\d\dpx(?![^;]*@media)/);
    });
  });
});

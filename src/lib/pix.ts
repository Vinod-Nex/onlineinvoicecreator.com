/**
 * Gerador de Payload Pix Estático (Padrão EMV BR Code do Banco Central do Brasil)
 *
 * Gera a string no padrão "Copia e Cola" do Pix com código TLV (Type-Length-Value)
 * e checksum CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF).
 *
 * Chaves suportadas:
 * - CPF (11 dígitos numéricos)
 * - CNPJ (14 dígitos numéricos)
 * - E-mail (ex: contato@exemplo.com.br)
 * - Celular (+5511999999999 ou 11999999999)
 * - Chave Aleatória / EVP (UUID v4)
 */

export interface PixPayloadOptions {
  /** Chave Pix (CPF, CNPJ, e-mail, telefone com DDD, ou UUID) */
  key: string;
  /** Nome do beneficiário / recebedor (até 25 caracteres) */
  merchantName?: string;
  /** Cidade do beneficiário (até 15 caracteres) */
  merchantCity?: string;
  /** Valor monetário opcional em reais (ex: 150.00) */
  amount?: number;
  /** Identificador da transação / txid (opcional, padrão '***') */
  txid?: string;
  /** Informação adicional / descrição curta */
  description?: string;
}

/**
 * Cria campo TLV (ID + 2 dígitos de tamanho + valor em bytes UTF-8)
 */
function tlv(id: string, value: string): string {
  const len = String(Buffer.byteLength(value, 'utf8')).padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Remove acentuação e caracteres não ASCII para conformidade estrita com o padrão EMV Pix.
 */
function normalizeAscii(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Calcula o checksum CRC16-CCITT (0x1021, init 0xFFFF)
 */
export function calculatePixCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Limpa e padroniza a chave Pix dependendo do tipo detectado.
 */
export function formatPixKey(rawKey: string): string {
  const clean = (rawKey || '').trim();
  const digitsOnly = clean.replace(/\D/g, '');

  // Telefone celular explicitly formatted with + or parentheses
  if (clean.startsWith('+')) {
    return clean.replace(/[^\d+]/g, '');
  }
  if (clean.includes('(') || clean.includes(')')) {
    return `+55${digitsOnly}`;
  }

  // CPF (11 dígitos)
  if (digitsOnly.length === 11 && !clean.includes('@')) {
    return digitsOnly;
  }

  // CNPJ (14 dígitos)
  if (digitsOnly.length === 14 && !clean.includes('@')) {
    return digitsOnly;
  }

  // Telefone celular brasileiro (+55 DDD 9XXXX-XXXX)
  if (!clean.includes('@') && (digitsOnly.length === 10 || digitsOnly.length === 11)) {
    return `+55${digitsOnly}`;
  }
  if (!clean.includes('@') && digitsOnly.length === 13 && digitsOnly.startsWith('55')) {
    return `+${digitsOnly}`;
  }

  // E-mail ou chave aleatória (EVP/UUID)
  return clean;
}

/**
 * Gera a string Pix Copia e Cola / Payload EMV do Banco Central do Brasil.
 */
export function generatePixPayload(options: PixPayloadOptions): string {
  if (!options.key || !options.key.trim()) {
    return '';
  }

  const cleanKey = formatPixKey(options.key);

  // Sub-elementos do campo 26 (Merchant Account Information)
  let mai = tlv('00', 'br.gov.bcb.pix') + tlv('01', cleanKey);
  if (options.description && options.description.trim()) {
    const cleanDesc = normalizeAscii(options.description).slice(0, 50);
    mai += tlv('02', cleanDesc);
  }

  let payload = '';
  // 00 - Payload Format Indicator
  payload += tlv('00', '01');
  // 26 - Merchant Account Information (Pix)
  payload += tlv('26', mai);
  // 52 - Merchant Category Code (0000 = Geral)
  payload += tlv('52', '0000');
  // 53 - Transaction Currency (986 = BRL)
  payload += tlv('53', '986');

  // 54 - Transaction Amount (opcional)
  if (options.amount && options.amount > 0) {
    payload += tlv('54', Number(options.amount).toFixed(2));
  }

  // 58 - Country Code (BR)
  payload += tlv('58', 'BR');

  // 59 - Merchant Name (max 25 chars)
  const name = normalizeAscii(options.merchantName || 'RECEBEDOR')
    .toUpperCase()
    .slice(0, 25);
  payload += tlv('59', name || 'RECEBEDOR');

  // 60 - Merchant City (max 15 chars)
  const city = normalizeAscii(options.merchantCity || 'BRASILIA')
    .toUpperCase()
    .slice(0, 15);
  payload += tlv('60', city || 'BRASILIA');

  // 62 - Additional Data Field Template (txid)
  const txid = (options.txid || '***').trim().slice(0, 25);
  payload += tlv('62', tlv('05', txid || '***'));

  // 63 - CRC16 Checksum
  payload += '6304';
  const crc = calculatePixCrc16(payload);

  return `${payload}${crc}`;
}

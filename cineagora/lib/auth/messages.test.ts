import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './messages';

describe('authErrorMessage', () => {
  it.each([
    ['invalid_credentials', 'E-mail ou senha incorretos.'],
    ['user_already_exists', 'Este e-mail já tem conta.'],
    ['email_exists', 'Este e-mail já tem conta.'],
    ['email_not_confirmed', 'Confirme seu e-mail antes de entrar.'],
    ['weak_password', 'Senha fraca. Use letras, números e símbolos.'],
    ['same_password', 'A nova senha precisa ser diferente da atual.'],
    ['over_email_send_rate_limit', 'Muitas tentativas. Aguarde alguns minutos.'],
    ['over_request_rate_limit', 'Muitas tentativas. Aguarde alguns minutos.'],
    ['otp_expired', 'Link expirado, peça outro.'],
  ])('%s', (code, msg) => expect(authErrorMessage({ code })).toBe(msg));

  it.each([{ code: 'xyz' }, {}, null, undefined])('desconhecido %o', (e) =>
    expect(authErrorMessage(e)).toBe('Algo deu errado, tente de novo.'),
  );
});

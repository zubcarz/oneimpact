import type { ArgumentsHost } from '@nestjs/common';
import { DomainError } from '../errors/domain-error';
import { DomainErrorFilter } from './domain-error.filter';

function createHost(): {
  host: ArgumentsHost;
  json: jest.Mock<void, [Record<string, unknown>]>;
  status: jest.Mock;
} {
  const json = jest.fn<void, [Record<string, unknown>]>();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('DomainErrorFilter', () => {
  it('maps a 404 DomainError to { statusCode, code, message }, not a 500', () => {
    const filter = new DomainErrorFilter();
    const { host, json, status } = createHost();
    const error = DomainError.notFound('ZONE_NOT_FOUND', 'Zone not found');

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(404);
    expect(status).not.toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      code: 'ZONE_NOT_FOUND',
      message: 'Zone not found',
    });
  });

  it('maps an arbitrary DomainError status/code through unchanged', () => {
    const filter = new DomainErrorFilter();
    const { host, json, status } = createHost();
    const error = new DomainError('PROJECT_LOCKED', 409, 'Project is locked');

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      code: 'PROJECT_LOCKED',
      message: 'Project is locked',
    });
  });

  it('includes details in the body when the DomainError carries them', () => {
    const filter = new DomainErrorFilter();
    const { host, json, status } = createHost();
    const error = new DomainError('PAYMENT_DECLINED', 402, 'El pago fue rechazado.', {
      reason: 'CARD_DECLINED',
    });

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(402);
    expect(json).toHaveBeenCalledWith({
      statusCode: 402,
      code: 'PAYMENT_DECLINED',
      message: 'El pago fue rechazado.',
      details: { reason: 'CARD_DECLINED' },
    });
  });

  it('omits the details key entirely when the DomainError has none', () => {
    const filter = new DomainErrorFilter();
    const { host, json } = createHost();
    const error = new DomainError('PROJECT_LOCKED', 409, 'Project is locked');

    filter.catch(error, host);

    const [body] = json.mock.calls[0];
    expect(body).not.toHaveProperty('details');
  });
});

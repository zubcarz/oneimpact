import type { ArgumentsHost } from '@nestjs/common';
import { DomainError } from '../errors/domain-error';
import { DomainErrorFilter } from './domain-error.filter';

function createHost(): { host: ArgumentsHost; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
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
});

import { ApiError } from '@oneimpact/api-client';
import { describe, expect, it } from 'vitest';
import {
  PROJECT_FALLBACK_ERROR,
  projectIssueMessage,
  projectSaveErrorMessage,
} from './project-messages';

describe('projectIssueMessage', () => {
  it('translates the fields createProjectSchema leaves in English', () => {
    expect(projectIssueMessage({ code: 'invalid_type', path: ['progress'] })).toBe(
      'Introduce un número entero entre 0 y 100.',
    );
    expect(projectIssueMessage({ code: 'invalid_type', path: ['lat'] })).toBe(
      'Introduce un número válido, por ejemplo -3.4653.',
    );
    expect(projectIssueMessage({ code: 'invalid_value', path: ['status'] })).toBe(
      'Selecciona un estado válido.',
    );
  });

  it('falls back to a generic line for a field it does not know', () => {
    expect(projectIssueMessage({ code: 'custom', path: ['coverKey'] })).toBe('Revisa este campo.');
  });

  it('falls back when the issue has no usable path', () => {
    expect(projectIssueMessage({ code: 'custom' })).toBe('Revisa este campo.');
    expect(projectIssueMessage({ code: 'custom', path: [0] })).toBe('Revisa este campo.');
  });
});

describe('projectSaveErrorMessage', () => {
  it('shows the Spanish message of a domain error of the API', () => {
    const error = new ApiError(404, 'La zona "no-existe" no existe.');
    expect(projectSaveErrorMessage(error)).toBe('La zona "no-existe" no existe.');
  });

  it('hides the message of a server error, which says nothing to the admin', () => {
    expect(projectSaveErrorMessage(new ApiError(500, 'Cannot read properties of undefined'))).toBe(
      PROJECT_FALLBACK_ERROR,
    );
  });

  it('falls back for a network failure, which is not an ApiError at all', () => {
    expect(projectSaveErrorMessage(new TypeError('Failed to fetch'))).toBe(PROJECT_FALLBACK_ERROR);
    expect(projectSaveErrorMessage(undefined)).toBe(PROJECT_FALLBACK_ERROR);
  });

  it('falls back when the API answered a 4xx with an empty message', () => {
    expect(projectSaveErrorMessage(new ApiError(400, '   '))).toBe(PROJECT_FALLBACK_ERROR);
  });
});

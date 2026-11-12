export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' ||
      process.env.NODE_ENV !== 'production' ||
      process.env.NEXT_PHASE === 'phase-production-build') return;

  const { validateEnvironment } = await import('./lib/env');
  const { valid, errors } = validateEnvironment();
  if (!valid) throw new Error(errors.join('\n'));
}

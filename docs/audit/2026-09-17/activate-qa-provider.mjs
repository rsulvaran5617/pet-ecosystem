// Run from packages/api-client with --import ./scripts/smoke/register-ts-loader.mjs.
import fs from 'node:fs/promises';
import { loadSmokeEnv } from '../../../packages/api-client/scripts/smoke/env.ts';
import { createSmokeClientBundle } from '../../../packages/api-client/scripts/smoke/clients.ts';

const env = loadSmokeEnv(['provider', 'admin', 'owner']);
const provider = createSmokeClientBundle(env);
const admin = createSmokeClientBundle(env);
const owner = createSmokeClientBundle(env);
const anonymous = createSmokeClientBundle(env);
const evidence = { executedAt: new Date().toISOString(), checks: [] };
const check = (name, passed) => { evidence.checks.push({ name, passed }); if (!passed) throw new Error(name); };
try {
  await provider.core.login(env.actors.provider);
  await admin.core.login(env.actors.admin);
  await owner.core.login(env.actors.owner);
  const slug = 'qa-auditoria-2026-09-17';
  const existing = await provider.providers.listMyProviderOrganizations();
  let organization = existing.find(o => o.slug === slug);
  organization ??= await provider.providers.createProviderOrganization({
    name: 'QA Auditoría 2026-09-17 — NO COMERCIAL', slug,
    city: 'Panama City', countryCode: 'PA', isPublic: false
  });
  evidence.organizationId = organization.id;
  await provider.providers.upsertProviderPublicProfile(organization.id, {
    headline: 'Proveedor exclusivo para pruebas de auditoría',
    bio: 'Datos de prueba. No ofrece servicios reales ni recibe clientes.', isPublic: false
  });
  if (organization.approvalStatus === 'pending') {
    let denied = false;
    try { await provider.providers.approveProviderOrganization(organization.id); }
    catch (error) { denied = /admin/i.test(error.message); }
    check('El proveedor no puede aprobar su propio negocio', denied);
  }
  organization = await admin.providers.approveProviderOrganization(organization.id);
  check('Administrador aprueba el proveedor QA', organization.approvalStatus === 'approved');
  const detail = await provider.providers.getProviderOrganizationDetail(organization.id);
  let service = detail.services.find(s => s.name === 'QA Paseo de prueba');
  service ??= await provider.providers.createProviderService({
    organizationId: organization.id, name: 'QA Paseo de prueba', category: 'walking',
    shortDescription: 'Solo auditoría; no es un servicio comercial.', speciesServed: ['dog'],
    durationMinutes: 30, isPublic: false, bookingMode: 'approval_required',
    basePriceCents: 100, currencyCode: 'USD', cancellationWindowHours: 24
  });
  evidence.serviceId = service.id;
  let denied = false;
  try { await owner.providers.getProviderOrganizationDetail(organization.id); }
  catch { denied = true; }
  check('Otro usuario no obtiene el detalle privado del proveedor', denied);
  const publicProviders = await anonymous.marketplace.listMarketplaceProviders();
  check('Proveedor QA privado no aparece en marketplace anónimo', !publicProviders.some(p => p.organizationId === organization.id));
  evidence.finalState = { name: organization.name, approvalStatus: organization.approvalStatus, isPublic: organization.isPublic };
} catch (error) {
  evidence.error = error.message;
  process.exitCode = 1;
} finally {
  await fs.mkdir(new URL('./evidence/', import.meta.url), { recursive: true });
  await fs.writeFile(new URL('./evidence/provider-activation.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
  await Promise.allSettled([provider.core.logout(), admin.core.logout(), owner.core.logout()]);
}
console.log(JSON.stringify(evidence, null, 2));

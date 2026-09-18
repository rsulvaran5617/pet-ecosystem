import fs from 'node:fs/promises';
import { loadSmokeEnv } from '../../../packages/api-client/scripts/smoke/env.ts';
import { createSmokeClientBundle } from '../../../packages/api-client/scripts/smoke/clients.ts';
const fixture = JSON.parse(await fs.readFile(new URL('./evidence/provider-activation.json', import.meta.url), 'utf8'));
const env = loadSmokeEnv(['provider', 'owner', 'member']);
const provider = createSmokeClientBundle(env), owner = createSmokeClientBundle(env), outsider = createSmokeClientBundle(env), anon = createSmokeClientBundle(env);
const result = { executedAt: new Date().toISOString(), checks: [], fixtures: {} };
const check = (name, passed) => { result.checks.push({ name, passed }); if (!passed) throw new Error(name); };
let organization, service;
const bookings = [];
try {
  await provider.core.login(env.actors.provider);
  await owner.core.login(env.actors.owner);
  await outsider.core.login(env.actors.member);
  const detail = await provider.providers.getProviderOrganizationDetail(fixture.organizationId);
  organization = detail.organization;
  service = detail.services.find(s => s.id === fixture.serviceId);
  if (!organization || !service || organization.slug !== 'qa-auditoria-2026-09-17') throw new Error('Fixture QA no verificado');
  if (!detail.availability.some(a => a.isActive)) await provider.providers.addProviderAvailabilitySlot({ organizationId: organization.id, dayOfWeek: 2, startsAt: '09:00', endsAt: '12:00', isActive: true });
  await provider.providers.updateProviderService(service.id, { ...service, isPublic: true });
  await provider.providers.upsertProviderPublicProfile(organization.id, { headline: 'QA Auditoría — NO COMERCIAL', bio: 'Proveedor temporal de prueba; no ofrece servicios reales.', isPublic: true });
  await provider.providers.updateProviderOrganization(organization.id, { ...organization, isPublic: true });
  const listed = await anon.marketplace.listMarketplaceProviders({ query: organization.name });
  check('Visitante encuentra proveedor aprobado durante ventana de prueba', listed.some(p => p.organizationId === organization.id));
  const previous = await fs.readFile(new URL('./evidence/bookings.json', import.meta.url), 'utf8').then(JSON.parse).catch(() => null);
  const household = previous?.fixtures?.householdId ? { id: previous.fixtures.householdId } : await owner.households.createHousehold({ name: `QA Auditoría ${Date.now()}` });
  const pet = previous?.fixtures?.petId ? { id: previous.fixtures.petId } : await owner.pets.createPet({ householdId: household.id, name: 'QA Mascota de auditoría', species: 'dog', sex: 'unknown', notes: 'Fixture de prueba; no es una mascota real.' });
  result.fixtures = { householdId: household.id, petId: pet.id, organizationId: organization.id };
  const input = { householdId: household.id, petId: pet.id, providerId: organization.id, serviceId: service.id, paymentMethodId: null };
  const preview = await owner.bookings.previewBooking(input);
  check('Preview requiere aprobación del proveedor', preview.statusOnCreate === 'pending_approval');
  const booking = await owner.bookings.createBooking(input);
  bookings.push(booking.booking.id);
  check('Owner crea reserva pendiente', booking.booking.status === 'pending_approval');
  let blocked = false;
  try { await outsider.bookings.getBookingDetail(booking.booking.id); } catch { blocked = true; }
  check('Usuario ajeno no puede leer reserva', blocked);
  blocked = false;
  try { await outsider.bookings.approveBooking(booking.booking.id); } catch { blocked = true; }
  check('Usuario ajeno no puede aprobar reserva', blocked);
  const approved = await provider.bookings.approveBooking(booking.booking.id);
  check('Proveedor confirma su reserva', approved.booking.status === 'confirmed');
  const thread = await owner.messaging.getThreadByBooking(booking.booking.id);
  check('Reserva genera hilo de conversación', Boolean(thread));
  const completed = await provider.bookings.completeBooking(booking.booking.id);
  check('Proveedor completa reserva confirmada', completed.booking.status === 'completed');
  const cancel = await owner.bookings.createBooking(input);
  bookings.push(cancel.booking.id);
  check('Owner cancela reserva pendiente', (await owner.bookings.cancelBooking(cancel.booking.id)).booking.status === 'cancelled');
  result.fixtures.bookingIds = bookings;
} catch (error) { result.error = error.message; process.exitCode = 1; }
finally {
  if (organization) {
    try {
      await provider.providers.updateProviderOrganization(organization.id, { ...organization, isPublic: false });
      await provider.providers.upsertProviderPublicProfile(organization.id, { headline: 'Proveedor exclusivo para pruebas de auditoría', bio: 'Datos de prueba. No ofrece servicios reales ni recibe clientes.', isPublic: false });
      if (service) await provider.providers.updateProviderService(service.id, { ...service, isPublic: false });
      const visible = await anon.marketplace.listMarketplaceProviders({ query: organization.name });
      result.hiddenAfterTest = !visible.some(p => p.organizationId === organization.id);
    } catch (error) { result.cleanupError = error.message; process.exitCode = 1; }
  }
  result.fixtures.bookingIds = bookings;
  await fs.writeFile(new URL('./evidence/bookings.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
  await Promise.allSettled([provider.core.logout(), owner.core.logout(), outsider.core.logout()]);
}
console.log(JSON.stringify(result, null, 2));

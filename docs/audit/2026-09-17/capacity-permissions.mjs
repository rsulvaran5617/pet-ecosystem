import fs from 'node:fs/promises';
import { loadSmokeEnv } from '../../../packages/api-client/scripts/smoke/env.ts';
import { createSmokeClientBundle } from '../../../packages/api-client/scripts/smoke/clients.ts';
const env = loadSmokeEnv(['owner', 'member', 'provider']);
const fixture = JSON.parse(await fs.readFile(new URL('./evidence/bookings.json', import.meta.url), 'utf8')).fixtures;
const provider = createSmokeClientBundle(env), owner = createSmokeClientBundle(env), member = createSmokeClientBundle(env, true);
const contenders = Array.from({ length: 4 }, () => createSmokeClientBundle(env));
const result = { executedAt: new Date().toISOString(), checks: [], rounds: [], fixtures: {} };
const check = (id, passed, details) => { result.checks.push({ id, passed, ...(details === undefined ? {} : { details }) }); };
const deny = async (id, fn, expected) => {
  try { await fn(); check(id, false, 'Operación aceptada'); }
  catch (error) { check(id, expected.test(error.message), error.message); }
};
const openBookings = new Set();
let organization, service, rule, memberId;
try {
  await owner.core.login(env.actors.owner); await provider.core.login(env.actors.provider); await member.core.login(env.actors.member);
  for (const c of contenders) await c.core.login(env.actors.owner);
  const detail = await provider.providers.getProviderOrganizationDetail(fixture.organizationId);
  organization = detail.organization; service = detail.services.find(s => s.name === 'QA Paseo de prueba');
  if (organization.slug !== 'qa-auditoria-2026-09-17' || !service) throw new Error('Fixture incorrecto');
  const day = new Date(); day.setUTCDate(day.getUTCDate() + 8);
  const date = day.toISOString().slice(0, 10);
  rule = await provider.providers.createProviderAvailabilityRule({ organizationId: organization.id, serviceId: service.id, dayOfWeek: day.getUTCDay(), startsAt: '09:00', endsAt: '09:30', capacity: 1, isActive: true, effectiveFrom: date, effectiveUntil: date });
  result.fixtures = { ...fixture, ruleId: rule.id, slotDate: date };
  await provider.providers.updateProviderService(service.id, { ...service, isPublic: true });
  await provider.providers.upsertProviderPublicProfile(organization.id, { headline: 'QA — NO COMERCIAL', bio: 'Auditoría temporal sin servicios reales.', isPublic: true });
  await provider.providers.updateProviderOrganization(organization.id, { ...organization, isPublic: true });
  const slots = () => owner.bookings.listBookingSlots({ serviceId: service.id, fromDate: date, toDate: date });
  const slot = (await slots()).find(s => s.availabilityRuleId === rule.id);
  if (!slot) throw new Error('Slot QA no proyectado');
  check('CAP-TZ', new Date(slot.slotStartAt).getUTCHours() === 14 && new Date(slot.slotEndAt).getUTCMinutes() === 30, { start: slot.slotStartAt, end: slot.slotEndAt, zone: 'America/Panama' });
  const input = { householdId: fixture.householdId, petId: fixture.petId, serviceId: service.id, availabilityRuleId: rule.id, slotStartAt: slot.slotStartAt, slotEndAt: slot.slotEndAt, paymentMethodId: null };
  for (let round = 1; round <= 3; round++) {
    const responses = await Promise.allSettled(contenders.map(c => c.bookings.createBookingFromSlot(input)));
    const accepted = responses.filter(r => r.status === 'fulfilled').map(r => r.value.booking);
    for (const b of accepted) openBookings.add(b.id);
    const rejected = responses.filter(r => r.status === 'rejected').map(r => r.reason.message);
    result.rounds.push({ round, accepted: accepted.map(b => b.id), rejected });
    const full = (await slots()).find(s => s.availabilityRuleId === rule.id);
    check(`CAP-RACE-${round}`, accepted.length === 1 && rejected.length === 3 && rejected.every(m => /no longer available|full|capacity/i.test(m)) && full.reservedCount === 1 && full.availableCount === 0, { accepted: accepted.length, rejected: rejected.length, reserved: full.reservedCount });
    for (const b of accepted) { await owner.bookings.cancelBooking(b.id); openBookings.delete(b.id); }
    check(`CAP-RELEASE-${round}`, (await slots()).find(s => s.availabilityRuleId === rule.id).availableCount === 1);
  }
  await deny('CAP-INVALID-RANGE', () => owner.bookings.createBookingFromSlot({ ...input, slotEndAt: input.slotStartAt }), /range is invalid/i);
  await deny('CAP-ZERO', () => provider.providers.updateProviderAvailabilityRule(rule.id, { capacity: 0 }), /capacity|check constraint|positive/i);
  await provider.providers.updateProviderAvailabilityRule(rule.id, { capacity: 2 });
  for (let i = 0; i < 2; i++) { const b = await owner.bookings.createBookingFromSlot(input); openBookings.add(b.booking.id); }
  await deny('CAP-REDUCE-OCCUPIED', () => provider.providers.updateProviderAvailabilityRule(rule.id, { capacity: 1 }), /capacity|book|reserv|occupied/i);
  const afterReduce = (await slots()).find(s => s.availabilityRuleId === rule.id);
  result.capacityAfterReductionAttempt = afterReduce;
  for (const id of [...openBookings]) { await owner.bookings.cancelBooking(id); openBookings.delete(id); }
  await provider.providers.updateProviderAvailabilityRule(rule.id, { capacity: 1 });

  // Invitations are internal database records addressed only to the configured QA member.
  const household = await owner.households.getHouseholdDetail(fixture.householdId);
  let membership = household.members.find(m => m.profile?.email === env.actors.member.email);
  if (!membership) {
    const invitation = await owner.households.inviteMember(fixture.householdId, { email: env.actors.member.email, permissions: ['view'] });
    await member.households.acceptInvitation(invitation.id);
    membership = (await owner.households.getHouseholdDetail(fixture.householdId)).members.find(m => m.profile?.email === env.actors.member.email);
  }
  memberId = membership.id; result.fixtures.memberId = memberId;
  const permissions = p => owner.households.updateMemberPermissions(fixture.householdId, memberId, { permissions: p });
  await permissions(['view']);
  check('HH-VIEW', (await member.pets.getPetDetail(fixture.petId)).pet.id === fixture.petId);
  const petInput = { name: 'QA Mascota de auditoría', species: 'dog', sex: 'unknown', notes: 'Fixture de prueba; no es una mascota real.' };
  await deny('HH-VIEW-NO-EDIT', () => member.pets.updatePet(fixture.petId, petInput), /edit|permission|access|authorized/i);
  await deny('HH-VIEW-NO-BOOK', () => member.bookings.createBookingFromSlot(input), /book permission/i);
  await deny('HH-NO-SELF-ESCALATION', () => member.households.updateMemberPermissions(fixture.householdId, memberId, { permissions: ['view','admin'] }), /admin required/i);
  await permissions(['view','edit']);
  check('HH-EDIT', (await member.pets.updatePet(fixture.petId, petInput)).id === fixture.petId);
  await permissions(['view','book']);
  await deny('HH-EDIT-REVOKED', () => member.pets.updatePet(fixture.petId, petInput), /edit|permission|access|authorized/i);
  const b = await member.bookings.createBookingFromSlot(input); openBookings.add(b.booking.id);
  check('HH-BOOK', b.booking.status === 'pending_approval');
  await member.bookings.cancelBooking(b.booking.id); openBookings.delete(b.booking.id);
  await deny('HH-BOOK-NO-PAY', () => member.bookings.createBookingFromSlot({ ...input, paymentMethodId: '00000000-0000-4000-8000-000000000001' }), /pay permission/i);
  await permissions(['view','book','pay']);
  await deny('HH-PAY-INVALID-METHOD', () => member.bookings.createBookingFromSlot({ ...input, paymentMethodId: '00000000-0000-4000-8000-000000000001' }), /payment method is not available/i);
  await permissions(['view','admin']);
  const granted = await member.households.updateMemberPermissions(fixture.householdId, memberId, { permissions: ['view','admin','edit'] });
  check('HH-ADMIN-MANAGES', granted.permissions.includes('edit'));
  await permissions(['view']);
  await deny('HH-ADMIN-REVOKED', () => member.households.updateMemberPermissions(fixture.householdId, memberId, { permissions: ['view','admin'] }), /admin required/i);
  const adminMembership = household.members.find(m => m.permissions.includes('admin'));
  await deny('HH-LAST-ADMIN', () => owner.households.updateMemberPermissions(fixture.householdId, adminMembership.id, { permissions: ['view'] }), /at least one admin/i);
} catch (error) { result.setupOrExecutionError = error.message; process.exitCode = 1; }
finally {
  result.cleanup = [];
  const cleanup = async (name, fn) => { try { await fn(); result.cleanup.push({name,ok:true}); } catch(e) { result.cleanup.push({name,ok:false,error:e.message}); process.exitCode=1; } };
  for(const id of openBookings) await cleanup(`cancel ${id}`, () => owner.bookings.cancelBooking(id));
  if(memberId) await cleanup('member read-only', () => owner.households.updateMemberPermissions(fixture.householdId, memberId, {permissions:['view']}));
  if(rule) await cleanup('disable capacity rule', () => provider.providers.setProviderAvailabilityRuleActive(rule.id, false));
  if(organization) {
    await cleanup('hide organization', () => provider.providers.updateProviderOrganization(organization.id, {...organization,isPublic:false}));
    await cleanup('hide profile', () => provider.providers.upsertProviderPublicProfile(organization.id, {headline:'Proveedor exclusivo para pruebas de auditoría',bio:'Datos de prueba. No ofrece servicios reales ni recibe clientes.',isPublic:false}));
    if(service) await cleanup('hide service', () => provider.providers.updateProviderService(service.id,{...service,isPublic:false}));
  }
  await fs.writeFile(new URL('./evidence/capacity-permissions.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
  await Promise.allSettled([provider,owner,member,...contenders].map(c=>c.core.logout()));
}
console.log(JSON.stringify(result,null,2));

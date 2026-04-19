import { createSmokeClientBundle } from "./clients.ts";
import type { SmokeEnv } from "./env.ts";
import { assertSmoke, loginAsActor, writeSmokeArtifact } from "./helpers.ts";

export interface RemindersSmokeResult {
  automaticReminder: {
    calendarEventId: string | null;
    dueAt: string;
    reminderId: string;
    title: string;
  };
  householdSetup: {
    householdId: string;
    invitationId: string;
    petId: string;
  };
  manualReminderFlow: {
    completedStatus: string;
    reminderId: string;
    snoozedDueAt: string;
  };
  memberAccess: {
    calendarEventCount: number;
    reminderCount: number;
  };
  memberEditRestrictions: {
    canCompleteReminder: boolean;
    canCreateReminder: boolean;
    canSnoozeReminder: boolean;
    completeReminderError: string | null;
    createReminderError: string | null;
    snoozeReminderError: string | null;
  };
}

export async function runRemindersSmoke(env: SmokeEnv) {
  const ownerActor = env.actors.owner;
  const memberActor = env.actors.member;

  assertSmoke(ownerActor && memberActor, "The owner and member QA actors are required for the reminders smoke.");

  const ownerClients = createSmokeClientBundle(env);
  const memberClients = createSmokeClientBundle(env, true);
  const timestamp = Date.now();
  const vaccineDueOn = "2026-07-15";
  const manualDueAt = "2026-07-05T09:00:00.000Z";
  const snoozedDueAt = "2026-07-06T15:30:00.000Z";
  const expectedSnoozedTimestamp = new Date(snoozedDueAt).getTime();

  await loginAsActor(ownerClients, ownerActor, "pet_owner");
  await loginAsActor(memberClients, memberActor, "pet_owner");

  const household = await ownerClients.households.createHousehold({
    name: `Reminders household ${timestamp}`
  });
  const invitation = await ownerClients.households.inviteMember(household.id, {
    email: memberActor.email,
    permissions: ["view"]
  });
  const memberSnapshot = await memberClients.households.getHouseholdsSnapshot();
  const pendingInvitationId = memberSnapshot.pendingInvitations.find((candidate) => candidate.id === invitation.id)?.id;

  assertSmoke(pendingInvitationId, "The member did not receive the reminders invitation.");

  await memberClients.households.acceptInvitation(pendingInvitationId);

  const pet = await ownerClients.pets.createPet({
    householdId: household.id,
    name: `Reminders pet ${timestamp}`,
    species: "dog",
    breed: "Mixed",
    sex: "male",
    birthDate: "2021-08-15",
    notes: "Pet used to validate the MVP reminders flow."
  });

  const vaccine = await ownerClients.health.createPetVaccine(pet.id, {
    name: `Reminder vaccine ${timestamp}`,
    administeredOn: "2026-04-01",
    nextDueOn: vaccineDueOn,
    notes: "Vaccine used to generate an automatic reminder."
  });

  const remindersAfterVaccine = await ownerClients.reminders.listReminders({
    householdId: household.id,
    includeCompleted: true
  });
  const automaticReminder = remindersAfterVaccine.find(
    (reminder) => reminder.sourceRecordType === "pet_vaccine" && reminder.sourceRecordId === vaccine.id
  );

  assertSmoke(automaticReminder, "The vaccine reminder was not generated automatically.");

  const calendarEventsAfterVaccine = await ownerClients.reminders.listCalendarEvents({
    householdId: household.id,
    includeCompleted: true
  });
  const automaticCalendarEvent = calendarEventsAfterVaccine.find((event) => event.reminderId === automaticReminder.id);

  const manualReminder = await ownerClients.reminders.createReminder({
    householdId: household.id,
    petId: pet.id,
    title: `Manual reminder ${timestamp}`,
    dueAt: manualDueAt,
    notes: "Manual reminder created during the MVP validation."
  });

  const pendingReminders = await ownerClients.reminders.listReminders({
    householdId: household.id
  });

  assertSmoke(pendingReminders.some((reminder) => reminder.id === manualReminder.id), "The manual reminder was not listed as pending.");

  const snoozedReminder = await ownerClients.reminders.snoozeReminder(manualReminder.id, {
    dueAt: snoozedDueAt
  });
  const completedReminder = await ownerClients.reminders.completeReminder(manualReminder.id);

  const ownerReminders = await ownerClients.reminders.listReminders({
    householdId: household.id,
    includeCompleted: true
  });
  const ownerCalendarEvents = await ownerClients.reminders.listCalendarEvents({
    householdId: household.id,
    includeCompleted: true
  });
  const completedCalendarEvent = ownerCalendarEvents.find((event) => event.reminderId === manualReminder.id);

  const memberReminders = await memberClients.reminders.listReminders({
    householdId: household.id,
    includeCompleted: true
  });
  const memberCalendarEvents = await memberClients.reminders.listCalendarEvents({
    householdId: household.id,
    includeCompleted: true
  });

  let createReminderError: string | null = null;
  let completeReminderError: string | null = null;
  let snoozeReminderError: string | null = null;

  try {
    await memberClients.reminders.createReminder({
      householdId: household.id,
      title: "Blocked reminder",
      dueAt: "2026-07-07T09:00:00.000Z"
    });
  } catch (error) {
    createReminderError = error instanceof Error ? error.message : String(error);
  }

  try {
    await memberClients.reminders.completeReminder(manualReminder.id);
  } catch (error) {
    completeReminderError = error instanceof Error ? error.message : String(error);
  }

  try {
    await memberClients.reminders.snoozeReminder(manualReminder.id, {
      dueAt: "2026-07-08T09:00:00.000Z"
    });
  } catch (error) {
    snoozeReminderError = error instanceof Error ? error.message : String(error);
  }

  const result: RemindersSmokeResult = {
    householdSetup: {
      householdId: household.id,
      invitationId: invitation.id,
      petId: pet.id
    },
    automaticReminder: {
      reminderId: automaticReminder.id,
      title: automaticReminder.title,
      dueAt: automaticReminder.dueAt,
      calendarEventId: automaticCalendarEvent?.id ?? null
    },
    manualReminderFlow: {
      reminderId: manualReminder.id,
      snoozedDueAt: snoozedReminder.dueAt,
      completedStatus: completedReminder.status
    },
    memberAccess: {
      reminderCount: memberReminders.length,
      calendarEventCount: memberCalendarEvents.length
    },
    memberEditRestrictions: {
      canCreateReminder: createReminderError === null,
      canCompleteReminder: completeReminderError === null,
      canSnoozeReminder: snoozeReminderError === null,
      createReminderError,
      completeReminderError,
      snoozeReminderError
    }
  };

  assertSmoke(ownerReminders.some((reminder) => reminder.id === automaticReminder.id), "The automatic reminder was not visible in the reminder list.");
  assertSmoke(result.automaticReminder.dueAt.startsWith(vaccineDueOn), "The automatic reminder due date did not match the vaccine due date.");
  assertSmoke(Boolean(result.automaticReminder.calendarEventId), "The automatic reminder did not project a calendar event.");
  assertSmoke(new Date(snoozedReminder.dueAt).getTime() === expectedSnoozedTimestamp, "The reminder was not snoozed to the expected date.");
  assertSmoke(completedReminder.status === "completed", "The reminder was not completed.");
  assertSmoke(completedCalendarEvent?.status === "completed", "The calendar event did not move to completed.");
  assertSmoke(
    completedCalendarEvent ? new Date(completedCalendarEvent.startsAt).getTime() === expectedSnoozedTimestamp : false,
    "The calendar event did not preserve the snoozed date."
  );
  assertSmoke(result.memberAccess.reminderCount >= 2, "The view-only member did not see the reminders.");
  assertSmoke(result.memberAccess.calendarEventCount >= 2, "The view-only member did not see the calendar events.");
  assertSmoke(result.memberEditRestrictions.canCreateReminder === false, "A view-only member should not create reminders.");
  assertSmoke(result.memberEditRestrictions.canCompleteReminder === false, "A view-only member should not complete reminders.");
  assertSmoke(result.memberEditRestrictions.canSnoozeReminder === false, "A view-only member should not snooze reminders.");

  await writeSmokeArtifact(env, "WEB-05-reminders.json", result);

  return result;
}

export type PetDocumentValidityStatus = "no_expiration" | "valid" | "expiring_soon" | "expired" | "missing_expiration_date";

export interface PetDocumentValidityInput {
  hasExpiration: boolean;
  expiresAt: string | null;
  expirationWarningDays: number;
}

export interface PetDocumentValidityResult {
  daysUntilExpiration: number | null;
  status: PetDocumentValidityStatus;
}

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getDaysUntilExpiration(expiresAt: string | null, todayDateKey = getTodayDateKey()) {
  if (!expiresAt) {
    return null;
  }

  const today = new Date(`${todayDateKey}T00:00:00`);
  const expirationDate = new Date(`${expiresAt}T00:00:00`);

  if (Number.isNaN(today.getTime()) || Number.isNaN(expirationDate.getTime())) {
    return null;
  }

  return Math.ceil((expirationDate.getTime() - today.getTime()) / 86_400_000);
}

export function getPetDocumentValidityStatus(
  input: PetDocumentValidityInput,
  todayDateKey = getTodayDateKey()
): PetDocumentValidityResult {
  if (!input.hasExpiration) {
    return {
      daysUntilExpiration: null,
      status: "no_expiration"
    };
  }

  if (!input.expiresAt) {
    return {
      daysUntilExpiration: null,
      status: "missing_expiration_date"
    };
  }

  const daysUntilExpiration = getDaysUntilExpiration(input.expiresAt, todayDateKey);

  if (daysUntilExpiration === null) {
    return {
      daysUntilExpiration: null,
      status: "missing_expiration_date"
    };
  }

  if (daysUntilExpiration < 0) {
    return {
      daysUntilExpiration,
      status: "expired"
    };
  }

  if (daysUntilExpiration <= input.expirationWarningDays) {
    return {
      daysUntilExpiration,
      status: "expiring_soon"
    };
  }

  return {
    daysUntilExpiration,
    status: "valid"
  };
}

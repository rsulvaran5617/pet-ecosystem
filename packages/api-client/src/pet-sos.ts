import type { PetSosMapFilters, PetSosMapPage, PetSosPublicMapEvent } from "@pet/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const lostStatuses = new Set(["active", "sighting_received", "possible_match", "found"]);
const seenStatuses = new Set(["sighting_open", "sheltered_by_reporter", "possible_owner_claim", "owner_verified", "reunited"]);

function validDate(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

export function petSosMapRpcArgs(filters: PetSosMapFilters) {
  const bounds = filters?.bounds;
  if (!bounds || ![bounds.minLatitude, bounds.minLongitude, bounds.maxLatitude, bounds.maxLongitude].every(Number.isFinite)
    || bounds.minLatitude < -90 || bounds.maxLatitude > 90
    || bounds.minLatitude >= bounds.maxLatitude || bounds.maxLatitude - bounds.minLatitude > 30
    || bounds.minLongitude < -180 || bounds.minLongitude > 180
    || bounds.maxLongitude < -180 || bounds.maxLongitude > 180) {
    throw new Error("Selecciona una zona valida del mapa.");
  }
  const west = bounds.minLongitude === 180 ? -180 : bounds.minLongitude;
  const east = bounds.maxLongitude === -180 ? 180 : bounds.maxLongitude;
  const span = east >= west ? east - west : 360 - west + east;
  if (!(span > 0 && span <= 30)) throw new Error("Acerca el mapa para consultar esta zona.");
  const limit = filters.limit ?? 100;
  if (!Number.isInteger(limit) || limit < 1 || limit > 200
    || !["all", "lost", "seen", "found"].includes(filters.view ?? "all")
    || (filters.species != null && (typeof filters.species !== "string" || filters.species.length > 80))
    || (filters.occurredAfter != null && !validDate(filters.occurredAfter))) {
    throw new Error("Revisa los filtros de busqueda.");
  }
  const cursor = filters.cursor;
  if (cursor && (!validDate(cursor.occurredAt)
    || !["lost_pet", "community_sighting"].includes(cursor.eventType)
    || typeof cursor.publicSlug !== "string" || cursor.publicSlug.length < 1 || cursor.publicSlug.length > 200)) {
    throw new Error("Vuelve a iniciar la busqueda en el mapa.");
  }
  return {
    bounds_min_latitude: bounds.minLatitude,
    bounds_min_longitude: west,
    bounds_max_latitude: bounds.maxLatitude,
    bounds_max_longitude: east,
    filter_view: filters.view ?? "all",
    filter_species: filters.species?.trim() || null,
    filter_occurred_after: filters.occurredAfter ?? null,
    result_limit: limit,
    cursor_occurred_at: cursor?.occurredAt ?? null,
    cursor_event_type: cursor?.eventType ?? null,
    cursor_public_slug: cursor?.publicSlug ?? null
  };
}

function publicEvent(value: unknown): PetSosPublicMapEvent {
  if (!value || typeof value !== "object") throw new Error("Respuesta de mapa no valida.");
  const row = value as Record<string, unknown>;
  const text = (key: string): string => {
    if (typeof row[key] !== "string") throw new Error("Respuesta de mapa no valida.");
    return row[key];
  };
  const eventType = text("event_type");
  const status = text("status");
  const slug = text("public_slug");
  const latitude = row.public_latitude;
  const longitude = row.public_longitude;
  const occurredAt = text("occurred_at");
  if (typeof latitude !== "number" || !Number.isFinite(latitude) || Math.abs(latitude) > 90
    || typeof longitude !== "number" || !Number.isFinite(longitude) || Math.abs(longitude) > 180
    || !validDate(occurredAt) || !slug || slug.length > 200
    || !(eventType === "lost_pet" ? lostStatuses.has(status) : eventType === "community_sighting" && seenStatuses.has(status))) {
    throw new Error("Respuesta de mapa no valida.");
  }
  const content = {
    publicSlug: slug,
    publicPath: `/pet-alert/${eventType === "lost_pet" ? "mascota-perdida" : "mascota-vista"}/${encodeURIComponent(slug)}`,
    title: text("title"), species: text("species"), city: text("city"), occurredAt,
    publicLatitude: latitude, publicLongitude: longitude,
    statusGroup: status === "found" || status === "reunited" ? "found" as const : "active" as const,
    // Markers do not fetch original photographs or private media paths.
    photoUrl: null
  };
  return eventType === "lost_pet"
    ? { ...content, eventType, status: status as Extract<PetSosPublicMapEvent, {eventType: "lost_pet"}>["status"] }
    : { ...content, eventType: "community_sighting", status: status as Extract<PetSosPublicMapEvent, {eventType: "community_sighting"}>["status"] };
}

export async function listPublicPetSosMapEvents(supabase: SupabaseClient, filters: PetSosMapFilters): Promise<PetSosMapPage> {
  const args = petSosMapRpcArgs(filters);
  const { data, error } = await supabase.rpc("list_public_pet_sos_map_events", args);
  if (error) throw new Error("No fue posible cargar esta zona. Intenta de nuevo.");
  if (!Array.isArray(data) || data.length > args.result_limit + 1) throw new Error("Respuesta de mapa no valida.");
  const events = data.map(publicEvent);
  const hasMore = events.length > args.result_limit;
  const items = events.slice(0, args.result_limit);
  const last = items[items.length - 1];
  return { items, hasMore, nextCursor: hasMore && last ? {
    occurredAt: last.occurredAt, eventType: last.eventType, publicSlug: last.publicSlug
  } : null };
}

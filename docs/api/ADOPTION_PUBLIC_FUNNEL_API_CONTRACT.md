# ADOPTION-PUBLIC-FUNNEL API Contract

Contrato del embudo publico de adopcion. Slice 4 y Slice 5 quedan implementados localmente y pendientes de aplicacion remota controlada.

## Principios

- Separar lectura publica, solicitud inicial anonima e interacciones autenticadas.
- No exponer documentos privados ni notas internas.
- Usar RPCs/servicios con scope claro cuando haya mutaciones sensibles.
- No crear adopciones ni transferencias desde web publica.
- Mantener la solicitud formal y transferencia dentro de app owner.

## Operaciones actuales reutilizables

Ya existen o estan documentadas operaciones Foster relevantes:

- `get_public_protective_profile_by_slug`
- `list_published_pet_adoption_listings`
- `get_public_pet_adoption_listing_by_slug`
- `create_pet_adoption_application`
- `list_my_pet_adoption_applications`
- `list_received_pet_adoption_applications`
- `update_pet_adoption_application_status`
- `start_pet_adoption_transfer`
- `accept_pet_transfer`

El nuevo frente debe reutilizar esas operaciones para el tramo autenticado y proponer operaciones nuevas solo para el embudo publico.

## Slice 2 implementado

La primera landing publica no agrega contrato nuevo ni migracion. Usa:

- `getPublicProtectiveProfileBySlug(slug)` para resolver la Familia Protectora publica.
- `listPublishedPetAdoptionListings()` para obtener publicaciones publicas y filtrar por `householdId`.

Reglas aplicadas en cliente web:

- Perfil visible solo si `isPublic = true` y `moderationStatus = approved`.
- Mascotas visibles solo si `status = published`, `shareStatus = enabled` y existe `publicSlug`.
- Los enlaces de card apuntan a `/adopciones/[petSlug]`.

Pendiente para hardening futuro:

- Crear una operacion especifica `getPublicProtectiveLandingBySlug(slug)` que devuelva perfil + listings filtrados desde DB/RPC para evitar traer todas las publicaciones publicas cuando el volumen crezca.

## Operaciones propuestas

### `getPublicProtectiveLandingBySlug(slug)`

Objetivo:

Obtener datos publicos de landing de fundacion.

Entrada:

```ts
type GetPublicProtectiveLandingInput = {
  slug: string;
};
```

Salida:

```ts
type PublicProtectiveLanding = {
  profile: {
    slug: string;
    displayName: string;
    mission: string | null;
    publicStory: string | null;
    city: string | null;
    stateRegion: string | null;
    countryCode: string | null;
    logoUrl: string | null;
    websiteUrl: string | null;
    instagramUrl: string | null;
    facebookUrl: string | null;
    tiktokUrl: string | null;
    whatsappUrl: string | null;
    donationsEnabled: boolean;
    donationTitle: string | null;
    donationDescription: string | null;
    donationDisclaimer: string | null;
  };
  listings: PublicAdoptionListingSummary[];
  publicMetrics: {
    petsPublished: number;
    adoptionsClosed?: number;
    yearsActive?: number;
  };
};
```

Errores:

- `not_found`
- `profile_not_public`
- `profile_suspended`

Seguridad:

- Solo datos publicables y moderados.

### `listPublicProtectiveAdoptionListings(profileSlug)`

Objetivo:

Listar mascotas publicadas de una Familia Protectora.

Entrada:

```ts
type ListPublicProtectiveAdoptionListingsInput = {
  profileSlug: string;
  species?: string;
  city?: string;
  page?: number;
};
```

Salida:

```ts
type PublicAdoptionListingSummary = {
  slug: string;
  petName: string;
  species: string | null;
  sex: string | null;
  approximateAgeLabel: string | null;
  city: string | null;
  coverImageUrl: string | null;
  status: "published";
};
```

### `createPublicAdoptionRequest(input)`

Objetivo:

Crear solicitud inicial ligera desde ficha publica.

Entrada:

```ts
type CreatePublicAdoptionRequestInput = {
  listingSlug: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  requesterCity?: string;
  motivation: string;
  experience?: string;
  housingType?: string;
  hasOtherPets?: boolean;
  hasChildren?: boolean;
  privacyAcknowledged: boolean;
  sourceUrl?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
};
```

Salida:

```ts
type PublicAdoptionRequestCreated = {
  requestId: string;
  status: "submitted";
  message: string;
};
```

Errores:

- `listing_not_available`
- `profile_not_public`
- `validation_failed`

Implementacion Slice 4:

- RPC publica `create_public_adoption_request` para visitantes anonimos o autenticados.
- API client `createPublicAdoptionRequest`.
- RPC privada `list_received_public_adoption_requests` para miembros autorizados de la Familia Protectora.
- RPC privada `update_public_adoption_request_status` para revision, preseleccion o descarte.
- La operacion no crea `pet_adoption_applications`, `pet_transfer_records` ni cambia `pets.household_id`.
- `duplicate_request`
- `rate_limited`
- `privacy_ack_required`

Seguridad:

- Rate limiting.
- Captcha o mecanismo antispam si el volumen lo exige.
- No devolver datos internos de la protectora.

### `listReceivedPublicAdoptionRequests(householdId, filters)`

Objetivo:

Bandeja de solicitudes iniciales para Familia Protectora.

Entrada:

```ts
type ListReceivedPublicAdoptionRequestsInput = {
  householdId: string;
  status?: string;
  petId?: string;
  listingId?: string;
  from?: string;
  to?: string;
};
```

Salida:

```ts
type PublicAdoptionRequestSummary = {
  id: string;
  petName: string;
  listingSlug: string;
  requesterName: string;
  requesterEmailMasked: string;
  requesterCity: string | null;
  status: string;
  createdAt: string;
};
```

Seguridad:

- Solo miembros autorizados de la Familia Protectora.
- Admin puede auditar.

### `updatePublicAdoptionRequestStatus(input)`

Objetivo:

Mover solicitud inicial entre estados.

Entrada:

```ts
type UpdatePublicAdoptionRequestStatusInput = {
  requestId: string;
  nextStatus:
    | "in_review"
    | "preselected"
    | "rejected"
    | "cancelled";
  notes?: string;
};
```

Reglas:

- `rejected` deberia permitir nota interna.
- `preselected` habilita invitacion.
- Crear historial de estado.

### `createAdoptionInvite(input)`

Objetivo:

Generar invitacion para continuar en app owner.

Implementacion Slice 5:

- `createAdoptionInvite({ publicRequestId, publicBaseUrl, expiresInHours? })`
  - RPC `create_adoption_invite`.
  - Solo administradores de la Familia Protectora y contactos `preselected`/`invited_to_app`.
  - Devuelve el token una sola vez dentro de `inviteUrl`; la base conserva solo su hash.
- `resolveAdoptionInvite(token)`
  - RPC publica `resolve_adoption_invite`.
  - Devuelve estado y contexto publico minimo de mascota/protectora.
  - Genera deep link `petecosystem://adoption/invite/[token]` cuando la invitacion esta disponible.
- El envio es manual mediante copiar/compartir enlace. No existe servicio de email/SMS en este slice.
- No crea `pet_adoption_applications`, `pet_transfer_records` ni cambia `pets.household_id`.

Entrada:

```ts
type CreateAdoptionInviteInput = {
  publicRequestId: string;
  recipientEmail: string;
  expiresInHours?: number;
};
```

Salida:

```ts
type AdoptionInviteCreated = {
  inviteId: string;
  inviteUrl: string;
  expiresAt: string;
};
```

Reglas:

- Solo solicitudes `preselected`.
- Token no se guarda en claro.
- Vencimiento obligatorio.

### `resolveAdoptionInvite(token)`

Objetivo:

Resolver pagina puente y contexto app.

Salida:

```ts
type AdoptionInviteContext = {
  status: "valid" | "expired" | "revoked" | "claimed";
  petName?: string;
  listingSlug?: string;
  protectiveDisplayName?: string;
  appDeepLink?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
};
```

### `claimAdoptionInvite(token)`

Objetivo:

Asociar invitacion al usuario owner autenticado en app.

Entrada:

```ts
type ClaimAdoptionInviteInput = {
  token: string;
};
```

Salida:

```ts
type ClaimedAdoptionInvite = {
  publicRequestId: string;
  listingId: string;
  nextStep: "create_household" | "complete_application";
};
```

Reglas:

- Validar token.
- Validar email si se decide restringir a destinatario.
- No crear transferencia.

### `convertPublicRequestToAdoptionApplication(input)`

Objetivo:

Crear solicitud formal autenticada a partir del lead publico reclamado.

Entrada:

```ts
type ConvertPublicRequestToAdoptionApplicationInput = {
  publicRequestId: string;
  ownerHouseholdId: string;
  adopterProfile: {
    housingType: string;
    experience: string;
    hasOtherPets: boolean;
    hasChildren: boolean;
    motivation: string;
    availabilityNotes?: string;
  };
  commitmentAccepted: boolean;
};
```

Salida:

```ts
type ConvertedAdoptionApplication = {
  applicationId: string;
  status: "submitted";
};
```

## Deep links y universal links

### Links publicos

- `https://petecosyst.com/protectoras/[slug]`
- `https://petecosyst.com/adopciones/[petSlug]`
- `https://petecosyst.com/adoption-invite/[token]`

### Deep link interno sugerido

```text
petecosystem://adoption/invite/[token]
```

### Comportamiento esperado

Si app instalada:

- El link de invitacion abre app owner en pantalla contextual.
- La app resuelve token y presenta siguiente paso.

Si app no instalada:

- Se abre pagina puente web.
- Muestra botones App Store y Google Play.
- Explica que la adopcion responsable continua dentro de Pet Ecosystem.

Despues de instalar:

- Ideal: deferred deep link conserva token.
- Fallback MVP: usuario vuelve al link desde email/WhatsApp o ingresa con el mismo correo y recupera solicitudes pendientes.

## Eventos de medicion

Eventos propuestos:

- `protective_landing_viewed`
- `pet_adoption_listing_viewed`
- `public_request_started`
- `public_request_submitted`
- `public_request_preselected`
- `adoption_invite_created`
- `adoption_invite_opened`
- `app_store_clicked`
- `play_store_clicked`
- `adoption_invite_claimed`
- `owner_registered_from_adoption`
- `owner_household_created_from_adoption`
- `formal_application_completed`
- `adoption_transfer_accepted`

## Compatibilidad y no objetivos

No objetivos de este contrato:

- Procesar pagos o donaciones.
- Crear transferencias desde web publica.
- Exponer documentos privados.
- Reemplazar la solicitud formal en app owner.
- Crear marketplace comercial de servicios.

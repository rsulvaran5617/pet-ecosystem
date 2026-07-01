# API_CONTRACT.md

## Nota de implementacion

El baseline actual no expone un backend REST dedicado. El contrato canonicamente se modela como operaciones tipadas sobre Supabase consumidas desde `packages/api-client`.

## Convenciones

- JSON
- UUID
- fechas ISO 8601
- errores consistentes
- contratos alineados a `packages/types`

## Modulos

### Foster / Adoption V2.5

Operaciones tipadas en `packages/api-client/src/foster.ts`.

- `createPetAdoptionListing(petId, householdId)`
- `updatePetAdoptionListing(input)`
- `submitPetAdoptionListing(listingId)`
- `pausePetAdoptionListing(listingId)`
- `closePetAdoptionListing(listingId)`
- `reviewPetAdoptionListing(listingId, input)`
- `listMyPetAdoptionListings(householdId?)`
- `listPublishedPetAdoptionListings()`
- `getPetAdoptionListingDetail(listingId)`
- `listPendingPetAdoptionListingsForAdmin()`
- `uploadPetAdoptionMedia(input)`
- `setPetAdoptionListingCover(mediaId)`
- `reviewPetAdoptionListingMedia(mediaId, input)`
- `removePetAdoptionMedia(mediaId)`

Foster-3B mantiene publicaciones `published` visibles mientras fotos nuevas quedan `pending`. Los listados publicos devuelven solo media aprobada; listados propios/admin conservan estados por foto. Foster-3A/3B no crea solicitudes formales ni transfiere mascotas desde la vitrina. El CTA de interes queda informativo hasta un slice posterior.

### Auth

- `POST /auth/register`
- `POST /auth/verify-otp`
- `POST /auth/login`
- `POST /auth/recover-access`
- `POST /auth/recover-access/complete`
- `POST /auth/logout`

### Me

- `GET /me`
- `PATCH /me`
- `GET /me/preferences`
- `PATCH /me/preferences`
- `GET /me/roles`
- `POST /me/roles/switch`
- `GET /me/addresses`
- `POST /me/addresses`
- `PATCH /me/addresses/{addressId}`
- `GET /me/payment-methods`
- `POST /me/payment-methods`
- `PATCH /me/payment-methods/{paymentMethodId}/default`

### Households

- `GET /households`
- `POST /households`
- `GET /households/{id}`
- `GET /household-invitations`
- `POST /households/{id}/invitations`
- `POST /household-invitations/{id}/accept`
- `POST /household-invitations/{id}/reject`
- `PATCH /households/{id}/members/{memberId}/permissions`

Notas de separacion Foster/Owner:

- siguiente slice propuesto: exponer `householdType` en `HouseholdSummary` y operaciones tipadas de hogares.
- valores esperados: `owner`, `protective`.
- crear un hogar normal debe usar default `owner`.
- `createHousehold` puede enviar `householdType`; si se omite, el RPC usa `owner`.
- crear una familia protectora debe ser una accion explicita y crea otro household tipo `protective`.
- crear o convertir a familia protectora debe ser flujo explicito, no una consecuencia invisible de tener perfil Foster.
- las APIs Foster deben validar que el hogar usado sea `protective` ademas de tener `protective_household_profiles.status = approved`.
- mensajes esperados:
  - `Este hogar no esta configurado como familia protectora.`
  - `Solo una familia protectora aprobada puede publicar mascotas en adopcion.`
  - `Crea o selecciona una familia protectora para continuar.`

Foster-Household-B actualiza tipos compartidos y API client para leer `householdType`; no agrega aun UI de cambio/creacion de hogar protector.

### Pets / Health / Reminders

- `GET /pets`
- `POST /pets`
- `GET /pets/{id}`
- `PATCH /pets/{id}`
- `POST /pets/{id}/memory-status`
- `POST /pets/{id}/avatar`
- `GET /pets/{id}/documents`
- `POST /pets/{id}/documents`
- `GET /pet-documents/{id}/signed-url`
- `GET /pets/{id}/health`
- `GET /pets/{id}/vaccines`
- `POST /pets/{id}/vaccines`
- `PATCH /pets/{id}/vaccines/{vaccineId}`
- `GET /pets/{id}/allergies`
- `POST /pets/{id}/allergies`
- `PATCH /pets/{id}/allergies/{allergyId}`
- `GET /pets/{id}/conditions`
- `POST /pets/{id}/conditions`
- `PATCH /pets/{id}/conditions/{conditionId}`
- `GET /calendar`
- `POST /reminders`
- `POST /reminders/{id}/complete`
- `POST /reminders/{id}/snooze`

### Marketplace

- `GET /marketplace/home`
- `GET /marketplace/providers`
- `GET /marketplace/providers/{id}`
- `GET /marketplace/provider-locations` (V2 Geo-0)
- `GET /marketplace/adoptions` (V2.5 Foster/Adoption, propuesto; separado de servicios)
- `GET /marketplace/adoptions/{listingId}` (V2.5 Foster/Adoption, propuesto)

### Bookings

- `POST /bookings/preview`
- `POST /bookings`
- `GET /bookings`
- `GET /bookings/{id}`
- `RPC get_booking_participant_summaries(booking_ids)`
- `POST /bookings/{id}/approve`
- `POST /bookings/{id}/reject`
- `POST /bookings/{id}/complete`
- `POST /bookings/{id}/cancel`
- `GET /bookings/services/{serviceId}/slots`
- `POST /bookings/from-slot`
- `GET /provider/bookings`
- `GET /bookings/{id}/operations`
- `POST /bookings/{id}/operations/check-in`
- `POST /bookings/{id}/operations/check-out`
- `POST /bookings/{id}/operations/tokens`
- `POST /bookings/{id}/operations/tokens/consume`
- `POST /bookings/{id}/operations/tokens/{tokenId}/revoke` (opcional)
- `GET /bookings/{id}/operations/evidence`
- `POST /bookings/{id}/operations/evidence`
- `GET /bookings/{id}/operations/report-card`
- `PUT /bookings/{id}/operations/report-card`
- `GET /bookings/{id}/operations/internal-notes`
- `POST /bookings/{id}/operations/internal-notes`

Notas:

- los avatares de mascotas y proveedores usan storage controlado con `storage_bucket` y `storage_path`
- mascotas exponen avatar privado mediante URL firmada temporal
- proveedores exponen avatar publico desde `provider-avatars` mediante URL firmada temporal solo para perfiles/organizaciones visibles
- no se agregan nuevas URLs externas arbitrarias para avatares
- ubicacion publica de proveedor usa `provider_public_locations`, PostGIS y precision `exact | approximate | city`
- Geo-0 no pide permisos de ubicacion, no guarda ubicacion actual del owner y no habilita tracking
- `GET /marketplace/providers` puede recibir `nearLatitude`, `nearLongitude` y `maxDistanceKm` como filtros opcionales tipados; Geo-2 calcula `distanceKm` aproximado en cliente/API solo cuando llegan coordenadas de origen ya disponibles, sin pedir permisos ni exponer direcciones privadas del owner
- Geo-3 construye esos filtros desde una zona aproximada controlada; direcciones privadas del owner quedan diferidas porque el contrato actual de `user_addresses` no expone coordenadas. El contrato no devuelve ni publica `user_addresses`
- `memory-status` permite alternar `active` / `in_memory` sin borrar mascotas ni historiales
- reservas nuevas deben rechazar mascotas `in_memory`
- `approve/reject` aplican solo a `pending_approval`
- `complete` aplica al owner proveedor sobre `confirmed`
- el booking puede referenciar un `payment_method` guardado, pero no captura pago real
- `operations` pertenece a V2 provider operations no financiero
- el timeline operacional devuelve check-in, check-out, evidencia, report card, internal notes y estado operacional derivado
- check-in/check-out deben migrar a flujo principal QR: owner genera token temporal y provider lo consume via RPC/server-side; botones manuales quedan fallback piloto
- evidencia, report card e internal notes solo pueden mutarse por el owner proveedor de la organizacion del booking o por flujos server-side equivalentes
- admin puede leer operaciones para soporte o auditoria operativa
- owner puede leer operaciones/evidencia de sus propias reservas cuando la policy read-only de evidencia esta aplicada; la evidencia devuelve metadata y URL firmada temporal para descarga controlada
- internal notes no son visibles para owner
- evidencia usa `storage_bucket` y `storage_path`, no URL arbitraria

Contratos V2 booking capacity propuestos:
- `GET /bookings/services/{serviceId}/slots?from=YYYY-MM-DD&to=YYYY-MM-DD` proyecta slots desde reglas de disponibilidad/capacidad y devuelve solo informacion bookable para owner: `slot_start_at`, `slot_end_at`, `availability_rule_id`, `capacity_total`, `available_count`, `status`.
- `POST /bookings/from-slot` crea una reserva desde un slot elegido. Debe ejecutarse como RPC transaccional y validar household/pet, servicio publico, provider aprobado, regla activa, capacidad disponible, precio snapshot y permisos de payment method opcional.
- Los horarios de reglas/cupos se interpretan como horario local `America/Panama` para el piloto; el contrato sigue devolviendo fechas ISO `timestamptz` y los clientes las formatean con la zona de producto.
- `POST /bookings/preview` y `POST /bookings` quedan como flujo legacy/compatibilidad hasta que la UI owner migre totalmente a slots.
- `get_booking_participant_summaries(booking_ids)` devuelve solo `booking_id`, `household_name`, `customer_display_name` y `pet_name` para reservas visibles por `can_view_booking`; se usa para que provider web muestre participantes sin abrir lectura directa completa de hogares, perfiles o mascotas.
- `validate_slot_capacity` queda como helper interno; no debe exponerse como mutacion confiable para UI.
- `hold_booking_slot` queda diferido salvo que checkout/pagos reales requieran retencion temporal antes de crear booking.

Estados V2 booking capacity:
- slot `available`: cupos disponibles suficientes.
- slot `low_capacity`: ultimo cupo o umbral bajo.
- slot `full`: sin cupo disponible.
- slot `unavailable`: regla inactiva o excepcion cierra la fecha.
- slot `expired`: inicio en el pasado.

Reglas de cupo:
- `pending_approval` consume cupo.
- `confirmed` consume cupo.
- `completed` mantiene cupo consumido historicamente.
- `cancelled`, `rejected`, `expired` y `provider_cancelled` antes del inicio liberan cupo.
- `no_show` consume cupo por defecto porque el recurso fue reservado.

Contratos QR propuestos:
- `POST /bookings/{id}/operations/tokens` crea un token temporal para `check_in` o `check_out`; solo owner elegible del hogar del booking; devuelve token plano una sola vez y metadata segura.
- `POST /bookings/{id}/operations/tokens/consume` consume token temporal; solo provider elegible de la organizacion del booking; valida hash, expiracion, status, operacion y booking `confirmed`; registra `booking_operations`.
- `POST /bookings/{id}/operations/tokens/{tokenId}/revoke` revoca token activo; owner elegible/admin; opcional para QR-1.
- Ningun contrato debe exponer `token_hash` a UI normal.

### Messaging / Reviews / Support

- `GET /chats`
- `GET /chats/{threadId}/messages`
- `POST /chats/{threadId}/messages`
- `GET /bookings/{id}/review`
- `POST /bookings/{id}/review`
- `GET /support-cases`
- `POST /support-cases`
- `GET /support-cases/{id}`

### Foster / Adoption (V2.5 no financiero, propuesto)

- `GET /protective-households/profile`
- `POST /protective-households/profile`
- `PATCH /protective-households/profile`
- `POST /protective-households/profile/submit-review`
- `RPC submit_protective_household_profile(target_household_id)`
- `RPC review_protective_household_profile(target_household_id, decision, notes)`
- `GET /protective-households/transfers`
- `POST /pets/{id}/transfers`
- `GET /pet-transfers/{transferId}`
- `POST /pet-transfers/{transferId}/accept`
- `POST /pet-transfers/{transferId}/reject`
- `POST /pet-transfers/{transferId}/cancel`
- `GET /pets/{id}/custody-history`
- `GET /foster/profile`
- `POST /foster/profile`
- `PATCH /foster/profile`
- `GET /foster/organizations`
- `POST /foster/organizations`
- `PATCH /foster/organizations/{organizationId}`
- `GET /foster/pets`
- `POST /foster/pets`
- `GET /foster/pets/{fosterPetId}`
- `PATCH /foster/pets/{fosterPetId}`
- `POST /foster/pets/{fosterPetId}/listings`
- `PATCH /foster/adoption-listings/{listingId}`
- `POST /foster/adoption-listings/{listingId}/submit-review`
- `GET /foster/adoption-listings/{listingId}/applications`
- `GET /foster/adoption-applications/{applicationId}`
- `POST /foster/adoption-applications/{applicationId}/approve`
- `POST /foster/adoption-applications/{applicationId}/reject`
- `POST /foster/adoption-applications/{applicationId}/request-more-info`
- `POST /foster/adoption-applications/{applicationId}/transfer`
- `GET /me/adoption-applications`
- `POST /marketplace/adoptions/{listingId}/applications`
- `GET /foster/protective-public-profiles/{slug}` (Foster-5A implementado local via RPC `get_public_protective_profile_by_slug`)
- `PATCH /foster/protective-public-profile` (Foster-5A implementado local via RPC `upsert_protective_public_profile`)
- `POST /foster/protective-public-profile/submit-review` (Foster-5A implementado local via RPC `submit_protective_public_profile`)
- `POST /admin/foster/protective-public-profile/review` (Foster-5A implementado local via RPC `review_protective_public_profile`)
- `GET /foster/adoptions/{slug}` (Foster-5B implementado local via RPC `get_public_pet_adoption_listing_by_slug`)
- `POST /foster/adoptions/{slug}/applications` (Foster-5C implementado local via RPC `create_pet_adoption_application`; app usa `listingId`)
- `GET /me/adoption-applications` (Foster-5C implementado local via RPC `list_my_pet_adoption_applications`)
- `GET /foster/adoption-applications/received` (Foster-5C implementado local via RPC `list_received_pet_adoption_applications`)
- `POST /foster/adoption-applications/{applicationId}/withdraw` (Foster-5C implementado local via RPC `withdraw_pet_adoption_application`)
- `GET /admin/foster/adoption-applications` (Foster-5C implementado local via RPC `list_pet_adoption_applications_for_admin`)
- `GET /foster/adoption-applications/incoming` (Foster-5D.2 propuesto; extender `list_received_pet_adoption_applications` con filtros por hogar, mascota, publicacion, estado y fecha)
- `GET /foster/adoption-applications/{applicationId}` (Foster-5D.1 implementado local via RPC `get_pet_adoption_application_detail`)
- `PATCH /foster/adoption-applications/{applicationId}/status` (Foster-5D.1 implementado local via RPC `update_pet_adoption_application_status`)
- `GET /foster/adoption-applications/{applicationId}/history` (Foster-5D.1 implementado local via RPC `list_pet_adoption_application_status_history`)
- `POST /foster/adoption-applications/{applicationId}/start-transfer` (Foster-5E implementado localmente; pendiente de aplicar remoto)

Notas:

- Foster-1A `protective-households/profile`, Foster-5A `protective-public-profile`, Foster-5B `getPublicPetAdoptionListingBySlug`, Foster-5C solicitudes estructuradas, Foster-5D.1 historial/cambio de estado y Foster-5E cierre adoptivo conectado a transferencia cuentan con API client local tipado en `packages/api-client/src/foster.ts`; la UI completa de bandeja Foster-5D.2 sigue pendiente.
- `protective-households` y `pet-transfers` corresponden al primer slice privado de familia protectora y transferencia, antes de marketplace publico.
- Foster-1A solo cubre `protective-households/profile` y revision admin; no crea `pet-transfers` todavia.
- estados Foster-1A: `draft`, `pending_review`, `approved`, `rejected`, `suspended`.
- `submit_protective_household_profile` exige permiso `admin` del hogar, campos minimos completos y registra auditoria.
- `review_protective_household_profile` exige rol admin de plataforma; `notes` es obligatorio para rechazo o suspension.
- una transferencia aceptada debe ejecutarse por RPC transaccional, conservar `pets.id`, cerrar/abrir contexto de custodia y registrar consentimiento.
- antes de aceptar transferencia, el receptor solo debe ver resumen minimo, no expediente completo.
- documentos sensibles, recordatorios futuros y datos del hogar anterior requieren consentimiento o exclusion explicita.
- adopcion no usa checkout, pagos, bookings, provider availability ni QR.
- el marketplace de adopcion debe leer solo publicaciones aprobadas/publicadas.
- la transferencia de custodia debe ejecutarse por RPC transaccional con consentimiento y audit trail.
- Foster-5 debe separar perfil publico protector de perfil interno de aprobacion para evitar exposicion accidental.
- la solicitud de adopcion Foster-5 no mueve custodia; solo ordena interesados hasta iniciar transferencia privada Foster-2A.
- la ficha publica Foster-5 debe leer solo media aprobada, ciudad/pais, historia publica y resumen sanitario no sensible.

Foster-2A API client local:
- `createPetTransferInvitation(input)` -> RPC `create_pet_transfer_invitation`.
- `acceptPetTransfer(transferId, targetHouseholdId)` -> RPC `accept_pet_transfer`.
- `rejectPetTransfer(transferId)` -> RPC `reject_pet_transfer`.
- `cancelPetTransfer(transferId)` -> RPC `cancel_pet_transfer`.
- `listIncomingPetTransfers()` -> RPC `list_incoming_pet_transfer_invitations`.
- `listOutgoingPetTransfers(householdId)` -> RPC `list_outgoing_pet_transfer_records`.
- `listPetCustodyHistory(petId)` -> RPC `list_pet_custody_history`.
- `listAdminPetTransfers()` -> RPC `list_pet_transfer_records_for_admin`.
- Ningun endpoint/RPC Foster-2A crea bookings, pagos, chats ni publicaciones publicas de adopcion.

### Providers

- `GET /provider/organizations`
- `POST /provider/organizations`
- `GET /provider/organizations/{id}`
- `PATCH /provider/organizations/{id}`
- `DELETE /provider/organizations/{id}` solo si no tiene reservas, conversaciones, resenas ni casos de soporte asociados; si tiene historial debe ocultarse/desactivarse
- `PUT /provider/organizations/{id}/public-profile`
- `POST /provider/organizations/{id}/public-profile/avatar`
- `PUT /provider/organizations/{id}/public-location` (V2 Geo-0)
- `POST /provider/organizations/{id}/services`
- `PATCH /provider/services/{id}`
- `DELETE /provider/services/{id}` solo si no tiene reservas asociadas; si tiene historial debe desactivarse u ocultarse
- `POST /provider/organizations/{id}/availability`
- `PATCH /provider/availability/{id}`
- `GET /provider/organizations/{id}/documents`
- `POST /provider/organizations/{id}/documents`
- `GET /provider/organizations/{id}/approval-status`
- `POST /provider/organizations/{id}/availability-rules` (V2 booking capacity, propuesto)
- `PATCH /provider/availability-rules/{ruleId}` (V2 booking capacity, propuesto)
- `POST /provider/availability-rules/{ruleId}/exceptions` (V2 booking capacity, propuesto)
- `PATCH /provider/availability-exceptions/{exceptionId}` (V2 booking capacity, propuesto)

### Admin

- `GET /admin/providers/pending`
- `GET /admin/providers/{id}`
- `POST /admin/providers/{id}/approve`
- `POST /admin/providers/{id}/reject`
- `GET /admin/support-cases`
- `GET /admin/support-cases/{id}`
- `PATCH /admin/support-cases/{id}`
- `GET /admin/fosters/pending` (V2.5 Foster/Adoption, propuesto)
- `POST /admin/fosters/{id}/approve` (V2.5 Foster/Adoption, propuesto)
- `POST /admin/fosters/{id}/reject` (V2.5 Foster/Adoption, propuesto)
- `GET /admin/protective-households/pending` (V2.5 Familias Protectoras, propuesto)
- `POST /admin/protective-households/{householdId}/approve` (V2.5 Familias Protectoras, propuesto)
- `POST /admin/protective-households/{householdId}/reject` (V2.5 Familias Protectoras, propuesto)
- `POST /admin/protective-households/{householdId}/suspend` (V2.5 Familias Protectoras, propuesto)
- `GET /admin/pet-transfers` (V2.5 Familias Protectoras, propuesto)
- `GET /admin/adoption-listings/pending` (V2.5 Foster/Adoption, propuesto)
- `POST /admin/adoption-listings/{listingId}/approve` (V2.5 Foster/Adoption, propuesto)
- `POST /admin/adoption-listings/{listingId}/reject` (V2.5 Foster/Adoption, propuesto)
- `POST /admin/adoption-listings/{listingId}/pause` (V2.5 Foster/Adoption, propuesto)

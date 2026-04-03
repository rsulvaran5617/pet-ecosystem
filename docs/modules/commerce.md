# clinic.md

## Objetivo del módulo
Digitalizar la interacción clínica entre dueño, mascota y clínica.

## Alcance V2
- directorio de clínicas
- perfil clínica
- reserva de cita
- forms de preconsulta
- agenda clínica
- encounter / SOAP
- historial clínico visible
- billing clínica
- recetas
- refill

## Alcance V3
- integración avanzada con farmacia
- flujos de telecare integrados
- analítica clínica avanzada

## Entidades
- clinic_appointments
- clinic_forms
- clinic_form_submissions
- clinic_encounters
- prescriptions
- clinic_invoices

## Reglas
- las citas clínicas deben respetar disponibilidad por sede y profesional
- los registros clínicos deben respetar visibilidad
- las recetas deben tener vigencia
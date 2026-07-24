# messaging.md

## Objetivo del modulo
Habilitar comunicacion basica entre cliente y proveedor, siempre vinculada a una reserva existente.

## Alcance MVP
- inbox de threads
- detalle de chat vinculado a booking
- envio basico de mensajes de texto
- navegacion minima desde booking hacia el chat asociado

## Fuera de alcance en este slice
- adjuntos
- chat libre desacoplado del booking
- reviews
- soporte
- automatizaciones avanzadas
- unread counters o notificaciones persistidas no canonicas

## Dependencias
- bookings
- marketplace solo como origen previo de la reserva
- core auth
- providers solo por el owner de la organizacion involucrada en la reserva

## Entidades
- `chat_threads`
- `chat_messages`

## Reglas
- cada thread nace automaticamente al crearse un booking
- el thread pertenece a un solo booking
- solo pueden ver y escribir en el thread:
  - el usuario que realizo la reserva
  - el owner de la organizacion proveedora del booking
- no se habilitan conversaciones fuera del scope autorizado de la reserva
- el inbox y el detalle deben poder resolverse sin exponer datos privados fuera de ese scope
- al abrir Mensajes desde el menu mobile, el cliente debe reconsultar hilos para reflejar cambios recientes del booking asociado sin requerir Supabase Realtime
- mientras una conversacion esta abierta, mobile usa polling silencioso del detalle del hilo para mostrar mensajes enviados desde otro dispositivo sin obligar al usuario a salir y volver a entrar
- mientras `Mensajes` esta activo en mobile, la app hace polling liviano de hilos y muestra un aviso emergente in-app con vibracion corta cuando detecta un mensaje entrante de la contraparte
- owner mobile presenta la bandeja como una lista tipo correo: hilos ordenados de mas reciente a mas antiguo, cabecera compacta con fecha corta, negocio, mascota, servicio y preview; el detalle se despliega como acordeon dentro de la misma lista
- el filtro visible de la bandeja owner se reduce a un selector compacto por estado de reserva, con Activas como vista inicial
- desde `Owner > Reservas > Abrir chat`, mobile debe abrir solo el hilo de la reserva seleccionada como acordeon inline; la bandeja completa queda para el menu `Mensajes`
- web provider muestra conversaciones activas del negocio seleccionado dentro de `Reservas`, permite abrir el hilo y enviar respuestas de texto usando `POST /chats/{threadId}/messages`
- mientras provider web esta abierto, la bandeja de conversaciones y el hilo seleccionado se refrescan por Realtime con polling liviano como respaldo para reflejar mensajes enviados desde mobile sin obligar al usuario a recargar la pagina
- web provider muestra un aviso emergente in-app cuando detecta un nuevo mensaje entrante del owner en una cita; el CTA `Responder` cambia al negocio correcto, abre `Reservas`, expande la cita y selecciona el hilo para contestar rapido.
- `chat_threads` y `chat_messages` estan publicados en `supabase_realtime` y la migracion `20260527152000_enable_chat_realtime.sql` esta aplicada y registrada en Supabase remoto para que owner mobile/web y provider web reciban cambios casi inmediatos mientras el chat esta abierto
- Realtime es la via primaria para refrescar chats abiertos; el polling queda como respaldo cada 30 segundos ante reconexiones, pestañas en reposo o redes inestables
- push notifications en background/cerrado quedan fuera de este slice y deben abrirse como fase separada

## APIs relacionadas
- `GET /chats`
- `GET /chats/{threadId}/messages`
- `POST /chats/{threadId}/messages`

## Criterio de done del modulo MVP
- existe inbox funcional de threads vinculados a bookings
- se puede abrir el detalle del thread desde booking
- se pueden enviar mensajes de texto basicos
- la visibilidad queda restringida por participantes autorizados
- adjuntos, reviews y soporte siguen fuera de alcance

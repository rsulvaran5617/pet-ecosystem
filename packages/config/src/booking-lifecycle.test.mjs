import assert from 'node:assert/strict';
import console from 'node:console';
import {getBookingDisplayStatus,isUpcomingBooking,getBookingClosureLabel} from './bookings.ts';
const start=Date.parse('2026-09-18T10:00:00-05:00');
const end=Date.parse('2026-09-20T10:00:00-05:00');
const base={status:'pending_approval',scheduledStartAt:new Date(start).toISOString(),scheduledEndAt:new Date(end).toISOString()};
const checks=[];
const equal=(name,actual,expected)=>{assert.deepEqual(actual,expected,name);checks.push(name);};
equal('Unapproved remains actionable before start',getBookingDisplayStatus(base,start-1),'pending_approval');
equal('Unapproved expires exactly at start',getBookingDisplayStatus(base,start),'expired');
equal('Expired unapproved excluded from active counters',isUpcomingBooking(base,start),false);
const confirmed={...base,status:'confirmed'};
equal('Multi-day service stays active after its start',getBookingDisplayStatus(confirmed,start+86400000),'confirmed');
equal('Confirmed stays active until actual end',isUpcomingBooking(confirmed,end-1),true);
equal('Confirmed requires closure exactly at end',getBookingDisplayStatus(confirmed,end),'pending_closure');
equal('Overdue confirmed excluded from upcoming',isUpcomingBooking(confirmed,end),false);
equal('Timezone offsets refer to the same instant',getBookingDisplayStatus({...base,scheduledStartAt:'2026-09-18T15:00:00Z'},start),'expired');
for(const status of ['completed','cancelled','expired']){
 equal(status+' remains terminal despite old date',getBookingDisplayStatus({...base,status},end+1),status);
 equal(status+' excluded from upcoming',isUpcomingBooking({...base,status},start-1),false);
}
equal('No arrival is not automatically no-show',getBookingClosureLabel({checkIn:null,checkOut:null}),'Pendiente de cierre: sin llegada registrada');
equal('Arrival without departure requires attention close',getBookingClosureLabel({checkIn:{},checkOut:null}),'Cierre de atencion pendiente');
equal('Departure requires administrative completion',getBookingClosureLabel({checkIn:{},checkOut:{}}),'Finalizacion pendiente');
equal('Display classification does not mutate persisted status',confirmed.status,'confirmed');
console.log(JSON.stringify({passed:true,checks},null,2));

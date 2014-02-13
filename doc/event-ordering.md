# Event ordering

In an event-driven system, the question of event ordering must be
considered.  A trivial way is to ensure that there is only one single
event producer instance, and each task that consumes events only run
in a single worker instance.  If that is parallelised, two task worker
instances can pick up consequtive events and may complete the later
one before the preceeding one.

If there's a single consumer you could accept some indetermination in
the exact ordering, as long as it can resolve conflicts.  But when
there is more than one consumer, then there's a risk that the events
are processed in different order in the consumers, resulting in
inconsistencies between them.

This document describes an algorithm for imposing an event ordering in
multiple producers as the events are produced.  Each event then
includes the identity of its preceding event, which all consumers can
rely on to determine if they can consume the event or should delay it.

Events are ordered only in respect of the main object they relate to.
For the catalog, this is mainly works, since posts and source objects
are subobjects to the work they are related to.


## Event parameters

There are only two event parameters used by this algorithm:

* `id`: A numerical ID for this event
* `prev`: The preceeding event's ID, guaranteed to be smaller.


## Data structures:

The producers share state in a Redis database in this algorithm, but
any similar storage supporting atomic operations should work too.

Each object for which events need to be serialised on hold three keys.
Here, `OBJ` is the main key of the object, e.g. `work:1`.

* `OBJ:events`: List of queued events for this object.  The order of events
  determines their serialisation.
* `OBJ:last.event.id`: The ID assigned to the last event sent out from
  the frontend for this object.
* `OBJ:event.worker`: The name of the event worker that currently has
  taken on the responsibility to send out events for this object.
  Unset if there is no current worker.
  

The workers pick up work from a global list:

* `objects.with.events`: names of the objects with (potentially)
  pending events.


Each event worker keeps track of its own state too, so they can be
restarted if they crash and resume the work.  Here `W` is the ID of
event worker:

* `event.worker:W:object`: a list which is either empty, or contains
  the name of the object whose events this worker intends to process
* `event.worker:W:event`: a list which is either empty, or contains
  the event that the worker is currently processing
* `event.worker:W:event.id`: the ID assigned to the event currently
  being processed

The reason these two are lists are to be able to use the single
block-pop-and-push operation in Redis to ensure that the event is
always stored somewhere until it has been sent.


## Event queuing

The frontend pushes one main event and any number of subevents to the
queue for that object, and queues the object on the queue for the
workers.  It also does any changes to the object state.  This is all
done atomically:

    MULTI
      SET OBJ:data "{ ... }"
      LPUSH OBJ:events "{ main ... }", "{ sub ... }", ...
      LPUSH objects.with.events OBJ
    EXEC

    
## Event workers

### Main loop

The main loop of an event worker waits for an object to need
processing.  When it gets one off the queue, it attempts to take
ownership of the responsibility for this object's events.  If no other
worker is currently processing this, it gets the key and can proceed.
Otherwise it's work is done.

    def main_loop():
        OBJ = BRPOPLPUSH objects.with.events event.worker:W:object 0
        
        is_owner = SETNX OBJ:event.worker W
    
        if is_owner:
            process_object(OBJ)
    
        RPOP event.worker:W:object
    

### Processing an object

Once a worker has taken on the responsibility, it will process all
events that are queued up.  This means that if additional events are
pushed, triggering another worker's `main_loop` to pick up the object
from the queue, it will not have to synchronise here and can safely go
on serving other objects.

The key to make this work is that popping the events from the object
queue must drop the responsibility of processing events if there are
no more events for this object, and this must be an atomic operation
to interact correctly with the `main_loop` of the other workers.  This
can be done by running these actions in a Lua script:

    def process_object(OBJ):
        while True:
            event = SCRIPT: 
                event = RPOPLPUSH OBJ:events event.worker:W:event
                if event:
                    id = INCR next.event.id
                    SET event.worker:W:event.id id
                else:
                    DEL OBJ:event.worker
                return event
    
            if event:
                process_event(OBJ, event)
            else:
                return


### Processing an event

Event processing is just adding in the ID of the event and of the
previous event for this object to establish the strict serialisation,
and sending off the event to the backend.

If that succeeded, an atomic operation releases the event from the
worker and records it as sent.  If the worker crashes after
`send_event()` but before updating the state, the event will be resent
when the worker is restarted.  The backend must be idempotent to be
able to handle resent events.

    def process_event(OBJ, event):
        event.id = GET event.worker:W:event.id
        event.prev = GET OBJ:last.event.id
        send_event(event)
        MULTI
          RPOP event.worker:W:event
          DEL event.worker:W:event.id
          SET OBJ:last.event.id event.id
        EXEC

     
### Restarting after crash

If a worker crashes, it can recover it's current state from Redis.  If
it has popped off an object from the queue, and also is the owner, it
will process any unfinished event.  It will then fulfil the
responsibility of processing all queued events for that object, before
going into the regular main loop.


    def restart():
        if LLEN event.worker:W:object > 0:
            OBJ = LINDEX event.worker:W:object 0
    
            is_owner = SETNX OBJ:event.worker 2
            current = GET OBJ:event.worker
    
            if is_owner or current == 2:
                if LLEN event.worker:W:event > 0:
                    event = LINDEX event.worker:W:event 0
                    process_event(OBJ, event)
        
                process_object(OBJ)
         
            RPOP event.worker:W:object

                    
## Invariants

The invariants are meant to guarantee that each event will be
processed exactly once, and that the events for a given object will be
processed in the order they were serialised.


The central one is that the object must either be queued or have
workers who are attempting to process it enough times to cover all
queued events:

    len(OBJ:events for main events) <= (
         count(OBJ in objects.with.events) + 
         count(OBJ in event.worker:W:object for all W))
    

If a worker has the responsibility of processing an object, it must
first have gotten the object from the queue:

    if (OBJ:event.worker == W) then (event.worker:W:object == OBJ)


If a worker does not hold the responsibility, it can't process any events:

    if (event.worker:W:object == OBJ) and (OBJ:event.worker != W) then 
        len(event.worker:W:event) == 0

        
An event currently being processed cannot also be queued:

    if OBJ:event.worker == W then
        (event.worker:W:events[0] not in OBJ:events)


It would be nice to also say that a if a worker holds the
responsibility, there are either events queued or it is processing an
event.  That requires a much messier event processing loop, and only
improves the case where a worker dies after processing the last
event but before releasing the responsibility: with the logic above
that object will be unnecessarily blocked by the crashed worker.

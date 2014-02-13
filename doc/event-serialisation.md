
Invariants:
        
    len(OBJ:events for main events) <= (
         count(OBJ in objects.with.events) + 
         count(OBJ in event.worker:W:object for all W))
    
    if (OBJ:event.worker == W) then (event.worker:W:object == OBJ)
    
    if OBJ:event.worker == W then
        (event.worker:W:events[0] not in OBJ:events)
    
    len(event.worker:W:object for all W) <= 1
    len(event.worker:W:events for all W) <= 1


Add event and update frontend cached state:

    MULTI
      SET work:4:data "{ ... }"
      LPUSH work:4:events "{ main ... }", "{ sub ... }", ...
      LPUSH objects.with.events "work:4"
    EXEC

    
Event worker main loop:

    def main_loop():
        OBJ = BRPOPLPUSH objects.with.events event.worker:2:object 0
        
        is_owner = SETNX OBJ:event.worker 2
    
        if is_owner:
            process_object(OBJ)
    
        RPOP event.worker:2:object
    

    def process_object(OBJ):
        while True:
            event = SCRIPT: 
                event = RPOPLPUSH OBJ:events event.worker:2:event
                if event:
                    id = INCR next.event.id
                    SET event.worker:2:event.id id
                else:
                    DEL OBJ:event.worker
                return event
    
            if event:
                process_event(OBJ, event)
            else:
                return


    def process_event(OBJ, event):
        event.id = GET event.worker:2:event.id
        event.prev = GET OBJ:last.event
        send_event(event)
        MULTI
          RPOP event.worker:2:event
          DEL event.worker:2:event.id
          SET OBJ:last.event event.id
        EXEC

     
Event worker restart code before going into main loop:

    def restart():
        if LLEN event.worker:2:object > 0:
            OBJ = LINDEX event.worker:2:object 0
    
            is_owner = SETNX OBJ:event.worker 2
            current = GET OBJ:event.worker
    
            if is_owner or current == 2:
                if LLEN event.worker:2:event > 0:
                    event = LINDEX event.worker:2:event 0
                    process_event(OBJ, event)
        
                process_object(OBJ)
         
            RPOP event.worker:2:object
                    

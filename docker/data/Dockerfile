# BUILD-USING:        docker build -t data .
# RUN-USING:          docker run -name DATA data
FROM          busybox
VOLUME        ["/data"]
CMD           ["/bin/sh", "-c", "while true; do sleep 300; done"]

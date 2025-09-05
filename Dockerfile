############################################################
# Dockerfile to build Meeting Room Scheduler
############################################################
#docker build -t meeting-room-scheduler .
#docker run --init -i -p 10032:10032 -t meeting-room-scheduler
###########################################################################

FROM node:23.8.0

# File Author / Maintainer
MAINTAINER "Taylor Hanson <tahanson@cisco.com>"

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

CMD [ "npm", "start" ]

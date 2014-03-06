
Deploying on Openshift
======================

Create a node.js app:

    TODO...

Add the necessary cartridges (install Erlang first, see below):

    rhc cartridge add https://raw.github.com/commonsmachinery/openshift-redland-cart/master/metadata/manifest.yml -a catalog
    rhc cartridge add https://raw.github.com/commonsmachinery/openshift-rabbitmq-cart/master/metadata/manifest.yml -a catalog


Add the application as a remote to your git repository:

    rhc app show catalog
    git remote add app <Git URL from app show output>
    git fetch app
    

Specifics for VM deployment
---------------------------

Some things must be tweaked in the root shell of the VM (found on the
VM console after selecting alternative 5).

Before installing the RabbitMQ cartridge: 

    yum install erlang

After creating the app, but before pushing to it (fix a bug in the VM
which makes it impossible to push the app, replace APP_ID by the uuid
of your app):

    rm /var/lib/openshift/<APP_ID>/app-root/runtime/dependencies//nodejs/node_modules/*


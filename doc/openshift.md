
Deploying on Openshift
======================

This assumes you've already created a user and a domain account on
Openshift.

Create a node.js app (replace `cm` with your domain):

    rhc app create -n cm -a catalog -t nodejs

The DNS name might not be found, but as long as it says that the
application was created it's fine.  Verify it's settings:

    rhc app show catalog

Add the necessary cartridges (install Erlang first, see below):

    rhc cartridge add postgresql -a catalog
    rhc cartridge add https://raw.github.com/commonsmachinery/openshift-redland-cart/master/metadata/manifest.yml -a catalog
    rhc cartridge add https://raw.github.com/commonsmachinery/openshift-rabbitmq-cart/master/metadata/manifest.yml -a catalog


Add the application as a remote to your git repository:

    rhc app show catalog
    git remote add app <Git URL from app show output>
    git fetch app

Overwrite the template app with the catalog.  Ensure that the right
branch is checked out in the local repository!

    git push -f app HEAD:master

To push updates to the app thereafter, it is sufficient to update the
local repository and push without -f:

    git push app HEAD:master

It is of course also possible to checkout `app/master` in a tracking
branch in the local repository, merge from `origin/master` and then
push normally.


Specifics for VM deployment
---------------------------

Some things must be tweaked in the root shell of the VM (found on the
VM console after selecting alternative 5).

Before installing the RabbitMQ cartridge: 

    yum install erlang

After creating the app, but before pushing to it (fix a bug in the VM
which makes it impossible to push the app, replace APP_ID by the uuid
of your app):

    rm -f /var/lib/openshift/<APP_ID>/app-root/runtime/dependencies/nodejs/node_modules/*
    rm -f /var/lib/openshift/<APP_ID>/app-root/runtime/dependencies/nodejs/node_modules/.bin/*
    rm -f /var/lib/openshift/<APP_ID>/app-deployments/*/dependencies/nodejs/node_modules/*
    rm -f /var/lib/openshift/<APP_ID>/app-deployments/*/dependencies/nodejs/node_modules/.bin/*

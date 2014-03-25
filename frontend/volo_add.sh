#!/bin/sh

set -e

VOLO=node_modules/volo/bin/volo

node $VOLO add

# Hard dependencies can't be set in package.json
node $VOLO add -amd github:amdjs/underscore/1.5.2 exports=_
node $VOLO add -amd github:jashkenas/backbone/1.1.2 depends=jquery,underscore exports=Backbone
node $VOLO add -amd https://raw.github.com/theironcook/Backbone.ModelBinder/master/Backbone.ModelBinder.js depends=backbone

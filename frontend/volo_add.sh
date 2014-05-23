#!/bin/sh

set -e

VOLO=node_modules/volo/bin/volo

set -x

node $VOLO add -amdlog

# Hard dependencies can't be set in package.json
node $VOLO add -amdlog -amd github:amdjs/underscore/1.5.2 exports=_
node $VOLO add -amdlog -amd github:jashkenas/backbone/1.1.2 depends=jquery,underscore exports=Backbone
node $VOLO add -amdlog -amd https://raw.github.com/theironcook/Backbone.ModelBinder/master/Backbone.ModelBinder.js depends=backbone

# Need patched version of rdflib.js for now
node $VOLO add -amdlog -amd -amdoff https://github.com/commonsmachinery/rdflib.js/releases/download/fixed-amd-define/rdflib.js

# Grab libcredit straight from the source
node $VOLO add -amdlog -amd -amdoff https://raw.githubusercontent.com/commonsmachinery/libcredit/master/javascript/libcredit.js


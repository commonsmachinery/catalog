//- Catalog web - model for a work
//-
//- Copyright 2014 Commons Machinery http://commonsmachinery.se/
//- Distributed under an AGPL_v3 license, please see LICENSE in the top dir.

define(['lib/backbone', 'util'], function(Backbone, util) {
    'use strict'; 

    var Work = Backbone.Model.extend({
        urlRoot: '/works',

        defaults: {
            public: true
        },

        initialize: function(){
            // replace getter and setter with a function to access nested objects and trigger an appropiate event
            this.get = util.getNested(this);
            this.set = util.setNested(this);
        },

        validate: function(){
            var attrs = this.attributes;
            var invalid = [];
            var val;
            var err;

            val = attrs.alias;
            err = util.isInvalid('alphanum', val);
            if (val && err){
                invalid.push('Invalid alias: ' + err);
            }

            if (invalid.length){
                return invalid;
            }
        }

    });

    return Work;
});

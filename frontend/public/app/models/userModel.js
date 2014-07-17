//- Catalog web - model for a user
//-
//- Copyright 2014 Commons Machinery http://commonsmachinery.se/
//- Distributed under an AGPL_v3 license, please see LICENSE in the top dir.

define(['lib/backbone', 'util'], function(Backbone, util) {
    'use strict'; 

    var User = Backbone.Model.extend({
        urlRoot: '/users',

        initialize: function(){
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

            val = attrs.profile.email;
            err = util.isInvalid('email', val);
            if (val && err){
                invalid.push('Invalid email: ' + err );
            }

            val = attrs.profile.website;
            err = util.isInvalid('url', val);
            if (val && err){
                invalid.push('Invalid website: ' + err);
            }

            val = attrs.profile.gravatar_email;
            err = util.isInvalid('email', val);
            if (val && err){
                invalid.push('Invalid gravatar email: ' + err);
            }

            if (invalid.length){
                return invalid;
            }
        }

    });
    return User;
});

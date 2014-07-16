//- Catalog web - model for a user
//-
//- Copyright 2014 Commons Machinery http://commonsmachinery.se/
//- Distributed under an AGPL_v3 license, please see LICENSE in the top dir.

define(['lib/backbone', 'util'], function(Backbone, util) {
    'use strict'; 

    var Profile = Backbone.Model.extend({

        validate: function(){ 
            var attrs = this.attributes;
            var invalid = [];
            var val;
            var err;

            val = attrs.email;
            err = util.isInvalid('email', val);
            if (val && err){
                invalid.push('Invalid email: ' + err );
            }

            val = attrs.website;
            err = util.isInvalid('url', val);
            if (val && err){
                invalid.push('Invalid website: ' + err);
            }

            val = attrs.gravatar_email;
            err = util.isInvalid('email', val);
            if (val && err){
                invalid.push('Invalid gravatar email: ' + err);
            }

            if (invalid.length){
                return invalid;
            }
        },

        save: function(attrs, callback){
            this.parent.save(attrs, callback);
        }

    });

    var User = Backbone.Model.extend({
        urlRoot: '/users',

        initialize: function() {
            this.profile = this.attributes.profile = new Profile(this.attributes.profile);
            this.profile.parent = this;

            //share errors 
            this.profile.stopListening(this.profile, 'invalid');
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

            err = this.profile.validate();
            if(err){
                invalid = invalid.concat(this.profile.validate());
            }

            if(invalid.length){
                this.profile.trigger('invalid', invalid);
                return invalid;
            }
        }

    });
    return User;
});
